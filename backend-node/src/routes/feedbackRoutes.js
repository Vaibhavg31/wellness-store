import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { FeedbackRepository } from '../repositories/feedbackRepository.js';

const router = Router();
const repo = new FeedbackRepository();

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

router.post('/feedback', asyncRoute(async (req, res) => {
    const body = req.body || {};
    if (!body.name || !body.email || !body.message) return sendError(res, 'name, email and message are required', 400);

    const email = String(body.email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'Enter a valid email address', 400);

    const item = {
        id: generateId('fb'),
        name: escapeHtml(body.name),
        email: escapeHtml(email),
        message: escapeHtml(body.message),
        isRead: false,
        createdAt: new Date().toISOString(),
    };

    sendJson(res, await repo.create(item), 201);
}, 'Failed to submit feedback'));

router.get('/feedback', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.getAll());
}, 'Failed to fetch feedback'));

router.put('/feedback/:id/read', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const updated = await repo.markRead(req.params.id);
    if (!updated) return sendError(res, 'Feedback not found', 404);
    sendJson(res, updated);
}, 'Failed to update feedback'));

router.delete('/feedback/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Feedback not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete feedback'));

export default router;
