import { Router } from 'express';
import { requireAdmin, optionalCustomer } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { CouponRepository } from '../repositories/couponRepository.js';
import { CouponService } from '../services/couponService.js';

const router = Router();
const repo = new CouponRepository();
const service = new CouponService();

/**
 * Admin input rules for a coupon, checked on the whole coupon (existing values + changes) so a half-valid edit cannot slip through.
 * Throws a 400 with a sentence the admin form can show as it is.
 */
function assertValidCoupon(c) {
    if (!/^[A-Z0-9_-]{2,40}$/.test(c.code)) throw new HttpError('Coupon code must be 2-40 letters, numbers, dashes or underscores (no spaces)', 400);
    const money = (v, label) => { if (!Number.isFinite(v) || v < 0 || v > 10000000) throw new HttpError(`${label} must be a number from 0 to 10,000,000`, 400); };
    money(c.value, 'Discount value'); money(c.minOrderAmount, 'Minimum order'); money(c.maxDiscount, 'Maximum discount');
    if (c.type === 'percent' && (c.value <= 0 || c.value > 100)) throw new HttpError('A percentage coupon must be between 1% and 100%', 400);
    if (c.type === 'flat' && c.value <= 0) throw new HttpError('A flat coupon needs an amount above 0', 400);
    for (const [v, label] of [[c.maxUses, 'Total uses'], [c.maxUsesPerUser, 'Uses per customer']]) {
        if (!Number.isInteger(v) || v < 0 || v > 1000000) throw new HttpError(`${label} must be a whole number (0 means unlimited)`, 400);
    }
    const when = (v, label) => { if (!v) return null; const t = Date.parse(v); if (Number.isNaN(t)) throw new HttpError(`${label} is not a valid date`, 400); return t; };
    const start = when(c.startsAt, 'Start date'), end = when(c.expiresAt, 'Expiry date');
    if (start !== null && end !== null && end <= start) throw new HttpError('The expiry date must be after the start date', 400);
}

/** Coerces the numeric fields the same way the repository stores them, so validation sees what will be saved. */
const numberOf = (v, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : Number(v));
const intOf = (v, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : (Number.isInteger(Number(v)) ? Number(v) : NaN));

router.get('/coupons/public', asyncRoute(async (req, res) => {
    const payload = optionalCustomer(req);
    const userId = payload ? String(payload.userId || '') : null;
    const all = await repo.getPublic();
    const flags = await Promise.all(all.map((c) => service.listableFor(c, userId)));
    sendJson(res, all.filter((_, i) => flags[i]).map((c) => service.publicListShape(c)));
}, 'Failed to fetch coupons'));

router.post('/coupons/validate', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const payload = optionalCustomer(req);
    const userId = payload ? String(payload.userId || '') : null;
    sendJson(res, await service.validate(String(body.code || ''), Number(body.subtotal || 0), userId, body.eligibleSubtotal));
}, 'Failed to validate coupon'));

router.post('/coupons/auto-apply', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const payload = optionalCustomer(req);
    const userId = payload ? String(payload.userId || '') : null;
    const result = await service.resolveAutoApply(Number(body.subtotal || 0), userId, body.eligibleSubtotal);
    sendJson(res, result ?? { valid: false, message: 'No eligible auto offer' });
}, 'Failed to resolve auto offer'));

router.get('/coupons/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const coupons = await Promise.all((await repo.getAll()).map((c) => service.enrichWithStats(c)));
    sendJson(res, coupons);
}, 'Failed to fetch coupons'));

router.get('/coupons/admin/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const coupon = await repo.getById(req.params.id);
    if (!coupon) return sendError(res, 'Coupon not found', 404);
    sendJson(res, await service.enrichWithStats(coupon));
}, 'Failed to fetch coupon'));

router.post('/coupons', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    const code = CouponService.normalizeCode(body.code || '');
    const type = body.type || 'percent';

    if (!code) return sendError(res, 'Coupon code is required', 400);
    if (!CouponService.TYPES.includes(type)) return sendError(res, 'Invalid coupon type', 400);

    const audience = body.audience || 'everyone';
    if (!CouponService.AUDIENCES.includes(audience)) return sendError(res, 'Invalid coupon audience', 400);

    if (await repo.codeExists(code)) return sendError(res, 'A coupon with this code already exists', 409);

    const now = new Date().toISOString();
    const coupon = {
        id: generateId('coupon'),
        code,
        title: String(body.title ?? code).trim(),
        description: String(body.description ?? '').trim(),
        type,
        value: numberOf(body.value),
        minOrderAmount: numberOf(body.minOrderAmount),
        maxDiscount: numberOf(body.maxDiscount),
        maxUses: intOf(body.maxUses),
        maxUsesPerUser: intOf(body.maxUsesPerUser),
        usageCount: 0,
        isEnabled: Boolean(body.isEnabled ?? true),
        showOnWebsite: Boolean(body.showOnWebsite ?? true),
        autoApply: Boolean(body.autoApply ?? false),
        audience,
        minPreviousOrders: Math.max(1, Number.parseInt(body.minPreviousOrders ?? 1, 10)),
        startsAt: String(body.startsAt ?? '').trim(),
        expiresAt: String(body.expiresAt ?? '').trim(),
        createdAt: now,
        updatedAt: now,
    };

    if (type === 'free_delivery') coupon.value = 0;
    assertValidCoupon(coupon);

    sendJson(res, await repo.create(coupon), 201);
}, 'Failed to create coupon'));

router.put('/coupons/:id/toggle', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const existing = await repo.getById(req.params.id);
    if (!existing) return sendError(res, 'Coupon not found', 404);

    const updated = await repo.update(req.params.id, { isEnabled: !existing.isEnabled, updatedAt: new Date().toISOString() });
    sendJson(res, await service.enrichWithStats(updated));
}, 'Failed to toggle coupon'));

router.put('/coupons/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const existing = await repo.getById(req.params.id);
    if (!existing) return sendError(res, 'Coupon not found', 404);

    const body = req.body || {};
    const allowed = ['code', 'title', 'description', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'maxUses',
        'maxUsesPerUser', 'isEnabled', 'showOnWebsite', 'autoApply', 'audience', 'minPreviousOrders', 'startsAt', 'expiresAt'];
    const changes = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if ('code' in changes) {
        const code = CouponService.normalizeCode(changes.code);
        if (!code) return sendError(res, 'Coupon code cannot be empty', 400);
        if (await repo.codeExists(code, req.params.id)) return sendError(res, 'A coupon with this code already exists', 409);
        changes.code = code;
    }

    if ('type' in changes && !CouponService.TYPES.includes(changes.type)) return sendError(res, 'Invalid coupon type', 400);
    if ('audience' in changes && !CouponService.AUDIENCES.includes(changes.audience)) return sendError(res, 'Invalid coupon audience', 400);
    if ('minPreviousOrders' in changes) changes.minPreviousOrders = Math.max(1, Number.parseInt(changes.minPreviousOrders, 10));

    for (const key of ['value', 'minOrderAmount', 'maxDiscount']) if (key in changes) changes[key] = numberOf(changes[key]);
    for (const key of ['maxUses', 'maxUsesPerUser']) if (key in changes) changes[key] = intOf(changes[key]);
    const merged = { ...existing, ...changes };
    if (merged.type === 'free_delivery') changes.value = merged.value = 0;
    assertValidCoupon(merged);

    changes.updatedAt = new Date().toISOString();
    const updated = await repo.update(req.params.id, changes);
    if (!updated) return sendError(res, 'Coupon not found', 404);
    sendJson(res, await service.enrichWithStats(updated));
}, 'Failed to update coupon'));

router.delete('/coupons/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Coupon not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete coupon'));

export default router;
