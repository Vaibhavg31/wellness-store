import { Router } from 'express';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { checkRateLimit } from '../lib/rateLimiter.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { CouponRepository } from '../repositories/couponRepository.js';
import { CouponService } from '../services/couponService.js';

const router = Router();
const settings = new SettingsRepository();
const coupons = new CouponRepository();
const couponService = new CouponService();

const SPINS_PER_IP_PER_DAY = 5;

// req.ip honours Express's "trust proxy" setting; reading x-forwarded-for directly would let a client fake its address.
const clientIp = (req) => req.ip || req.socket.remoteAddress || '0.0.0.0';

/**
 * Spin-the-wheel. The server — not the browser — decides the outcome, so a prize can't be picked by editing the
 * page. Segments with a coupon only win while that coupon is still valid (enabled, in date, not used up);
 * otherwise they are skipped for this spin. The coupon code is only ever sent to the winner.
 */
router.post('/spin', asyncRoute(async (req, res) => {
    if (!(await checkRateLimit(`spin-${clientIp(req)}`, SPINS_PER_IP_PER_DAY, 86400))) {
        return sendError(res, 'You have used all your spins for today. Please try again tomorrow.', 429);
    }

    const { popup, extras } = await settings.get();
    const segments = extras?.spin?.segments ?? [];
    if (!popup?.enabled || popup.type !== 'spin' || segments.length < 2) return sendError(res, 'The wheel is not available right now.', 404);

    const candidates = [];
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        if (segment.weight <= 0) continue;
        if (!segment.couponId) {
            candidates.push({ index, segment, code: '' });
            continue;
        }
        const coupon = await coupons.getById(segment.couponId);
        if (!coupon?.isEnabled) continue;
        const check = await couponService.validate(coupon.code, 1e9, null);
        if (check.valid) candidates.push({ index, segment, code: coupon.code });
    }

    // Nothing eligible (all prizes expired, weights zero): land on a no-prize slice rather than fail the visitor.
    const pool = candidates.length > 0 ? candidates : segments
        .map((segment, index) => ({ index, segment, code: '' }))
        .filter((c) => !c.segment.couponId);
    if (pool.length === 0) return sendError(res, 'The wheel is not available right now.', 404);

    const total = pool.reduce((sum, c) => sum + Math.max(1, c.segment.weight), 0);
    let roll = Math.random() * total;
    const picked = pool.find((c) => (roll -= Math.max(1, c.segment.weight)) < 0) ?? pool.at(-1);

    sendJson(res, { index: picked.index, label: picked.segment.label, win: Boolean(picked.code), code: picked.code });
}, 'Failed to spin'));

export default router;
