import bcrypt from 'bcryptjs';
import { generateId, getPool } from './db.js';
import { HttpError } from './response.js';

/**
 * Who may open the admin panel.
 *
 * - Super admins come from ADMIN_LOGINS in the server config ("email:bcrypt-hash,…"). They always work, whatever happens in
 *   the database, so the developer can get back in and repair access if the shop's own login is lost.
 * - Admin accounts live in the `admin_accounts` table and are managed by a super admin from the admin panel (Login & access):
 *   add the shop's email and password, reset it, change the email, switch it off. Each account can change its own password.
 *
 * A token issued to an admin account carries its id and a version number; changing the password or switching the account off
 * bumps the version, so older sessions stop working at once (see isAccountTokenValid, used by requireAdmin).
 */

const MIN_PASSWORD = 8;
const REFRESH_MS = 30_000;

/** Super admin sign-ins from the server config: email → bcrypt hash. */
export function superLogins() {
    const logins = new Map();
    for (const entry of String(process.env.ADMIN_LOGINS || '').split(',')) {
        const cut = entry.indexOf(':');
        if (cut < 1) continue;
        const email = entry.slice(0, cut).trim().toLowerCase();
        const hash = entry.slice(cut + 1).trim();
        if (email && hash) logins.set(email, hash);
    }
    return logins;
}

export function isSuperEmail(email) {
    return superLogins().has(String(email || '').toLowerCase());
}

/* ---------- in-memory view of active accounts, so the (synchronous) admin check needs no query ---------- */

let active = new Map(); // email → { id, version }
let timer = null;

export async function refreshAdminAccounts() {
    try {
        const [rows] = await getPool().query('SELECT id, email, token_version FROM admin_accounts WHERE is_active = 1');
        active = new Map(rows.map((r) => [String(r.email).toLowerCase(), { id: r.id, version: Number(r.token_version) }]));
    } catch (err) {
        console.error('[admin-accounts] refresh failed:', err?.message || err);
    }
}

/** Loads the accounts now and keeps them fresh (another server instance may change them). */
export async function startAdminAccounts() {
    await refreshAdminAccounts();
    if (!timer) {
        timer = setInterval(refreshAdminAccounts, REFRESH_MS);
        timer.unref?.();
    }
}

export function activeAccountByEmail(email) {
    return active.get(String(email || '').toLowerCase()) ?? null;
}

/** False once the account behind a token has been switched off, removed, renamed or had its password changed. */
export function isAccountTokenValid(payload) {
    const account = activeAccountByEmail(payload.email);
    return Boolean(account && account.id === payload.acct && account.version === Number(payload.ver));
}

export function accountTokenPayload(account) {
    return { role: 'admin', email: account.email, acct: account.id, ver: Number(account.tokenVersion) };
}

/* ---------- reading and writing ---------- */

/** Stored DATETIMEs are UTC (see now()); same reading as BaseRepository.toIso. */
function toIso(dt) {
    if (dt === null || dt === undefined || dt === '') return null;
    const d = dt instanceof Date ? dt : new Date(String(dt).replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toAccount(row) {
    return {
        id: row.id,
        email: row.email,
        name: row.name ?? '',
        isActive: Boolean(row.is_active),
        tokenVersion: Number(row.token_version),
        createdAt: toIso(row.created_at),
        lastLoginAt: toIso(row.last_login_at),
    };
}

const now = () => new Date().toISOString().slice(0, 23).replace('T', ' ');

function cleanEmail(value) {
    const email = String(value ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('Enter a valid email address', 400);
    return email;
}

export function checkPassword(value) {
    const password = String(value ?? '');
    if (password.length < MIN_PASSWORD) throw new HttpError(`Use at least ${MIN_PASSWORD} characters for the password`, 400);
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new HttpError('Use letters and at least one number in the password', 400);
    return password;
}

export async function listAccounts() {
    const [rows] = await getPool().query('SELECT * FROM admin_accounts ORDER BY created_at ASC');
    return rows.map(toAccount);
}

export async function findAccountByEmail(email) {
    const [rows] = await getPool().query('SELECT * FROM admin_accounts WHERE email = ? LIMIT 1', [String(email || '').toLowerCase()]);
    return rows[0] ? { ...toAccount(rows[0]), passwordHash: rows[0].password_hash } : null;
}

async function findAccountById(id) {
    const [rows] = await getPool().query('SELECT * FROM admin_accounts WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? { ...toAccount(rows[0]), passwordHash: rows[0].password_hash } : null;
}

/** The account when the email and password match an active admin account, else null. */
export async function verifyAccountLogin(email, password) {
    const account = await findAccountByEmail(email);
    if (!account || !account.isActive || !account.passwordHash) return null;
    if (!bcrypt.compareSync(String(password), account.passwordHash)) return null;
    await getPool().query('UPDATE admin_accounts SET last_login_at = ? WHERE id = ?', [now(), account.id]);
    return account;
}

export async function createAccount({ email, name, password }) {
    const clean = cleanEmail(email);
    if (isSuperEmail(clean)) throw new HttpError('That email is already a super admin', 409);
    if (await findAccountByEmail(clean)) throw new HttpError('An admin account with this email already exists', 409);
    const id = generateId('admin');
    const stamp = now();
    await getPool().query(
        'INSERT INTO admin_accounts (id, email, name, password_hash, is_active, token_version, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
        [id, clean, String(name ?? '').trim().slice(0, 120), bcrypt.hashSync(checkPassword(password), 10), stamp, stamp],
    );
    await refreshAdminAccounts();
    return toAccount((await getPool().query('SELECT * FROM admin_accounts WHERE id = ?', [id]))[0][0]);
}

/** Super admin edits: email, name, a new password, on/off. Anything that changes who can sign in ends existing sessions. */
export async function updateAccount(id, changes) {
    const account = await findAccountById(id);
    if (!account) throw new HttpError('Admin account not found', 404);
    const sets = [];
    const values = [];
    let endSessions = false;
    if (changes.email !== undefined) {
        const clean = cleanEmail(changes.email);
        if (clean !== account.email) {
            if (isSuperEmail(clean)) throw new HttpError('That email is already a super admin', 409);
            if (await findAccountByEmail(clean)) throw new HttpError('Another admin account already uses this email', 409);
            sets.push('email = ?'); values.push(clean); endSessions = true;
        }
    }
    if (changes.name !== undefined) { sets.push('name = ?'); values.push(String(changes.name ?? '').trim().slice(0, 120)); }
    if (changes.password) { sets.push('password_hash = ?'); values.push(bcrypt.hashSync(checkPassword(changes.password), 10)); endSessions = true; }
    if (changes.isActive !== undefined) {
        const on = Boolean(changes.isActive);
        if (on !== account.isActive) { sets.push('is_active = ?'); values.push(on ? 1 : 0); endSessions = true; }
    }
    if (sets.length === 0) return account;
    if (endSessions) sets.push('token_version = token_version + 1');
    sets.push('updated_at = ?'); values.push(now());
    await getPool().query(`UPDATE admin_accounts SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
    await refreshAdminAccounts();
    const { passwordHash, ...updated } = await findAccountById(id);
    return updated;
}

/** An admin account changing its own password: the current one must be right. Returns the account (new version). */
export async function changeOwnPassword(id, currentPassword, newPassword) {
    const account = await findAccountById(id);
    if (!account || !account.isActive) throw new HttpError('Admin account not found', 404);
    if (!bcrypt.compareSync(String(currentPassword ?? ''), account.passwordHash)) throw new HttpError('Your current password is not right', 400);
    return updateAccount(id, { password: newPassword });
}

export async function deleteAccount(id) {
    const [result] = await getPool().query('DELETE FROM admin_accounts WHERE id = ?', [id]);
    await refreshAdminAccounts();
    if (result.affectedRows === 0) throw new HttpError('Admin account not found', 404);
}

/* ---------- sign-in log ---------- */

/** Every admin sign-in attempt, kept for 180 days. `via`: password, studio or google. */
export async function recordAdminLogin(email, ok, ip, via) {
    try {
        const pool = getPool();
        await pool.query('INSERT INTO admin_login_log (email, ok, ip, via, created_at) VALUES (?, ?, ?, ?, ?)', [String(email || '').toLowerCase().slice(0, 255), ok ? 1 : 0, String(ip || '').slice(0, 64), via, now()]);
        if (Math.random() < 0.05) await pool.query('DELETE FROM admin_login_log WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 180 DAY)');
    } catch (err) {
        console.error('[admin-accounts] could not record sign-in:', err?.message || err);
    }
}

export async function recentAdminLogins(limit = 50) {
    const [rows] = await getPool().query('SELECT email, ok, ip, via, created_at FROM admin_login_log ORDER BY id DESC LIMIT ?', [Math.min(200, Math.max(1, Number(limit) || 50))]);
    return rows.map((r) => ({ email: r.email, ok: Boolean(r.ok), ip: r.ip, via: r.via, at: toIso(r.created_at) }));
}
