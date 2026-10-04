import { Router } from 'express';
import { requireAdmin, optionalCustomer } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { CouponRepository } from '../repositories/couponRepository.js';
import { CouponService } from '../services/couponService.js';

const router = Router();
const repo = new CouponRepository();
const service = new CouponService();

router.get('/coupons/public', asyncRoute(async (req, res) => {
    const coupons = (await repo.getPublic()).map((c) => service.publicListShape(c));
    sendJson(res, coupons);
}, 'Failed to fetch coupons'));

router.post('/coupons/validate', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const payload = optionalCustomer(req);
    const userId = payload ? String(payload.userId || '') : null;
    sendJson(res, await service.validate(String(body.code || ''), Number(body.subtotal || 0), userId));
}, 'Failed to validate coupon'));

router.post('/coupons/auto-apply', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const payload = optionalCustomer(req);
    const userId = payload ? String(payload.userId || '') : null;
    const result = await service.resolveAutoApply(Number(body.subtotal || 0), userId);
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
        value: Number(body.value ?? 0),
        minOrderAmount: Number(body.minOrderAmount ?? 0),
        maxDiscount: Number(body.maxDiscount ?? 0),
        maxUses: Number.parseInt(body.maxUses ?? 0, 10),
        maxUsesPerUser: Number.parseInt(body.maxUsesPerUser ?? 0, 10),
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
