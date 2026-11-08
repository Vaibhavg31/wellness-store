import crypto from 'node:crypto';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { getPool } from './db.js';

/**
 * Outgoing webhooks: when an order is placed or changes, every switched-on webhook address that asked for that event is sent
 * a signed JSON message. The message is saved first (webhook_deliveries) and then sent by a small background worker, so a slow
 * or broken receiver never slows down or fails an order, and a failed send is tried again later with the very same body.
 *
 *   order.created          an order was placed (website, admin or partner API)
 *   order.status_changed   its status moved (placed → confirmed → out_for_delivery → delivered, or cancelled / returned)
 *   order.cancelled        it was cancelled (also sent as order.status_changed)
 *   order.delivered        it was delivered (also sent as order.status_changed)
 *   order.paid             an online payment for it was received
 *   order.shipment_updated its tracking number, courier or expected delivery changed
 *   order.return_updated   a return was asked for, approved, declined or received
 *   order.refunded         it was marked refunded
 *   ping                   a test message sent from the admin
 *
 * Each message carries X-Chikit-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the endpoint's secret>.
 * A 2xx answer within 10 seconds counts as delivered; anything else is tried again after 1 min, 5 min, 30 min, 2 h, 6 h, 12 h
 * and 24 h (8 tries over about two days), then marked failed. It can always be sent again by hand from the admin.
 */

export const API_VERSION = '2026-11-01';

export const WEBHOOK_EVENTS = [
    { id: 'order.created', label: 'Order placed' },
    { id: 'order.status_changed', label: 'Order status changed' },
    { id: 'order.cancelled', label: 'Order cancelled' },
    { id: 'order.delivered', label: 'Order delivered' },
    { id: 'order.paid', label: 'Payment received' },
    { id: 'order.shipment_updated', label: 'Tracking details changed' },
    { id: 'order.return_updated', label: 'Return requested or updated' },
    { id: 'order.refunded', label: 'Order refunded' },
];
const EVENT_IDS = new Set(WEBHOOK_EVENTS.map((e) => e.id));

const RETRY_DELAYS_SECONDS = [60, 300, 1800, 7200, 21600, 43200, 86400];
export const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length + 1;
const SEND_TIMEOUT_MS = 10_000;
const KEEP_DELIVERED_DAYS = 30;
const KEEP_FAILED_DAYS = 90;

const isDev = () => (process.env.APP_ENV || '') === 'development';
/** UTC 'YYYY-MM-DD HH:MM:SS.mmm' — the shop keeps every time in the database in UTC, written by Node (not the DB clock). */
const utc = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 23).replace('T', ' ');
const toIso = (dt) => {
    if (!dt) return null;
    const d = dt instanceof Date ? dt : new Date(`${String(dt).replace(' ', 'T')}Z`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// ── The order as partners and webhooks see it ─────────────────────────────────────────────────────────────────────────

const PAYMENT_METHOD = { cod: 'cod', razorpay: 'online', offline: 'prepaid', pending: 'pending' };

/** A stable, documented shape for an order: no payment signatures, no admin notes, no internal ids beyond what a partner needs. */
export function orderForApi(order) {
    const s = order.shipping || {};
    return {
        id: order.id,
        externalRef: order.externalRef ?? null,
        source: order.orderSource || 'website',
        partner: order.apiPartnerId ? { id: order.apiPartnerId, name: order.apiPartnerName ?? '' } : null,
        status: order.status,
        statusHistory: (order.statusHistory ?? []).map((h) => ({ status: h.status, at: h.at, by: h.by ?? 'system', note: h.note ?? '' })),
        currency: 'INR',
        payment: { method: PAYMENT_METHOD[order.payment] ?? order.payment, status: order.paymentStatus, paidAt: order.paidAt ?? null },
        subtotal: Number(order.subtotal ?? 0),
        discountAmount: Number(order.discountAmount ?? 0),
        deliveryFee: Number(order.deliveryFee ?? 0),
        total: Number(order.total ?? 0),
        couponCode: order.couponCode || null,
        customer: { name: s.name ?? '', email: order.email ?? '', phone: s.phone ?? '' },
        shipping: { name: s.name ?? '', phone: s.phone ?? '', address: s.address ?? '', landmark: s.landmark ?? '', city: s.city ?? '', state: s.state ?? '', pincode: s.pincode ?? '' },
        items: (order.items ?? []).map((i) => ({
            productId: i.productId, variantId: i.variantId ?? null, title: i.title, variantLabel: i.variantLabel ?? null,
            quantity: Number(i.quantity), unitPrice: Number(i.price), lineTotal: Math.round(Number(i.price) * Number(i.quantity) * 100) / 100,
            image: i.image || null,
        })),
        tracking: { number: order.trackingNumber || null, carrier: order.carrier || null, estimatedDelivery: order.estimatedDelivery || null },
        cancellation: order.status === 'cancelled' ? { reason: order.cancelReason ?? null, note: order.cancelNote ?? null, by: order.cancelledBy ?? null, at: order.cancelledAt ?? null } : null,
        return: order.returnStatus ? { status: order.returnStatus, reason: order.returnReason ?? null, note: order.returnNote ?? null, requestedAt: order.returnRequestedAt ?? null, resolvedAt: order.returnResolvedAt ?? null } : null,
        refundStatus: order.refundStatus || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt ?? order.createdAt,
    };
}

/** Which events one change of an order makes, and what it was before (sent as data.previous). */
export function eventsForChange(before, after) {
    if (!before) return [{ type: 'order.created', previous: null }];
    const out = [];
    if (before.status !== after.status) {
        const previous = { status: before.status };
        out.push({ type: 'order.status_changed', previous });
        if (after.status === 'cancelled') out.push({ type: 'order.cancelled', previous });
        if (after.status === 'delivered') out.push({ type: 'order.delivered', previous });
    }
    if (after.paymentStatus === 'paid' && before.paymentStatus !== 'paid') out.push({ type: 'order.paid', previous: { paymentStatus: before.paymentStatus } });
    const track = (o) => [o.trackingNumber || '', o.carrier || '', o.estimatedDelivery || ''].join('|');
    if (track(before) !== track(after)) {
        out.push({ type: 'order.shipment_updated', previous: { tracking: { number: before.trackingNumber || null, carrier: before.carrier || null, estimatedDelivery: before.estimatedDelivery || null } } });
    }
    if ((before.returnStatus || null) !== (after.returnStatus || null)) out.push({ type: 'order.return_updated', previous: { returnStatus: before.returnStatus || null } });
    if (after.refundStatus === 'refunded' && before.refundStatus !== 'refunded') out.push({ type: 'order.refunded', previous: { refundStatus: before.refundStatus || null } });
    return out;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export function parseEvents(value) {
    const list = String(value || '*').split(',').map((e) => e.trim()).filter(Boolean);
    return list.includes('*') ? ['*'] : list.filter((e) => EVENT_IDS.has(e));
}

export function endpointFromRow(r) {
    return {
        id: r.id, partnerId: r.partner_id ?? null, url: r.url, description: r.description ?? '', events: parseEvents(r.events),
        isActive: Boolean(Number(r.is_active)), lastSuccessAt: toIso(r.last_success_at), lastFailureAt: toIso(r.last_failure_at),
        consecutiveFailures: Number(r.consecutive_failures ?? 0), createdAt: toIso(r.created_at), updatedAt: toIso(r.updated_at),
    };
}

let endpointCache = { at: 0, rows: [] };
/** Admin changes call this so a new or edited endpoint counts from the very next order. */
export function invalidateEndpointCache() { endpointCache = { at: 0, rows: [] }; }

async function activeEndpoints() {
    if (Date.now() - endpointCache.at < 15_000) return endpointCache.rows;
    const [rows] = await getPool().query('SELECT * FROM webhook_endpoints WHERE is_active = 1');
    endpointCache = { at: Date.now(), rows: rows.map(endpointFromRow) };
    return endpointCache.rows;
}

/** An endpoint with no partner hears about every order; a partner's endpoint only about that partner's orders. */
const endpointWants = (ep, type, order) => (ep.events.includes('*') || ep.events.includes(type)) && (!ep.partnerId || ep.partnerId === order.apiPartnerId);

// ── Queueing ──────────────────────────────────────────────────────────────────────────────────────────────────────────

function buildEvent(type, data) {
    return { id: `evt_${crypto.randomBytes(12).toString('hex')}`, type, apiVersion: API_VERSION, createdAt: new Date().toISOString(), data };
}

async function insertDelivery(endpointId, event, orderId) {
    const id = `whd_${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;
    const now = utc();
    await getPool().query(
        `INSERT INTO webhook_deliveries (id, endpoint_id, event_id, event_type, order_id, payload, status, attempts, next_attempt_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
        [id, endpointId, event.id, event.type, orderId ?? null, JSON.stringify(event), now, now],
    );
    return id;
}

/**
 * Called by the order repository after every create and update. Saves one delivery per interested endpoint, then wakes the
 * sender. Never throws: an order must not fail because a webhook could not be queued.
 */
export async function notifyOrderChange(before, after) {
    try {
        const events = eventsForChange(before, after);
        if (events.length === 0) return;
        const endpoints = await activeEndpoints();
        if (endpoints.length === 0) return;
        const order = orderForApi(after);
        let queued = 0;
        for (const { type, previous } of events) {
            const targets = endpoints.filter((ep) => endpointWants(ep, type, after));
            if (targets.length === 0) continue;
            const event = buildEvent(type, previous ? { order, previous } : { order });
            for (const ep of targets) { await insertDelivery(ep.id, event, after.id); queued += 1; }
        }
        if (queued > 0) kick();
    } catch (err) {
        console.error('[webhooks] could not queue order event:', err.message);
    }
}

// ── Safe sending ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** True for addresses on the open internet; false for this machine, private networks, link-local, CGNAT, multicast etc. */
export function isPublicAddress(ip) {
    const kind = net.isIP(ip);
    if (kind === 4) {
        const [a, b] = ip.split('.').map(Number);
        if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
        if (a === 100 && b >= 64 && b <= 127) return false;
        if (a === 169 && b === 254) return false;
        if (a === 172 && b >= 16 && b <= 31) return false;
        if (a === 192 && (b === 168 || b === 0)) return false;
        if (a === 198 && (b === 18 || b === 19)) return false;
        return true;
    }
    if (kind === 6) {
        const v = ip.toLowerCase();
        const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) return isPublicAddress(mapped[1]);
        if (v === '::' || v === '::1') return false;
        if (/^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff')) return false;
        return true;
    }
    return false;
}

/**
 * Checks an address an admin typed for a webhook. Outside development it must be https and must not point into the server's
 * own network (so the shop cannot be used to reach private machines). Returns an error message, or '' when it is fine.
 */
export function webhookUrlProblem(raw) {
    let url;
    try { url = new URL(String(raw || '').trim()); } catch { return 'Enter a full web address, starting with https://'; }
    if (String(raw).length > 500) return 'The address must be 500 characters or fewer';
    if (!['https:', 'http:'].includes(url.protocol)) return 'The address must start with https://';
    if (url.protocol === 'http:' && !isDev()) return 'Use an https:// address, so order details are sent encrypted';
    if (url.username || url.password) return 'Leave the user name and password out of the address; every message is signed instead';
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (!isDev() && (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || (net.isIP(host) && !isPublicAddress(host)))) {
        return 'That address points to a private network. Use a public https:// address';
    }
    return '';
}

/** DNS lookup that refuses private addresses (outside development), used for the connection itself, so it cannot be tricked. */
function safeLookup(hostname, options, callback) {
    const opts = typeof options === 'object' && options ? options : {};
    // Newer Node asks for every address at once (all: true, to try IPv4 and IPv6); older Node asks for one.
    dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
        if (err) return callback(err);
        const allowed = isDev() ? addresses : addresses.filter((a) => isPublicAddress(a.address));
        if (allowed.length === 0) return callback(Object.assign(new Error('the address resolves to a private network'), { code: 'EPRIVATE' }));
        if (opts.all) return callback(null, allowed);
        callback(null, allowed[0].address, allowed[0].family);
    });
}

export function signPayload(secret, timestamp, body) {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** One POST, no redirects followed, 10 s limit. Resolves { code, body, error, ms }. */
function post(urlText, body, headers) {
    return new Promise((resolve) => {
        const started = Date.now();
        const problem = webhookUrlProblem(urlText);
        if (problem) return resolve({ code: 0, body: '', error: problem, ms: 0 });
        const url = new URL(urlText);
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.request(url, {
            method: 'POST', lookup: safeLookup, timeout: SEND_TIMEOUT_MS,
            headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { if (text.length < 1000) text += chunk; });
            res.on('end', () => resolve({ code: res.statusCode || 0, body: text.slice(0, 1000), error: '', ms: Date.now() - started }));
            res.on('error', (e) => resolve({ code: res.statusCode || 0, body: text.slice(0, 1000), error: e.message, ms: Date.now() - started }));
        });
        req.on('timeout', () => req.destroy(new Error(`no answer within ${SEND_TIMEOUT_MS / 1000} seconds`)));
        req.on('error', (e) => resolve({ code: 0, body: '', error: e.message, ms: Date.now() - started }));
        req.end(body);
    });
}

// ── The sender ────────────────────────────────────────────────────────────────────────────────────────────────────────

export function deliveryFromRow(r, { withPayload = false } = {}) {
    return {
        id: r.id, endpointId: r.endpoint_id, eventId: r.event_id, eventType: r.event_type, orderId: r.order_id ?? null,
        status: r.status, attempts: Number(r.attempts), nextAttemptAt: r.status === 'pending' ? toIso(r.next_attempt_at) : null,
        lastAttemptAt: toIso(r.last_attempt_at), responseCode: r.response_code === null ? null : Number(r.response_code),
        responseBody: r.response_body ?? '', error: r.error ?? '', durationMs: r.duration_ms === null ? null : Number(r.duration_ms),
        createdAt: toIso(r.created_at), deliveredAt: toIso(r.delivered_at),
        ...(withPayload ? { payload: (() => { try { return JSON.parse(r.payload); } catch { return null; } })() } : {}),
    };
}

/** Sends one delivery that this process has claimed (status 'sending'), and records how it went. */
async function sendClaimed(row) {
    const pool = getPool();
    const [eps] = await pool.query('SELECT * FROM webhook_endpoints WHERE id = ? LIMIT 1', [row.endpoint_id]);
    const ep = eps[0];
    if (!ep || !Number(ep.is_active)) {
        await pool.query("UPDATE webhook_deliveries SET status = 'skipped', error = ?, next_attempt_at = NULL WHERE id = ?", [ep ? 'The webhook was switched off' : 'The webhook was removed', row.id]);
        return;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const event = JSON.parse(row.payload);
    const result = await post(ep.url, row.payload, {
        'Content-Type': 'application/json',
        'User-Agent': 'Chikit-Webhooks/1.0',
        'X-Chikit-Event': event.type,
        'X-Chikit-Event-Id': event.id,
        'X-Chikit-Delivery': row.id,
        'X-Chikit-Timestamp': String(timestamp),
        'X-Chikit-Signature': `t=${timestamp},v1=${signPayload(ep.secret, timestamp, row.payload)}`,
    });
    const attempts = Number(row.attempts) + 1;
    const ok = result.code >= 200 && result.code < 300;
    const now = utc();
    const error = ok ? null : (result.error || `The receiver answered ${result.code}`).slice(0, 300);
    if (ok) {
        await pool.query(
            "UPDATE webhook_deliveries SET status = 'delivered', attempts = ?, last_attempt_at = ?, delivered_at = ?, next_attempt_at = NULL, response_code = ?, response_body = ?, error = NULL, duration_ms = ? WHERE id = ?",
            [attempts, now, now, result.code, result.body, result.ms, row.id],
        );
        await pool.query('UPDATE webhook_endpoints SET last_success_at = ?, consecutive_failures = 0 WHERE id = ?', [now, ep.id]);
    } else {
        const giveUp = attempts >= MAX_ATTEMPTS;
        const next = giveUp ? null : utc(Date.now() + RETRY_DELAYS_SECONDS[attempts - 1] * 1000);
        await pool.query(
            'UPDATE webhook_deliveries SET status = ?, attempts = ?, last_attempt_at = ?, next_attempt_at = ?, response_code = ?, response_body = ?, error = ?, duration_ms = ? WHERE id = ?',
            [giveUp ? 'failed' : 'pending', attempts, now, next, result.code || null, result.body || null, error, result.ms, row.id],
        );
        await pool.query('UPDATE webhook_endpoints SET last_failure_at = ?, consecutive_failures = consecutive_failures + 1 WHERE id = ?', [now, ep.id]);
    }
}

/** Takes a pending delivery for this process (so it is never sent twice at once) and sends it. Returns false if someone else had it. */
async function claimAndSend(id) {
    const [res] = await getPool().query("UPDATE webhook_deliveries SET status = 'sending', last_attempt_at = ? WHERE id = ? AND status = 'pending'", [utc(), id]);
    if (res.affectedRows !== 1) return false;
    const [rows] = await getPool().query('SELECT * FROM webhook_deliveries WHERE id = ?', [id]);
    try {
        await sendClaimed(rows[0]);
    } catch (err) {
        // Something on our side broke (bad JSON, DB hiccup): put it back to be tried again in a minute.
        await getPool().query("UPDATE webhook_deliveries SET status = 'pending', next_attempt_at = ?, error = ? WHERE id = ? AND status = 'sending'", [utc(Date.now() + 60_000), String(err.message).slice(0, 300), id]).catch(() => {});
    }
    return true;
}

let running = false;
let again = false;
/** Sends everything that is due, oldest first. Only one pass runs at a time; a call during a pass schedules another one. */
export async function processDue() {
    if (running) { again = true; return; }
    running = true;
    try {
        do {
            again = false;
            const pool = getPool();
            // A send interrupted by a restart is put back after two minutes.
            await pool.query("UPDATE webhook_deliveries SET status = 'pending', next_attempt_at = ? WHERE status = 'sending' AND last_attempt_at < ?", [utc(), utc(Date.now() - 120_000)]);
            const [due] = await pool.query("SELECT id FROM webhook_deliveries WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY created_at ASC, id ASC LIMIT 25", [utc()]);
            // Five at a time: fast, without one slow receiver holding up the rest for long.
            for (let i = 0; i < due.length; i += 5) await Promise.all(due.slice(i, i + 5).map((d) => claimAndSend(d.id)));
            if (due.length === 25) again = true;
        } while (again);
    } catch (err) {
        console.error('[webhooks] sending failed:', err.message);
    } finally {
        running = false;
    }
}

function kick() { setImmediate(() => { processDue(); }); }

async function cleanUp() {
    try {
        await getPool().query("DELETE FROM webhook_deliveries WHERE (status IN ('delivered','skipped') AND created_at < ?) OR (status = 'failed' AND created_at < ?)", [utc(Date.now() - KEEP_DELIVERED_DAYS * 86_400_000), utc(Date.now() - KEEP_FAILED_DAYS * 86_400_000)]);
    } catch (err) {
        console.error('[webhooks] clean-up failed:', err.message);
    }
}

let timer = null;
/** Started once by server.js: checks for due messages every 10 seconds and clears old history once a day. */
export function startWebhookWorker() {
    if (timer) return;
    timer = setInterval(() => { processDue(); }, 10_000);
    timer.unref?.();
    const daily = setInterval(cleanUp, 86_400_000);
    daily.unref?.();
    setTimeout(() => { processDue(); cleanUp(); }, 3000).unref?.();
}

// ── Admin actions ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Sends a "ping" to one endpoint right away and returns the delivery, so the admin sees at once whether it works. */
export async function sendTestEvent(endpointId) {
    const event = buildEvent('ping', { message: 'This is a test message from your Chikit shop. If you can read this, the webhook works.' });
    const id = await insertDelivery(endpointId, event, null);
    await claimAndSend(id);
    const [rows] = await getPool().query('SELECT * FROM webhook_deliveries WHERE id = ?', [id]);
    return deliveryFromRow(rows[0]);
}

/** Sends a delivery again now (same event, same body, so a receiver that keeps event ids will not double-count it). */
export async function retryDelivery(id) {
    const [res] = await getPool().query("UPDATE webhook_deliveries SET status = 'pending', next_attempt_at = ? WHERE id = ? AND status <> 'sending'", [utc(), id]);
    if (res.affectedRows !== 1) return null;
    await claimAndSend(id);
    const [rows] = await getPool().query('SELECT * FROM webhook_deliveries WHERE id = ?', [id]);
    return rows[0] ? deliveryFromRow(rows[0]) : null;
}

export function newWebhookSecret() {
    return `whsec_${crypto.randomBytes(24).toString('base64url')}`;
}
