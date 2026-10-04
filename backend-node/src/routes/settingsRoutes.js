import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson } from '../lib/response.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';

const router = Router();
const repo = new SettingsRepository();

router.get('/settings', asyncRoute(async (req, res) => {
    // Deliberately not browser-cached — see backend/lib/Routes/SettingsRoutes.php for why.
    sendJson(res, await repo.get());
}, 'Failed to fetch settings'));

router.put('/settings', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const updated = await repo.set(req.body || {});
    sendJson(res, updated);
}, 'Failed to update settings'));

export default router;
