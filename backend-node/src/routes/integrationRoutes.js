import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { getPool } from '../lib/db.js';
import { API_PAYMENTS, API_SCOPES, createPartner, deletePartner, getPartner, listPartners, rotatePartnerKey, updatePartner } from '../lib/apiKeys.js';
import {
    API_VERSION, MAX_ATTEMPTS, WEBHOOK_EVENTS, deliveryFromRow, endpointFromRow, invalidateEndpointCache, newWebhookSecret,
    retryDelivery, sendTestEvent, webhookUrlProblem,
} from '../lib/webhooks.js';

/** Admin → API & webhooks: partner API keys, webhook addresses and the log of what was sent. */
const router = Router();
const utc = () => new Date().toISOString().slice(0, 23).replace('T', ' ');
const EVENT_IDS = WEBHOOK_EVENTS.map((e) => e.id);

router.get('/admin/integrations', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const [endpointRows] = await getPool().query('SELECT * FROM webhook_endpoints ORDER BY created_at DESC');
    const [counts] = await getPool().query(
        "SELECT endpoint_id, SUM(status = 'pending') AS pending, SUM(status = 'failed') AS failed FROM webhook_deliveries GROUP BY endpoint_id",
    );
    const byEndpoint = Object.fromEntries(counts.map((c) => [c.endpoint_id, { pending: Number(c.pending || 0), failed: Number(c.failed || 0) }]));
    sendJson(res, {
        apiVersion: API_VERSION,
        partners: await listPartners(),
        webhooks: endpointRows.map((r) => ({ ...endpointFromRow(r), ...(byEndpoint[r.id] ?? { pending: 0, failed: 0 }) })),
        scopes: API_SCOPES, payments: API_PAYMENTS, events: WEBHOOK_EVENTS, maxAttempts: MAX_ATTEMPTS,
    });
}, 'Failed to load API settings'));

// ── Partners (API keys) ───────────────────────────────────────────────────────────────────────────────────────────────

router.post('/admin/integrations/partners', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await createPartner(req.body), 201);
}, 'Failed to create the partner'));

router.put('/admin/integrations/partners/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    if (!(await getPartner(req.params.id))) return sendError(res, 'Partner not found', 404);
    sendJson(res, await updatePartner(req.params.id, req.body));
}, 'Failed to update the partner'));

router.post('/admin/integrations/partners/:id/rotate-key', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const result = await rotatePartnerKey(req.params.id);
    if (!result) return sendError(res, 'Partner not found', 404);
    sendJson(res, result);
}, 'Failed to make a new key'));

router.delete('/admin/integrations/partners/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    if (!(await deletePartner(req.params.id))) return sendError(res, 'Partner not found', 404);
    invalidateEndpointCache();
    sendJson(res, { ok: true });
}, 'Failed to remove the partner'));

// ── Webhook endpoints ─────────────────────────────────────────────────────────────────────────────────────────────────

async function readEndpointInput(body, { partial = false } = {}) {
    const b = body && typeof body === 'object' ? body : {};
    const out = {};
    if (!partial || 'url' in b) {
        const url = typeof b.url === 'string' ? b.url.trim() : '';
        const problem = webhookUrlProblem(url);
        if (problem) throw new HttpError(problem, 400);
        out.url = url;
    }
    if (!partial || 'description' in b) {
        const d = typeof b.description === 'string' ? b.description.trim() : '';
        if (d.length > 160) throw new HttpError('The description must be 160 characters or fewer', 400);
        out.description = d;
    }
    if (!partial || 'events' in b) {
        const events = Array.isArray(b.events) && b.events.length > 0 ? b.events : ['*'];
        if (events.some((e) => e !== '*' && !EVENT_IDS.includes(e))) throw new HttpError(`Unknown event. Use * or: ${EVENT_IDS.join(', ')}`, 400);
        out.events = events.includes('*') ? '*' : [...new Set(events)].join(',');
    }
    if (!partial || 'partnerId' in b) {
        const pid = b.partnerId ? String(b.partnerId) : null;
        if (pid && !(await getPartner(pid))) throw new HttpError('That partner does not exist', 400);
        out.partner_id = pid;
    }
    if ('isActive' in b) {
        if (typeof b.isActive !== 'boolean') throw new HttpError('isActive must be true or false', 400);
        out.is_active = b.isActive ? 1 : 0;
        if (b.isActive) out.consecutive_failures = 0;
    }
    return out;
}

async function getEndpointRow(id) {
    const [rows] = await getPool().query('SELECT * FROM webhook_endpoints WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
}

router.post('/admin/integrations/webhooks', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const cols = await readEndpointInput(req.body);
    const [[{ n }]] = await getPool().query('SELECT COUNT(*) AS n FROM webhook_endpoints');
    if (Number(n) >= 20) return sendError(res, 'Up to 20 webhook addresses', 400);
    const id = `whep_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
    const secret = newWebhookSecret();
    const now = utc();
    await getPool().query(
        'INSERT INTO webhook_endpoints (id, partner_id, url, description, secret, events, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
        [id, cols.partner_id, cols.url, cols.description, secret, cols.events, now, now],
    );
    invalidateEndpointCache();
    sendJson(res, { webhook: endpointFromRow(await getEndpointRow(id)), secret }, 201);
}, 'Failed to add the webhook'));

router.put('/admin/integrations/webhooks/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    if (!(await getEndpointRow(req.params.id))) return sendError(res, 'Webhook not found', 404);
    const cols = await readEndpointInput(req.body, { partial: true });
    if (Object.keys(cols).length > 0) {
        cols.updated_at = utc();
        await getPool().query(`UPDATE webhook_endpoints SET ${Object.keys(cols).map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`, [...Object.values(cols), req.params.id]);
    }
    invalidateEndpointCache();
    sendJson(res, endpointFromRow(await getEndpointRow(req.params.id)));
}, 'Failed to update the webhook'));

/** The signing secret, for an admin who needs to set it up on the receiving side again. */
router.get('/admin/integrations/webhooks/:id/secret', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const row = await getEndpointRow(req.params.id);
    if (!row) return sendError(res, 'Webhook not found', 404);
    res.set('Cache-Control', 'no-store');
    sendJson(res, { secret: row.secret });
}, 'Failed to read the secret'));

router.post('/admin/integrations/webhooks/:id/rotate-secret', asyncRoute(async (req, res) => {
    requireAdmin(req);
    if (!(await getEndpointRow(req.params.id))) return sendError(res, 'Webhook not found', 404);
    const secret = newWebhookSecret();
    await getPool().query('UPDATE webhook_endpoints SET secret = ?, updated_at = ? WHERE id = ?', [secret, utc(), req.params.id]);
    sendJson(res, { secret });
}, 'Failed to make a new secret'));

router.post('/admin/integrations/webhooks/:id/test', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const row = await getEndpointRow(req.params.id);
    if (!row) return sendError(res, 'Webhook not found', 404);
    if (!Number(row.is_active)) return sendError(res, 'Switch the webhook on first', 400);
    sendJson(res, await sendTestEvent(req.params.id));
}, 'Failed to send the test'));

router.delete('/admin/integrations/webhooks/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const pool = getPool();
    const [del] = await pool.query('DELETE FROM webhook_endpoints WHERE id = ?', [req.params.id]);
    if (del.affectedRows !== 1) return sendError(res, 'Webhook not found', 404);
    await pool.query('DELETE FROM webhook_deliveries WHERE endpoint_id = ?', [req.params.id]);
    invalidateEndpointCache();
    sendJson(res, { ok: true });
}, 'Failed to remove the webhook'));

// ── Delivery log ──────────────────────────────────────────────────────────────────────────────────────────────────────

router.get('/admin/integrations/deliveries', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const where = [];
    const params = [];
    if (req.query.endpointId) { where.push('endpoint_id = ?'); params.push(String(req.query.endpointId)); }
    if (req.query.orderId) { where.push('order_id = ?'); params.push(String(req.query.orderId)); }
    if (['pending', 'sending', 'delivered', 'failed', 'skipped'].includes(String(req.query.status))) { where.push('status = ?'); params.push(String(req.query.status)); }
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const [rows] = await getPool().query(
        `SELECT * FROM webhook_deliveries ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ?`,
        [...params, limit],
    );
    sendJson(res, rows.map((r) => deliveryFromRow(r)));
}, 'Failed to load the webhook log'));

router.get('/admin/integrations/deliveries/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const [rows] = await getPool().query('SELECT * FROM webhook_deliveries WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows[0]) return sendError(res, 'Delivery not found', 404);
    sendJson(res, deliveryFromRow(rows[0], { withPayload: true }));
}, 'Failed to load the delivery'));

router.post('/admin/integrations/deliveries/:id/retry', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const result = await retryDelivery(req.params.id);
    if (!result) return sendError(res, 'That message is not found, or is being sent right now', 404);
    sendJson(res, result);
}, 'Failed to resend'));

export default router;
