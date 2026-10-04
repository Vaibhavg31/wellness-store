import jwt from 'jsonwebtoken';
import { HttpError } from './response.js';
import { UserRepository } from '../repositories/userRepository.js';

/**
 * JWT auth — same secret, HS256 algorithm and payload shape as
 * backend/lib/Auth.php, so tokens are interchangeable between the two
 * backends during the migration.
 */
function secret() {
    return process.env.JWT_SECRET || 'chikit-dev-secret-change-in-production';
}

const EXPIRY_SECONDS = { '24h': 86400, '7d': 604800 };

export function signToken(payload, expiresIn = '24h') {
    const seconds = EXPIRY_SECONDS[expiresIn] ?? 86400;
    const now = Math.floor(Date.now() / 1000);
    // noTimestamp:true would strip the iat we just set (not just skip adding
    // its own), so it's omitted — iat/exp here are set manually, matching
    // Auth.php's signToken() exactly instead of going through jsonwebtoken's
    // own expiresIn option.
    return jwt.sign({ ...payload, iat: now, exp: now + seconds }, secret(), { algorithm: 'HS256' });
}

export function verifyToken(token) {
    return jwt.verify(token, secret(), { algorithms: ['HS256'] });
}

export function getBearerToken(req) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) return header.slice(7);
    return null;
}

export function requireAdmin(req) {
    const token = getBearerToken(req);
    if (!token) throw new HttpError('Unauthorized', 401);
    try {
        const payload = verifyToken(token);
        if (payload.role !== 'admin') throw new HttpError('Forbidden', 403);
        return payload;
    } catch (err) {
        if (err instanceof HttpError) throw err;
        throw new HttpError('Invalid or expired token', 401);
    }
}

export function optionalCustomer(req) {
    const token = getBearerToken(req);
    if (!token) return null;
    try {
        const payload = verifyToken(token);
        if (payload.role !== 'customer' || !payload.userId) return null;
        return payload;
    } catch {
        return null;
    }
}

export async function requireCustomer(req) {
    const token = getBearerToken(req);
    if (!token) throw new HttpError('Please sign in to continue', 401);
    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        throw new HttpError('Invalid or expired session. Please sign in again.', 401);
    }
    if (payload.role !== 'customer' || !payload.userId) {
        throw new HttpError('Customer account required', 403);
    }
    await rejectIfBlocked(String(payload.userId));
    return payload;
}

export async function rejectIfBlocked(userId) {
    const repo = new UserRepository();
    if (await repo.isBlocked(userId)) {
        throw new HttpError('Your account has been blocked. Please contact support.', 403);
    }
}
