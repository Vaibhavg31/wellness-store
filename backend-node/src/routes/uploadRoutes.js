import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { requireAdmin, requireCustomer } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { uploadsDirPath } from '../lib/db.js';
import sharp from 'sharp';
import { processImage } from '../lib/imageProcessor.js';
import { MediaRepository } from '../repositories/mediaRepository.js';

const router = Router();
const mediaRepo = new MediaRepository();

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_VIDEO_EXT = new Set(['mp4', 'webm', 'mov']);
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;
const MAX_REVIEW_IMAGES = 4;
const MAX_REVIEW_IMAGE_SIZE = 3 * 1024 * 1024;

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE, files: 10 } });
const reviewImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_REVIEW_IMAGE_SIZE, files: MAX_REVIEW_IMAGES } });
const videoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_VIDEO_SIZE, files: 1 } });

function extOf(filename) {
    return path.extname(filename).replace('.', '').toLowerCase();
}

function randomSuffix() {
    return crypto.randomBytes(4).toString('hex').slice(0, 6);
}

/** Saves one in-memory multer file to disk, processes it, records it in the media library, returns its public URL. */
async function saveImageFile(file) {
    if (file.size > MAX_SIZE) throw Object.assign(new Error('File too large (max 5MB)'), { statusCode: 400 });

    const ext = extOf(file.originalname);
    if (!ALLOWED_EXT.has(ext)) throw Object.assign(new Error('Only JPG, PNG, and WebP images are allowed'), { statusCode: 400 });

    // The name says "png", but is it one? Read the bytes before anything is written: a text, HTML or PHP file renamed to
    // .png used to be saved under /uploads and then crash the image step (a 500 that also left the file behind).
    let detected = '';
    try { detected = (await sharp(file.buffer).metadata()).format || ''; } catch { /* not an image */ }
    if (!['jpeg', 'png', 'webp'].includes(detected)) throw Object.assign(new Error('That file is not a valid JPG, PNG or WebP image'), { statusCode: 400 });

    let filename = `product-${Date.now()}-${randomSuffix()}.${ext}`;
    let dest = path.join(uploadsDirPath(), filename);
    await fs.writeFile(dest, file.buffer);

    // processImage may convert (e.g. a large PNG/JPG becomes WebP) and has already moved the file to the new
    // extension, so the public name must follow it — otherwise the saved URL points at a file that doesn't exist.
    const finalExt = await processImage(dest, ext);
    if (finalExt !== ext) {
        filename = filename.replace(/\.[^.]+$/, `.${finalExt}`);
        dest = path.join(uploadsDirPath(), filename);
    }

    const url = `/uploads/${filename}`;

    try {
        const stat = await fs.stat(dest);
        await mediaRepo.record(url, filename, file.mimetype || null, stat.size || null);
    } catch {
        // best-effort catalog entry, never fails the upload
    }

    return url;
}

router.post('/upload', imageUpload.single('image'), asyncRoute(async (req, res) => {
    requireAdmin(req);
    if (!req.file) return sendError(res, 'No image uploaded', 400);
    const url = await saveImageFile(req.file);
    sendJson(res, { url });
}, 'Failed to upload image'));

router.post('/upload/multiple', imageUpload.array('images', 10), asyncRoute(async (req, res) => {
    requireAdmin(req);
    const files = req.files || [];
    if (files.length === 0) return sendError(res, 'No images uploaded', 400);
    if (files.length > 10) return sendError(res, 'Maximum 10 images allowed', 400);

    const urls = [];
    for (const file of files) urls.push(await saveImageFile(file));
    sendJson(res, { urls });
}, 'Failed to upload images'));

router.post('/upload/review-images', reviewImageUpload.array('images', MAX_REVIEW_IMAGES), asyncRoute(async (req, res) => {
    await requireCustomer(req);
    const files = req.files || [];
    if (files.length === 0) return sendError(res, 'No images uploaded', 400);
    if (files.length > MAX_REVIEW_IMAGES) return sendError(res, `Maximum ${MAX_REVIEW_IMAGES} photos per review`, 400);

    const urls = [];
    for (const file of files) {
        if (file.size > MAX_REVIEW_IMAGE_SIZE) return sendError(res, `Each photo must be under ${Math.floor(MAX_REVIEW_IMAGE_SIZE / (1024 * 1024))}MB`, 400);
        urls.push(await saveImageFile(file));
    }
    sendJson(res, { urls });
}, 'Failed to upload review images'));

router.post('/upload/video', videoUpload.single('video'), asyncRoute(async (req, res) => {
    requireAdmin(req);
    const file = req.file;
    if (!file) return sendError(res, 'No video uploaded', 400);
    if (file.size > MAX_VIDEO_SIZE) return sendError(res, `Video too large (max ${Math.floor(MAX_VIDEO_SIZE / (1024 * 1024))}MB). Trim or compress it and try again.`, 400);

    const ext = extOf(file.originalname);
    if (!ALLOWED_VIDEO_EXT.has(ext)) return sendError(res, 'Only MP4, WebM, and MOV videos are allowed', 400);
    // Check the file's own signature too: MP4/MOV carry "ftyp" at byte 4, WebM starts with the EBML header 1A 45 DF A3.
    const head = file.buffer.subarray(0, 12);
    const looksLikeVideo = head.length >= 12 && (head.subarray(4, 8).toString('latin1') === 'ftyp' || (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3));
    if (!looksLikeVideo) return sendError(res, 'That file is not a valid MP4, WebM or MOV video', 400);

    const filename = `video-${Date.now()}-${randomSuffix()}.${ext}`;
    const dest = path.join(uploadsDirPath(), filename);
    await fs.writeFile(dest, file.buffer);

    const url = `/uploads/${filename}`;
    try {
        const stat = await fs.stat(dest);
        await mediaRepo.record(url, filename, file.mimetype || 'video/mp4', stat.size || null);
    } catch {
        // best-effort
    }

    sendJson(res, { url });
}, 'Failed to upload video'));

export default router;
