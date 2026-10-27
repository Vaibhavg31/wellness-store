import { Router } from 'express';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { checkRateLimit } from '../lib/rateLimiter.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { CouponRepository } from '../repositories/couponRepository.js';
import { NewsletterRepository } from '../repositories/newsletterRepository.js';
import { CouponService } from '../services/couponService.js';

const router = Router();
const settings = new SettingsRepository();
const coupons = new CouponRepository();
const newsletter = new NewsletterRepository();
const couponService = new CouponService();

const UNLOCKS_PER_IP_PER_HOUR = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// req.ip honours Express's "trust proxy" setting; reading x-forwarded-for directly would let a client fake its address.
const clientIp = (req) => req.ip || req.socket.remoteAddress || '0.0.0.0';

/**
 * "Unlock your code" for the sticky offer tab. The coupon code is NOT in the public settings: it is only returned
 * here, after the (optional) email step, and only while the coupon is still valid. A given email is added to the
 * newsletter list (source "offer-tab").
 */
router.post('/offer/unlock', asyncRoute(async (req, res) => {
    if (!(await checkRateLimit(`offer-${clientIp(req)}`, UNLOCKS_PER_IP_PER_HOUR, 3600))) {
        return sendError(res, 'Too many attempts. Please try again in a little while.', 429);
    }

    const { extras } = await settings.get();
    const offer = extras?.offerTab;
    if (!offer?.enabled || !offer.couponId) return sendError(res, 'This offer is not available right now.', 404);

    const email = String(req.body?.email || '').toLowerCase().trim();
    if (offer.requireEmail) {
        if (!EMAIL_PATTERN.test(email)) return sendError(res, 'Please enter a valid email address.', 400);
    }

    const coupon = await coupons.getById(offer.couponId);
    const check = coupon?.isEnabled ? await couponService.validate(coupon.code, 1e9, null) : { valid: false };
    if (!check.valid) return sendError(res, 'This offer has ended. Please check back soon.', 410);

    if (offer.requireEmail && !(await newsletter.findByEmail(email))) {
        await newsletter.create({ id: generateId('sub'), email, source: 'offer-tab', createdAt: new Date().toISOString() });
    }

    sendJson(res, {
        code: coupon.code,
        label: check.coupon?.label ?? coupon.title ?? '',
        description: coupon.description ?? '',
        minOrderAmount: coupon.minOrderAmount ?? 0,
    });
}, 'Failed to unlock the offer'));

export default router;
