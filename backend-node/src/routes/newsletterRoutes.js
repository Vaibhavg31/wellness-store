import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { isValidEmail, assertText } from '../lib/validate.js';
import { checkRateLimit } from '../lib/rateLimiter.js';
import { NewsletterRepository } from '../repositories/newsletterRepository.js';

const router = Router();
const repo = new NewsletterRepository();

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Public sign-up: a visitor (IP) may subscribe a few addresses an hour, so a bot cannot fill the list with junk.
const SIGNUPS_PER_IP_PER_HOUR = 20;

router.post('/newsletter/subscribe', asyncRoute(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!isValidEmail(email)) return sendError(res, 'Please enter a valid email address', 400);
    assertText(req.body?.source, 'Source', 60);
    if (!(await checkRateLimit(`newsletter-${req.ip || req.socket.remoteAddress || '0.0.0.0'}`, SIGNUPS_PER_IP_PER_HOUR, 3600))) {
        return sendError(res, 'Too many sign-ups from here. Please try again in a little while.', 429);
    }

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
