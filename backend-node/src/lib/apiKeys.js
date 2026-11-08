import crypto from 'node:crypto';
import net from 'node:net';
import { getPool, generateId } from './db.js';
import { HttpError } from './response.js';
import { checkRateLimit } from './rateLimiter.js';

/**
 * API partners: another business (a marketplace, a reseller, a corporate gifting desk, an ERP) that places orders in this shop
 * from its own system. Each partner gets one secret key, shown once when it is made; only its SHA-256 is stored, so a leaked
 * database does not leak working keys. A key can be switched off, replaced (the old one stops at once) or removed.
 *
 * What a key may do is limited by its scopes, which payment methods it may use, and optionally which IP addresses it may call from.
 */

export const API_SCOPES = [
    { id: 'products:read', label: 'See products, prices and stock' },
    { id: 'orders:read', label: 'See its own orders' },
    { id: 'orders:write', label: 'Place and cancel its own orders' },
];
const SCOPE_IDS = API_SCOPES.map((s) => s.id);

/** prepaid = the partner has already collected the money; cod = the shop's courier collects cash on delivery. */
export const API_PAYMENTS = [
    { id: 'prepaid', label: 'Prepaid (the partner collects the payment)' },
    { id: 'cod', label: 'Cash on delivery' },
];
const PAYMENT_IDS = API_PAYMENTS.map((p) => p.id);

const REQUESTS_PER_MINUTE = 120;
const utc = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 23).replace('T', ' ');
const toIso = (dt) => {
    if (!dt) return null;
    const d = dt instanceof Date ? dt : new Date(`${String(dt).replace(' ', 'T')}Z`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');

/** ck_live_… on the live shop, ck_test_… in development, so a test key is never mistaken for a live one. */
export function newApiKey() {
    const mode = (process.env.APP_ENV || '') === 'development' ? 'test' : 'live';
    const key = `ck_${mode}_${crypto.randomBytes(24).toString('base64url')}`;
    return { key, prefix: key.slice(0, 12), hash: hashKey(key) };
}

const list = (value, allowed) => [...new Set(String(value || '').split(',').map((s) => s.trim()).filter((s) => allowed.includes(s)))];

export function partnerFromRow(r) {
    return {
        id: r.id, name: r.name, contactEmail: r.contact_email ?? '', keyPrefix: r.key_prefix,
        scopes: list(r.scopes, SCOPE_IDS), allowedPayments: list(r.allowed_payments, PAYMENT_IDS),
        ipAllowlist: String(r.ip_allowlist || '').split(/[\s,]+/).filter(Boolean),
        isActive: Boolean(Number(r.is_active)), lastUsedAt: toIso(r.last_used_at), createdAt: toIso(r.created_at), updatedAt: toIso(r.updated_at),
    };
}

// ── Validation of what an admin types ─────────────────────────────────────────────────────────────────────────────────

function isIpOrCidr(entry) {
    const [ip, bits, extra] = entry.split('/');
    if (extra !== undefined) return false;
    const kind = net.isIP(ip);
    if (!kind) return false;
    if (bits === undefined) return true;
    const n = Number(bits);
    return Number.isInteger(n) && n >= 0 && n <= (kind === 4 ? 32 : 128) && /^\d+$/.test(bits);
}

/** Reads and checks a partner form. `partial` = an edit (only what was sent changes). Returns the DB columns to write. */
export function readPartnerInput(body, { partial = false } = {}) {
    const b = body && typeof body === 'object' ? body : {};
    const out = {};
    if (!partial || 'name' in b) {
        const name = typeof b.name === 'string' ? b.name.trim() : '';
        if (!name || name.length > 120) throw new HttpError('Give the partner a name (up to 120 characters)', 400);
        out.name = name;
    }
    if (!partial || 'contactEmail' in b) {
        const email = typeof b.contactEmail === 'string' ? b.contactEmail.trim().toLowerCase() : '';
        if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new HttpError('The contact email does not look right', 400);
        out.contact_email = email;
    }
    if (!partial || 'scopes' in b) {
        const scopes = Array.isArray(b.scopes) ? b.scopes : SCOPE_IDS;
        if (scopes.some((s) => !SCOPE_IDS.includes(s))) throw new HttpError(`Unknown permission. Use: ${SCOPE_IDS.join(', ')}`, 400);
        if (scopes.length === 0) throw new HttpError('Tick at least one thing the partner may do', 400);
        out.scopes = [...new Set(scopes)].join(',');
    }
    if (!partial || 'allowedPayments' in b) {
        const pays = Array.isArray(b.allowedPayments) ? b.allowedPayments : ['prepaid'];
        if (pays.some((p) => !PAYMENT_IDS.includes(p))) throw new HttpError(`Unknown payment method. Use: ${PAYMENT_IDS.join(', ')}`, 400);
        if (pays.length === 0) throw new HttpError('Allow at least one payment method', 400);
        out.allowed_payments = [...new Set(pays)].join(',');
    }
    if (!partial || 'ipAllowlist' in b) {
        const raw = Array.isArray(b.ipAllowlist) ? b.ipAllowlist.join(',') : String(b.ipAllowlist ?? '');
        const entries = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
        const bad = entries.find((e) => !isIpOrCidr(e));
        if (bad) throw new HttpError(`"${bad.slice(0, 60)}" is not an IP address (like 203.0.113.7) or range (like 203.0.113.0/24)`, 400);
        if (entries.length > 50) throw new HttpError('Up to 50 IP addresses or ranges', 400);
        out.ip_allowlist = entries.join(',');
    }
    if ('isActive' in b) {
        if (typeof b.isActive !== 'boolean') throw new HttpError('isActive must be true or false', 400);
        out.is_active = b.isActive ? 1 : 0;
    }
    return out;
}

// ── Store ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listPartners() {
    const [rows] = await getPool().query(
        `SELECT p.*, (SELECT COUNT(*) FROM orders o WHERE o.api_partner_id = p.id) AS order_count
         FROM api_partners p ORDER BY p.created_at DESC`,
    );
    return rows.map((r) => ({ ...partnerFromRow(r), orderCount: Number(r.order_count || 0) }));
}

export async function getPartner(id) {
    const [rows] = await getPool().query('SELECT * FROM api_partners WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? partnerFromRow(rows[0]) : null;
}

/** Makes a partner and its key. The key is in the answer only this once. */
export async function createPartner(body) {
    const cols = readPartnerInput(body);
    const { key, prefix, hash } = newApiKey();
    const id = generateId('partner');
    const now = utc();
    await getPool().query(
        `INSERT INTO api_partners (id, name, contact_email, key_prefix, key_hash, scopes, allowed_payments, ip_allowlist, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [id, cols.name, cols.contact_email, prefix, hash, cols.scopes, cols.allowed_payments, cols.ip_allowlist, now, now],
    );
    return { partner: await getPartner(id), apiKey: key };
}

export async function updatePartner(id, body) {
    const cols = readPartnerInput(body, { partial: true });
    if (Object.keys(cols).length > 0) {
        cols.updated_at = utc();
        await getPool().query(`UPDATE api_partners SET ${Object.keys(cols).map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`, [...Object.values(cols), id]);
    }
    return getPartner(id);
}

/** A new key; the old one stops working at once. */
export async function rotatePartnerKey(id) {
    const { key, prefix, hash } = newApiKey();
    const [res] = await getPool().query('UPDATE api_partners SET key_prefix = ?, key_hash = ?, updated_at = ? WHERE id = ?', [prefix, hash, utc(), id]);
    if (res.affectedRows !== 1) return null;
    return { partner: await getPartner(id), apiKey: key };
}

/** Removes the partner and its webhooks. Its orders stay (they keep the partner's name). */
export async function deletePartner(id) {
    const pool = getPool();
    const [res] = await pool.query('DELETE FROM api_partners WHERE id = ?', [id]);
    if (res.affectedRows !== 1) return false;
    const [eps] = await pool.query('SELECT id FROM webhook_endpoints WHERE partner_id = ?', [id]);
    if (eps.length > 0) {
        const ids = eps.map((e) => e.id);
        await pool.query(`UPDATE webhook_deliveries SET status = 'skipped', error = 'The partner was removed', next_attempt_at = NULL WHERE status = 'pending' AND endpoint_id IN (${ids.map(() => '?').join(',')})`, ids);
        await pool.query('DELETE FROM webhook_endpoints WHERE partner_id = ?', [id]);
    }
    return true;
}

// ── Checking a request ────────────────────────────────────────────────────────────────────────────────────────────────

function ipv4ToInt(ip) { return ip.split('.').reduce((n, part) => (n * 256) + Number(part), 0); }

function ipMatches(ip, entry) {
    const [base, bits] = entry.split('/');
    if (bits === undefined) return ip === base;
    if (net.isIP(ip) === 4 && net.isIP(base) === 4) {
        const size = 2 ** (32 - Number(bits)); // addresses in the range; same block = same quotient
        return Math.floor(ipv4ToInt(ip) / size) === Math.floor(ipv4ToInt(base) / size);
    }
    return false; // IPv6 ranges: exact addresses only
}

const clientIp = (req) => String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, '$1');

function keyFrom(req) {
    const header = String(req.headers.authorization || '');
    if (header.startsWith('Bearer ')) return header.slice(7).trim();
    return String(req.headers['x-api-key'] || '').trim();
}

/**
 * The partner calling, or an HttpError (401 no/wrong key, 403 switched off / not allowed / wrong IP, 429 too many requests).
 * Every partner may make 120 requests a minute.
 */
export async function requirePartner(req, scope) {
    const key = keyFrom(req);
    if (!key) throw new HttpError('Missing API key. Send it as "Authorization: Bearer <key>".', 401, 'missing_api_key');
    if (!/^ck_(live|test)_[A-Za-z0-9_-]{20,80}$/.test(key)) throw new HttpError('That API key is not valid.', 401, 'invalid_api_key');
    const [rows] = await getPool().query('SELECT * FROM api_partners WHERE key_hash = ? LIMIT 1', [hashKey(key)]);
    if (!rows[0]) throw new HttpError('That API key is not valid.', 401, 'invalid_api_key');
    const partner = partnerFromRow(rows[0]);
    if (!partner.isActive) throw new HttpError('This API key is switched off. Please contact the shop.', 403, 'api_key_disabled');
    const ip = clientIp(req);
    if (partner.ipAllowlist.length > 0 && !partner.ipAllowlist.some((entry) => ipMatches(ip, entry))) {
        throw new HttpError(`Requests from ${ip} are not allowed for this API key.`, 403, 'ip_not_allowed');
    }
    if (scope && !partner.scopes.includes(scope)) throw new HttpError(`This API key may not do that (needs "${scope}").`, 403, 'insufficient_scope');
    if (!(await checkRateLimit(`api-${partner.id}`, REQUESTS_PER_MINUTE, 60))) {
        throw new HttpError(`Too many requests: up to ${REQUESTS_PER_MINUTE} a minute. Please slow down and try again shortly.`, 429, 'rate_limited');
    }
    // "Last used" is updated at most once a minute, not on every call.
    await getPool().query('UPDATE api_partners SET last_used_at = ? WHERE id = ? AND (last_used_at IS NULL OR last_used_at < ?)', [utc(), partner.id, utc(Date.now() - 60_000)]);
    return partner;
}
