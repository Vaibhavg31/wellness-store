import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { NewsletterRepository } from '../repositories/newsletterRepository.js';

const router = Router();
const repo = new NewsletterRepository();

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

router.post('/newsletter/subscribe', asyncRoute(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'A valid email address is required', 400);

    if (await repo.findByEmail(email)) {
        return sendJson(res, { success: true, message: 'Already subscribed' });
    }

    const subscriber = {
        id: generateId('sub'),
        email,
        source: escapeHtml(req.body?.source || 'website'),
        createdAt: new Date().toISOString(),
    };

    sendJson(res, await repo.create(subscriber), 201);
}, 'Failed to subscribe'));

router.get('/newsletter', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const all = await repo.getAll();
    all.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    sendJson(res, all);
}, 'Failed to fetch subscribers'));

router.delete('/newsletter/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Subscriber not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete subscriber'));

export default router;
