import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { requireCustomer, requireAdmin, optionalCustomer, signToken } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { checkRateLimit, retryAfterSeconds } from '../lib/rateLimiter.js';
import { generateId, getPool } from '../lib/db.js';
import { isGoogleSignInEnabled } from '../lib/servicesConfig.js';
import * as otpConfig from '../lib/otpConfig.js';
import { logOtp, recentOtpLogs, serverOutboundIp } from '../lib/otpLogger.js';
import * as msg91 from '../services/msg91Service.js';
import * as emailService from '../services/emailService.js';
import { UserRepository } from '../repositories/userRepository.js';

const router = Router();
const repo = new UserRepository();

function adminEmails() {
    const raw = process.env.ADMIN_EMAILS || '';
    return raw.split(',').map((e) => e.toLowerCase().trim()).filter(Boolean);
}

function clientIp(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
}

async function msg91ServiceError(res, result, fallback) {
    let error = result.error || fallback;
    const outboundIp = await serverOutboundIp();
    if (outboundIp && error.toLowerCase().includes('whitelist')) error += ` Whitelist IP: ${outboundIp}`;
    sendError(res, error, 503);
}

function isMsg91ServiceFailure(result) {
    const error = String(result.error || '').toLowerCase();
    const code = String(result.msg91Code ?? '');
    if (code === '418' || error.includes('whitelist')) return true;
    return error.includes('auth key') || error.includes('balance') || error.includes('network') || error.includes('not configured');
}

function publicUser(user) {
    return {
        id: user.id || '',
        email: user.email || '',
        name: user.name ?? null,
        avatar: user.avatar ?? null,
        phone: user.phone ?? null,
        phoneVerified: Boolean(user.phoneVerified),
        emailVerified: isEmailVerified(user),
        addresses: user.addresses || [],
        lastUsedAddressId: user.lastUsedAddressId ?? null,
    };
}

export function isEmailVerified(user) {
    if (user.emailVerified) return true;
    if (!user.passwordHash) return true; // Google-only
    if (!('emailVerified' in user)) return true; // legacy
    return false;
}

function shouldSkipEmailVerify() {
    return String(process.env.SKIP_EMAIL_VERIFY || 'false').toLowerCase() === 'true';
}

function frontendUrl() {
    return String(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
}

async function createVerificationToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    email = email.toLowerCase();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const expires = new Date(Date.now() + 86400000).toISOString().slice(0, 19).replace('T', ' ');

    const pool = getPool();
    await pool.query('DELETE FROM email_verification_tokens WHERE email = ?', [email]);
    await pool.query('INSERT INTO email_verification_tokens (email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)', [email, hash, expires, now]);

    const verifyUrl = `${frontendUrl()}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    return { token, verifyUrl };
}

async function sendVerificationEmail(email, name = null) {
    if (shouldSkipEmailVerify()) return true;

    const displayName = name && name.trim() ? name.trim() : 'there';
    const { verifyUrl } = await createVerificationToken(email);

    if (!(await emailService.isEmailEnabled())) {
        console.error(`[Auth] Email verification link for ${email}: ${verifyUrl}`);
        return false;
    }

    const result = await emailService.sendEmailVerification(email, displayName, verifyUrl);
    if (!result.ok) {
        console.error(`[Auth] Verification email failed for ${email}: ${result.error || 'unknown'}`);
        console.error(`[Auth] Fallback verification link: ${verifyUrl}`);
        return false;
    }
    return true;
}

async function markUserEmailVerified(email) {
    const user = await repo.findByEmail(email);
    if (!user) return false;
    await repo.update(user.id, { emailVerified: true, emailVerifiedAt: new Date().toISOString() });
    return true;
}

function issueCustomerToken(user, remember = false) {
    return signToken({ role: 'customer', userId: user.id, email: user.email }, remember ? '7d' : '24h');
}

// ── Register ─────────────────────────────────────────────────────────────

router.post('/auth/register', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');
    const name = String(body.name || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'Enter a valid email address', 400);
    if (!name) return sendError(res, 'Full name is required', 400);
    if (password.length < 8) return sendError(res, 'Password must be at least 8 characters', 400);
    if (!confirmPassword || password !== confirmPassword) return sendError(res, 'Passwords do not match', 400);

    if (!(await checkRateLimit(`register-${clientIp(req)}`, 10, 3600))) return sendError(res, 'Too many registration attempts. Try again later.', 429);

    const existing = await repo.findByEmail(email);
    if (existing) {
        if (existing.passwordHash) return sendError(res, 'An account with this email already exists. Try signing in.', 409);

        const updates = {
            passwordHash: bcrypt.hashSync(password, 10),
            emailVerified: true,
            emailVerifiedAt: existing.emailVerifiedAt || new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };
        if (name && !existing.name) updates.name = name;
        const updated = (await repo.update(existing.id, updates)) || existing;
        const token = issueCustomerToken(updated);
        return sendJson(res, { role: 'customer', token, user: publicUser(updated) });
    }

    const now = new Date().toISOString();
    const skipVerify = shouldSkipEmailVerify();
    const newUser = {
        id: generateId('user'),
        email,
        name,
        passwordHash: bcrypt.hashSync(password, 10),
        emailVerified: skipVerify,
        emailVerifiedAt: skipVerify ? now : null,
        createdAt: now,
        lastLogin: null,
    };

    await repo.create(newUser);

    if (!skipVerify) {
        const sent = await sendVerificationEmail(email, name);
        if (!sent) return sendError(res, 'Account created but we could not send the verification email. Try signing in and request a new link.', 503);
        return sendJson(res, {
            pendingVerification: true, email, message: 'Check your email for a verification link to complete sign-in.', verificationEmailSent: true,
        }, 201);
    }

    await repo.update(newUser.id, { lastLogin: now });
    const created = (await repo.getById(newUser.id)) || newUser;
    const token = issueCustomerToken(created);
    sendJson(res, { role: 'customer', token, user: publicUser(created), verificationEmailSent: false }, 201);
}, 'Registration failed'));

// ── Login ────────────────────────────────────────────────────────────────

router.post('/auth/login', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');
    const remember = Boolean(body.rememberMe);

    if (!email || !password) return sendError(res, 'Email and password are required', 400);
    if (!(await checkRateLimit(`login-${clientIp(req)}`, 20, 900))) return sendError(res, 'Too many login attempts. Try again later.', 429);

    const adminDevPass = process.env.ADMIN_DEV_PASSWORD || '';
    if (adminDevPass && adminEmails().includes(email) && password === adminDevPass) {
        const token = signToken({ role: 'admin', email });
        return sendJson(res, { role: 'admin', token, redirect: process.env.ADMIN_PATH || '/chikit-studio', user: { email } });
    }

    const user = await repo.findByEmail(email);
    if (!user) return sendError(res, 'Invalid email or password', 401);
    if (!user.passwordHash) return sendError(res, 'This account uses Google sign-in. Continue with Google, or use Forgot password to set a password.', 401);
    if (user.isBlocked) return sendError(res, 'Your account has been blocked. Please contact support.', 403);
    if (!bcrypt.compareSync(password, user.passwordHash)) return sendError(res, 'Invalid email or password', 401);
    if (!isEmailVerified(user)) {
        return sendJson(res, {
            error: 'Please verify your email before signing in. Check your inbox or request a new verification link.',
            code: 'EMAIL_NOT_VERIFIED', email,
        }, 403);
    }

    const updatedUser = (await repo.update(user.id, { lastLogin: new Date().toISOString() })) || user;
    const token = issueCustomerToken(updatedUser, remember);
    sendJson(res, { role: 'customer', token, user: publicUser(updatedUser) });
}, 'Login failed'));

// ── Forgot / reset password ─────────────────────────────────────────────

router.post('/auth/forgot-password', asyncRoute(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'Enter a valid email address', 400);
    if (!(await checkRateLimit(`forgot-${clientIp(req)}`, 5, 3600))) return sendError(res, 'Too many reset requests. Try again later.', 429);

    const user = await repo.findByEmail(email);
    if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const pool = getPool();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const expires = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' ');

        await pool.query('DELETE FROM password_reset_tokens WHERE email = ?', [email]);
        await pool.query('INSERT INTO password_reset_tokens (email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)', [email, crypto.createHash('sha256').update(token).digest('hex'), expires, now]);

        const resetUrl = `${frontendUrl()}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
        const name = String(user.name || '').trim() || 'there';

        const result = await emailService.sendPasswordReset(email, name, resetUrl);
        if (!result.ok) {
            console.error(`[Auth] Password reset email failed for ${email}: ${result.error || 'unknown'}`);
            console.error(`[Auth] Fallback reset link: ${resetUrl}`);
        }
    }

    sendJson(res, { message: 'If an account exists with that email, a reset link has been sent.' });
}, 'Failed to process reset request'));

router.post('/auth/reset-password', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    const token = String(body.token || '');
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !token) return sendError(res, 'Invalid reset request', 400);
    if (password.length < 8) return sendError(res, 'Password must be at least 8 characters', 400);
    if (!confirmPassword || password !== confirmPassword) return sendError(res, 'Passwords do not match', 400);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM password_reset_tokens WHERE email = ? AND token_hash = ? LIMIT 1', [email, tokenHash]);
    const row = rows[0];
    if (!row) return sendError(res, 'Invalid or expired reset link', 400);

    const expires = new Date(row.expires_at).getTime();
    if (expires && expires < Date.now()) return sendError(res, 'Reset link has expired. Request a new one.', 400);

    const user = await repo.findByEmail(email);
    if (!user) return sendError(res, 'Account not found', 404);

    await repo.update(user.id, { passwordHash: bcrypt.hashSync(password, 10), emailVerified: true, emailVerifiedAt: new Date().toISOString() });
    await pool.query('DELETE FROM password_reset_tokens WHERE email = ? AND token_hash = ?', [email, tokenHash]);

    sendJson(res, { message: 'Password updated. You can sign in with your new password.' });
}, 'Failed to reset password'));

// ── Verify email ─────────────────────────────────────────────────────────

async function completeEmailVerificationLogin(res, user, message) {
    const updated = (await repo.update(user.id, { lastLogin: new Date().toISOString() })) || user;
    const token = issueCustomerToken(updated);
    sendJson(res, { message, role: 'customer', token, user: publicUser(updated) });
}

router.post('/auth/verify-email', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    const token = String(body.token || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !token) return sendError(res, 'Invalid verification link', 400);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM email_verification_tokens WHERE email = ? AND token_hash = ? LIMIT 1', [email, tokenHash]);
    const row = rows[0];

    if (!row) {
        const user = await repo.findByEmail(email);
        if (user && isEmailVerified(user)) return completeEmailVerificationLogin(res, user, 'Email already verified. You are signed in.');
        return sendError(res, 'Invalid or expired verification link', 400);
    }

    const expires = new Date(row.expires_at).getTime();
    if (expires && expires < Date.now()) return sendError(res, 'Verification link has expired. Request a new one from your account.', 400);

    if (!(await markUserEmailVerified(email))) return sendError(res, 'Account not found', 404);
    await pool.query('DELETE FROM email_verification_tokens WHERE email = ?', [email]);

    const user = await repo.findByEmail(email);
    if (!user) return sendError(res, 'Account not found', 404);

    await completeEmailVerificationLogin(res, user, 'Email verified successfully. You are now signed in.');
}, 'Failed to verify email'));

router.post('/auth/resend-verification', asyncRoute(async (req, res) => {
    const emailFromBody = String(req.body?.email || '').toLowerCase().trim();
    let user = null;

    const payload = optionalCustomer(req);
    if (payload) user = await repo.getById(String(payload.userId || ''));

    if (!user && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFromBody)) {
        user = await repo.findByEmail(emailFromBody);
        if (!user) return sendJson(res, { message: 'If an account exists with that email, a verification link has been sent.' });
    }

    if (!user) return sendError(res, 'Provide your email address to resend the verification link', 400);
    if (isEmailVerified(user)) return sendJson(res, { message: 'Your email is already verified. You can sign in.' });

    const rateKey = `resend-verify-${user.id || emailFromBody}`;
    if (!(await checkRateLimit(rateKey, 5, 3600))) return sendError(res, 'Too many verification emails. Try again later.', 429);

    const sent = await sendVerificationEmail(user.email || '', user.name ?? null);
    if (!sent && !shouldSkipEmailVerify()) return sendError(res, 'Could not send verification email. Please try again later.', 503);

    sendJson(res, { message: 'Verification email sent. Check your inbox (and spam folder).' });
}, 'Failed to resend verification'));

// ── /me ──────────────────────────────────────────────────────────────────

router.get('/auth/me', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const user = await repo.getById(String(payload.userId || ''));
    if (!user) return sendError(res, 'User not found', 404);
    sendJson(res, publicUser(user));
}, 'Failed to fetch account'));

// ── Google OAuth ─────────────────────────────────────────────────────────

function shouldGrantAdminRole(email) {
    if ((process.env.ADMIN_PANEL_LOGIN || 'false') !== 'true') return false;
    return adminEmails().includes(email.toLowerCase());
}

router.post('/auth/google', asyncRoute(async (req, res) => {
    const credential = req.body?.credential;
    if (!credential) return sendError(res, 'Invalid request', 400);
    if (!process.env.GOOGLE_CLIENT_ID) return sendError(res, 'Google login is not configured. Set GOOGLE_CLIENT_ID in config.json', 503);
    if (!(await isGoogleSignInEnabled())) return sendError(res, 'Google sign-in is currently disabled', 503);

    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) return sendError(res, 'Google account has no email', 401);

        const email = payload.email.toLowerCase();
        const name = payload.name || payload.given_name || null;
        const avatar = payload.picture || null;

        if (shouldGrantAdminRole(email)) {
            const token = signToken({ role: 'admin', email });
            return sendJson(res, { role: 'admin', token, redirect: process.env.ADMIN_PATH || '/chikit-studio', user: { email, name, avatar } });
        }

        const existing = await repo.findByEmail(email);
        const now = new Date().toISOString();
        let user;

        if (!existing) {
            user = await repo.create({ id: generateId('user'), email, name, avatar, emailVerified: true, emailVerifiedAt: now, createdAt: now, lastLogin: now });
        } else {
            if (existing.isBlocked) return sendError(res, 'Your account has been blocked. Please contact support.', 403);
            const updates = { lastLogin: now, emailVerified: true, emailVerifiedAt: existing.emailVerifiedAt || now };
            if (name) updates.name = name;
            if (avatar) updates.avatar = avatar;
            user = (await repo.update(existing.id, updates)) || existing;
        }

        const token = signToken({ role: 'customer', userId: user.id, email: user.email });
        sendJson(res, { role: 'customer', token, redirect: '/', user: publicUser(user) });
    } catch (err) {
        console.error('[Google Auth]', err?.message || err);
        sendError(res, 'Google sign-in failed. Please try again.', 401);
    }
}, 'Google sign-in failed'));

// ── Admin username/password login ───────────────────────────────────────

router.post('/auth/admin/login', asyncRoute(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return sendError(res, 'Username and password required', 400);
    if (!(await checkRateLimit(`admin-${clientIp(req)}`))) return sendError(res, 'Too many login attempts. Try again later.', 429);

    const adminUser = process.env.ADMIN_USERNAME || 'chikit_admin';
    const adminPassHash = process.env.ADMIN_PASSWORD_HASH || null;

    const validUser = username === adminUser;

    if (!adminPassHash) {
        console.error('[Admin Login] ADMIN_PASSWORD_HASH is not set. Configure it in config.json');
        return sendError(res, 'Admin login is not configured on this server.', 503);
    }

    const validPass = bcrypt.compareSync(password, adminPassHash);
    if (!validUser || !validPass) return sendError(res, 'Invalid credentials', 401);

    const token = signToken({ role: 'admin' });
    sendJson(res, { token, role: 'admin' });
}, 'Admin login failed'));

// ── Phone OTP ────────────────────────────────────────────────────────────

function normalizePhoneDigits(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length > 10) digits = digits.slice(-10);
    return digits;
}

async function markPhoneVerified(res, userId, phone10) {
    const user = await repo.getById(userId);
    if (!user) return sendError(res, 'User not found', 404);
    await repo.update(userId, { phone: phone10, phoneVerified: true, phoneVerifiedAt: new Date().toISOString() });
    sendJson(res, { phone: phone10, phoneVerified: true });
}

router.post('/auth/verify-phone', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const body = req.body || {};
    const accessToken = String(body.accessToken || '');
    const phone = normalizePhoneDigits(body.phone);

    if (phone.length < 10) return sendError(res, 'Valid phone number required', 400);

    const skipVerify = await otpConfig.shouldSkipOtpVerify();

    if (!skipVerify) {
        const tokenResult = await msg91.verifyAccessToken(accessToken);
        if (!tokenResult.ok) {
            let error = tokenResult.error || 'Phone verification failed. Please try again.';
            const outboundIp = await serverOutboundIp();
            if (outboundIp && error.toLowerCase().includes('whitelist')) error += ` Whitelist IP: ${outboundIp}`;
            await logOtp('verify_phone_failed', { phone, userId: payload.userId || '', status: 'token_rejected', httpCode: tokenResult.httpCode ?? null, msg91Code: tokenResult.msg91Code ?? null, detail: error });
            return sendError(res, error, 401);
        }
    }

    await logOtp('verify_phone_ok', { phone, userId: payload.userId || '', status: 'verified' });
    await markPhoneVerified(res, payload.userId || '', phone);
}, 'Failed to verify phone'));

router.post('/auth/send-phone-otp', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const digits = normalizePhoneDigits(req.body?.phone);
    if (digits.length < 10) return sendError(res, 'Enter a valid 10-digit mobile number', 400);

    const userId = payload.userId || '';
    const rateKey = `phone-otp-send-${userId}`;
    const maxAttempts = otpConfig.maxOtpSendAttempts();

    if (!(await checkRateLimit(rateKey, maxAttempts, 900))) {
        const wait = await retryAfterSeconds(rateKey);
        const mins = wait ? Math.max(1, Math.ceil(wait / 60)) : 15;
        await logOtp('send_blocked_rate_limit', { phone: digits, userId, status: 'rate_limited', detail: `retry in ~${mins} min` });
        return sendError(res, `Too many OTP requests. Please wait about ${mins} minute(s) and try again.`, 429);
    }

    const skipVerify = await otpConfig.shouldSkipOtpVerify();
    await logOtp('send_request', { phone: digits, userId, status: 'started', skipVerify, otpMode: otpConfig.otpMode() });

    if (skipVerify) {
        await logOtp('send_ok', { phone: digits, userId, status: 'dev_skip', detail: 'SKIP_PHONE_VERIFY=true — no SMS sent' });
        return sendJson(res, { message: 'Phone verification skipped (dev mode)', devMode: true });
    }

    const result = await msg91.sendPhoneOtp(digits);
    if (!result.ok) {
        const outboundIp = await serverOutboundIp();
        await logOtp('send_failed', { phone: digits, userId, status: 'failed', httpCode: result.httpCode ?? null, msg91Code: result.msg91Code ?? null, requestId: result.requestId ?? null, serverIp: outboundIp, detail: result.error || 'unknown' });
        return msg91ServiceError(res, result, 'Could not send OTP');
    }

    await logOtp('send_ok', { phone: digits, userId, status: 'sent', requestId: result.requestId ?? null });

    const response = { message: 'OTP sent to your mobile number' };
    if (result.requestId) response.requestId = result.requestId;
    sendJson(res, response);
}, 'Failed to send OTP'));

router.post('/auth/resend-phone-otp', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const digits = normalizePhoneDigits(req.body?.phone);
    if (digits.length < 10) return sendError(res, 'Enter a valid 10-digit mobile number', 400);

    const userId = payload.userId || '';
    const rateKey = `phone-otp-resend-${userId}`;

    if (!(await checkRateLimit(rateKey, 5, 900))) {
        const wait = await retryAfterSeconds(rateKey);
        const mins = wait ? Math.max(1, Math.ceil(wait / 60)) : 15;
        return sendError(res, `Too many resend attempts. Please wait about ${mins} minute(s).`, 429);
    }

    const skipVerify = await otpConfig.shouldSkipOtpVerify();
    await logOtp('resend_request', { phone: digits, userId, status: 'started', skipVerify });

    if (skipVerify) {
        await logOtp('resend_ok', { phone: digits, userId, status: 'dev_skip' });
        return sendJson(res, { message: 'OTP resent (dev mode — use 000000 to verify)', devMode: true });
    }

    let result = await msg91.retryPhoneOtp(digits, 'text');
    if (!result.ok) {
        const msg91Code = String(result.msg91Code ?? '');
        const errorLower = String(result.error || '').toLowerCase();
        if (msg91Code === '418' || errorLower.includes('whitelist')) {
            await logOtp('resend_retry_fallback', { phone: digits, userId, status: 'fallback_to_send', detail: 'retry blocked by MSG91 IP security; issuing fresh send' });
            result = await msg91.sendPhoneOtp(digits);
        }
    }
    if (!result.ok) {
        await logOtp('resend_failed', { phone: digits, userId, status: 'failed', httpCode: result.httpCode ?? null, msg91Code: result.msg91Code ?? null, detail: result.error || 'unknown' });
        return msg91ServiceError(res, result, 'Could not resend OTP');
    }

    await logOtp('resend_ok', { phone: digits, userId, status: 'resent' });
    sendJson(res, { message: 'OTP resent to your mobile number' });
}, 'Failed to resend OTP'));

router.post('/auth/confirm-phone-otp', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const body = req.body || {};
    const phoneRaw = String(body.phone || '');
    const otp = String(body.otp || '');
    const digits = normalizePhoneDigits(phoneRaw);

    if (digits.length < 10) return sendError(res, 'Valid phone number required', 400);

    const skipVerify = await otpConfig.shouldSkipOtpVerify();

    if (skipVerify) {
        await logOtp('confirm_ok', { phone: digits, userId: payload.userId || '', status: 'dev_skip_auto', detail: 'SKIP_PHONE_VERIFY — no OTP required' });
        return markPhoneVerified(res, payload.userId || '', digits);
    }

    await logOtp('confirm_request', { phone: digits, userId: payload.userId || '', status: 'verifying' });
    const result = await msg91.verifyPhoneOtp(phoneRaw, otp);
    if (!result.ok) {
        const outboundIp = await serverOutboundIp();
        await logOtp('confirm_failed', { phone: digits, userId: payload.userId || '', status: 'msg91_rejected', httpCode: result.httpCode ?? null, msg91Code: result.msg91Code ?? null, serverIp: outboundIp, detail: result.error || 'invalid' });
        if (isMsg91ServiceFailure(result)) return msg91ServiceError(res, result, 'Could not verify OTP');
        return sendError(res, result.error || 'Invalid OTP', 401);
    }

    await logOtp('confirm_ok', { phone: digits, userId: payload.userId || '', status: 'verified' });
    await markPhoneVerified(res, payload.userId || '', digits);
}, 'Failed to confirm OTP'));

router.get('/auth/otp-logs', asyncRoute(async (req, res) => {
    const isDev = (process.env.APP_ENV || '') === 'development';
    let logs = await recentOtpLogs(50);

    if (!isDev) {
        requireAdmin(req);
    } else {
        const payload = await requireCustomer(req);
        const userId = String(payload.userId || '');
        logs = logs.filter((log) => String(log.userId || '') === userId);
    }

    sendJson(res, { logs, hint: '418 from MSG91 = server IP not whitelisted in MSG91 Dashboard → Authkey → IP Security.' });
}, 'Failed to fetch OTP logs'));

export default router;
