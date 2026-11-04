import { Router } from 'express';
import crypto from 'node:crypto';
import { requireCustomer, requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { getPool } from '../lib/db.js';
import { checkRateLimit } from '../lib/rateLimiter.js';
import { clubConfig } from '../lib/club.js';
import * as otpConfig from '../lib/otpConfig.js';
import { validateAddress, normalizeAddress } from '../lib/addressHelper.js';
import { MAX_ADDRESSES } from '../lib/addressBookHelper.js';
import * as emailService from '../services/emailService.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { publicUser, isEmailVerified, shouldSkipEmailVerify } from './authRoutes.js';

const router = Router();
const users = new UserRepository();
const settings = new SettingsRepository();

const GENDERS = ['female', 'male', 'other', 'prefer_not_to_say'];
const OTP_MINUTES = 10;
const MAX_CODE_TRIES = 5;

const dbNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const hashCode = (userId, email, code) => crypto.createHash('sha256').update(`${userId}|${email.toLowerCase()}|${code}`).digest('hex');

/** Public: what the club is, for the sign-up page and the product pages. */
async function publicClubInfo() {
    const cfg = await clubConfig();
    const { extras } = await settings.get();
    const club = extras?.club ?? {};
    return {
        enabled: cfg.enabled,
        cardName: cfg.cardName,
        discountPercent: cfg.discountPercent,
        tagline: club.tagline ?? '',
        benefits: club.benefits ?? [],
    };
}

/** "CHK-2610-483920": unique, not guessable from the order of joining. */
async function newCardNumber() {
    for (let i = 0; i < 20; i += 1) {
        const now = new Date();
        const card = `CHK-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}-${String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')}`;
        if (!(await users.findOneBy('club_card_no', card))) return card;
    }
    return `CHK-${Date.now()}`;
}

router.get('/club/info', asyncRoute(async (req, res) => {
    sendJson(res, await publicClubInfo(), 200, 30);
}, 'Failed to load club details'));

router.get('/club/status', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const user = await users.getById(String(payload.userId || ''));
    if (!user) return sendError(res, 'User not found', 404);
    sendJson(res, {
        ...publicUser(user),
        // What the join form still needs from this person.
        needs: {
            phone: !(user.phoneVerified || (await otpConfig.shouldSkipOtpVerify())),
            email: !(isEmailVerified(user) || shouldSkipEmailVerify()),
        },
        // On a test server the checks are switched off: the page then just collects the details.
        skip: { phone: await otpConfig.shouldSkipOtpVerify(), email: shouldSkipEmailVerify() },
    });
}, 'Failed to load club status'));

// ── Email code ──────────────────────────────────────────────────────────

router.post('/club/email-otp/send', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const user = await users.getById(String(payload.userId || ''));
    if (!user) return sendError(res, 'User not found', 404);

    const email = String(req.body?.email || user.email || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'Enter a valid email address', 400);
    if (email !== String(user.email).toLowerCase()) return sendError(res, 'Use the email address of your account.', 400);

    if (!(await checkRateLimit(`club-email-otp-${user.id}`, 5, 900))) return sendError(res, 'Too many codes requested. Please wait a few minutes and try again.', 429);

    if (shouldSkipEmailVerify()) return sendJson(res, { message: 'Email check skipped on this server', devMode: true });

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const pool = getPool();
    await pool.query('DELETE FROM club_email_otps WHERE user_id = ?', [user.id]);
    await pool.query(
        'INSERT INTO club_email_otps (user_id, email, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)',
        [user.id, email, hashCode(user.id, email, code), new Date(Date.now() + OTP_MINUTES * 60_000).toISOString().slice(0, 19).replace('T', ' '), dbNow()],
    );

    const result = await emailService.sendOtpEmail(email, user.name || 'there', code, OTP_MINUTES);
    if (!result.ok) {
        // On a developer's machine without e-mail set up, show the code so the flow can still be tried; never in production.
        if ((process.env.APP_ENV || '') === 'development') {
            console.error(`[Club] E-mail not configured. Code for ${email}: ${code}`);
            return sendJson(res, { message: 'Email is not set up here; use the code shown.', devMode: true, debugCode: code });
        }
        return sendError(res, 'We could not send the email right now. Please try again in a moment.', 503);
    }
    sendJson(res, { message: `We sent a 6-digit code to ${email}` });
}, 'Failed to send code'));

router.post('/club/email-otp/verify', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const user = await users.getById(String(payload.userId || ''));
    if (!user) return sendError(res, 'User not found', 404);

    if (shouldSkipEmailVerify()) {
        if (!isEmailVerified(user)) await users.update(user.id, { emailVerified: true, emailVerifiedAt: new Date().toISOString() });
        return sendJson(res, { emailVerified: true });
    }

    const code = String(req.body?.code || '').replace(/\D/g, '');
    if (code.length !== 6) return sendError(res, 'Enter the 6-digit code from your email', 400);

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM club_email_otps WHERE user_id = ? ORDER BY id DESC LIMIT 1', [user.id]);
    const row = rows[0];
    if (!row || new Date(`${String(row.expires_at).replace(' ', 'T')}Z`).getTime() < Date.now()) return sendError(res, 'That code has expired. Ask for a new one.', 400);
    if (row.attempts >= MAX_CODE_TRIES) return sendError(res, 'Too many wrong tries. Ask for a new code.', 429);

    if (row.code_hash !== hashCode(user.id, row.email, code)) {
        await pool.query('UPDATE club_email_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
        return sendError(res, 'That code is not right. Check the email and try again.', 400);
    }

    await pool.query('DELETE FROM club_email_otps WHERE user_id = ?', [user.id]);
    await users.update(user.id, { emailVerified: true, emailVerifiedAt: new Date().toISOString() });
    sendJson(res, { emailVerified: true });
}, 'Failed to verify code'));

// ── Join ────────────────────────────────────────────────────────────────

router.post('/club/join', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const cfg = await clubConfig();
    if (!cfg.enabled) return sendError(res, 'Chikit Club is not open for new members right now.', 403);

    const user = await users.getById(String(payload.userId || ''));
    if (!user) return sendError(res, 'User not found', 404);
    if (user.clubMember) return sendJson(res, publicUser(user)); // already a member: nothing to do

    if (!user.phone || !(user.phoneVerified || (await otpConfig.shouldSkipOtpVerify()))) return sendError(res, 'Please verify your mobile number first.', 403);
    if (!isEmailVerified(user) && !shouldSkipEmailVerify()) return sendError(res, 'Please verify your email address first.', 403);

    const body = req.body || {};
    const dob = String(body.dob || '').slice(0, 10);
    const dobTime = new Date(`${dob}T00:00:00Z`).getTime();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(dobTime)) return sendError(res, 'Enter your date of birth.', 400);
    const years = (Date.now() - dobTime) / (365.25 * 86_400_000);
    if (years < 13 || years > 110) return sendError(res, 'Enter a valid date of birth (members must be 13 or older).', 400);

    const gender = String(body.gender || '');
    if (!GENDERS.includes(gender)) return sendError(res, 'Choose a gender (or "prefer not to say").', 400);

    const name = String(body.name || user.name || '').trim().slice(0, 120);
    const address = normalizeAddress({ ...(body.address || {}), name: body.address?.name || name, phone: body.address?.phone || user.phone, label: 'Home' });
    const problems = validateAddress(address);
    if (Object.keys(problems).length > 0) return sendError(res, Object.values(problems).join(' '), 400);

    // Save the address in the address book (up to the usual limit) and make it the default when it is the first.
    const existing = user.addresses ?? [];
    if (existing.length < MAX_ADDRESSES) {
        const added = await users.addAddress(user.id, { ...address, isDefault: existing.length === 0 });
        await users.setLastUsedAddress(user.id, String(added.id || ''));
    }

    await users.update(user.id, {
        ...(name ? { name } : {}),
        dob,
        gender,
        clubMember: true,
        clubJoinedAt: new Date().toISOString(),
        clubCardNo: await newCardNumber(),
    });
    sendJson(res, publicUser(await users.getById(user.id)), 201);
}, 'Failed to join the club'));

// ── Admin ───────────────────────────────────────────────────────────────

/** Everyone who has joined, newest first, with what the club asked for at sign-up. */
router.get('/club/admin/members', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const [rows] = await getPool().query(
        `SELECT u.id, u.name, u.email, u.phone, u.dob, u.gender, u.club_card_no, u.club_joined_at,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('cancelled', 'returned')) AS orders,
                (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('cancelled', 'returned')) AS spent
           FROM users u WHERE u.club_member = 1 ORDER BY u.club_joined_at DESC`,
    );
    sendJson(res, rows.map((r) => ({
        id: r.id, name: r.name, email: r.email, phone: r.phone, dob: r.dob ? String(r.dob).slice(0, 10) : null, gender: r.gender,
        cardNo: r.club_card_no, joinedAt: r.club_joined_at ? new Date(`${String(r.club_joined_at).replace(' ', 'T')}Z`).toISOString() : null,
        orders: Number(r.orders), spent: Number(r.spent),
    })));
}, 'Failed to list members'));

/** Take a person out of the club (their account and orders stay). */
router.delete('/club/admin/members/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const user = await users.getById(req.params.id);
    if (!user) return sendError(res, 'Customer not found', 404);
    await getPool().query('UPDATE users SET club_member = 0 WHERE id = ?', [user.id]);
    sendJson(res, { success: true });
}, 'Failed to remove member'));

export default router;
