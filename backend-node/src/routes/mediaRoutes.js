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

    // A picture that is still on the store is not deleted silently: the admin is told where it is used and has to
    // confirm (?force=1). Otherwise those pages would show an empty frame.
    const force = req.query.force === '1' || req.query.force === 'true';
    if (!force) {
        const usedIn = await repo.findUsage(item.url);
        if (usedIn.length) {
            return sendJson(res, { error: 'This file is still used on the store', code: 'MEDIA_IN_USE', usedIn }, 409);
        }
    }

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
