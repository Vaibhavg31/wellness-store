import { Router } from 'express';
import { asyncRoute, sendJson } from '../lib/response.js';
import { getBearerToken, requireAdmin, verifyToken } from '../lib/auth.js';
import { buildOverview, clearAnalytics, recordEvents } from '../lib/analytics.js';

const router = Router();

// Crawlers, link-preview fetchers and scripted browsers must not count as shoppers.
const NOT_A_PERSON = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|node-fetch|axios|okhttp|monitor|uptime|pingdom/i;

// Per-address allowance kept in memory (no database query per page view): plenty for a real visitor, useless for a flood.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 90;
const hits = new Map();
setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, entry] of hits) if (entry.start < cutoff) hits.delete(key);
}, WINDOW_MS).unref();

function withinAllowance(key) {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > WINDOW_MS) {
        hits.set(key, { start: now, count: 1 });
        return true;
    }
    entry.count += 1;
    return entry.count <= MAX_REQUESTS_PER_WINDOW;
}

function tokenPayload(req) {
    const token = getBearerToken(req);
    if (!token) return null;
    try {
        return verifyToken(token);
    } catch {
        return null;
    }
}

/**
 * Public, write-only endpoint the storefront reports to. It always answers 204 — tracking must never break or slow the shop —
 * and silently ignores bots, signed-in admins (the team browsing their own store) and anything malformed.
 */
router.post('/track', async (req, res) => {
    res.status(204).end();
    try {
        const agent = String(req.headers['user-agent'] || '');
        if (!agent || (NOT_A_PERSON.test(agent) && process.env.ANALYTICS_ALLOW_BOTS !== 'true')) return;
        if (!withinAllowance(req.ip || 'unknown')) return;

        const payload = tokenPayload(req);
        if (payload?.role === 'admin') return;

        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].split(':')[0];
        await recordEvents({
            visitorId: body.visitorId,
            sessionId: body.sessionId,
            userId: payload?.role === 'customer' ? payload.userId || null : null,
            ctx: body.ctx && typeof body.ctx === 'object' ? body.ctx : {},
            events: body.events,
            siteHost: host,
        });
    } catch (err) {
        console.error('[analytics] could not record events:', err.message);
    }
});

router.get('/analytics/admin/overview', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await buildOverview(String(req.query.range || '7d')));
}, 'Failed to load analytics'));

// Wipes the collected visits — meant for clearing test traffic before the store goes live.
router.delete('/analytics/admin/data', asyncRoute(async (req, res) => {
    requireAdmin(req);
    await clearAnalytics({ testOnly: req.query.testOnly === '1' });
    sendJson(res, { cleared: true });
}, 'Failed to clear analytics'));

export default router;
