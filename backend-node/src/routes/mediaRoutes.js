import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { uploadsDirPath } from '../lib/db.js';
import { MediaRepository } from '../repositories/mediaRepository.js';

const router = Router();
const repo = new MediaRepository();

router.get('/media', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.list());
}, 'Failed to fetch media library'));

router.delete('/media/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const mediaId = Number.parseInt(req.params.id, 10);
    const item = await repo.findById(mediaId);
    if (!item) return sendError(res, 'Media not found', 404);

    await repo.delete(mediaId);

    if (item.url.startsWith('/uploads/')) {
        const filePath = path.join(uploadsDirPath(), path.basename(item.url));
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {
            // best-effort, never fails the request
        }
    }

    sendJson(res, { success: true });
}, 'Failed to delete media'));

export default router;
