import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { BannerRepository } from '../repositories/bannerRepository.js';

const router = Router();
const repo = new BannerRepository();
const TARGETS = ['slider', 'stacked', 'both', 'product'];

router.get('/banners', asyncRoute(async (req, res) => {
    const target = req.query.target ? String(req.query.target) : null;

    if (target === 'product') {
        const productId = req.query.productId ? String(req.query.productId).trim() : '';
        if (!productId) return sendJson(res, []);
        return sendJson(res, await repo.getPublishedForProduct(productId));
    }

    sendJson(res, await repo.getPublished(target));
}, 'Failed to fetch banners'));

router.get('/banners/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.getAll());
}, 'Failed to fetch banners'));

router.post('/banners', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    if (!body.image) return sendError(res, 'Banner image is required', 400);

    let displayTarget = String(body.displayTarget || 'both');
    if (!TARGETS.includes(displayTarget)) displayTarget = 'both';

    const productId = String(body.productId || '').trim();
    if (displayTarget === 'product' && !productId) return sendError(res, 'Pick a product for a product-page banner', 400);

    const banner = {
        title: body.title ?? '',
        subtitle: body.subtitle ?? '',
        image: body.image,
        ctaLabel: body.ctaLabel ?? '',
        ctaHref: body.ctaHref ?? '',
        isEnabled: Boolean(body.isEnabled ?? true),
        displayTarget,
        productId: displayTarget === 'product' ? productId : null,
        order: Number.parseInt(body.order ?? 99, 10),
    };

    sendJson(res, await repo.create(banner), 201);
}, 'Failed to create banner'));

router.put('/banners/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const allowed = ['title', 'subtitle', 'image', 'ctaLabel', 'ctaHref', 'isEnabled', 'displayTarget', 'productId', 'order'];
    const body = req.body || {};
    const changes = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if ('displayTarget' in changes && !TARGETS.includes(changes.displayTarget)) delete changes.displayTarget;

    if (changes.displayTarget === 'product') {
        const productId = String(changes.productId || '').trim();
        if (!productId) return sendError(res, 'Pick a product for a product-page banner', 400);
        changes.productId = productId;
    } else if ('displayTarget' in changes) {
        changes.productId = null;
    }

    const updated = await repo.update(req.params.id, changes);
    if (!updated) return sendError(res, 'Banner not found', 404);
    sendJson(res, updated);
}, 'Failed to update banner'));

router.delete('/banners/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Banner not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete banner'));

export default router;
