import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { BundleRepository } from '../repositories/bundleRepository.js';

const router = Router();
const repo = new BundleRepository();

function validateItems(items) {
    if (items.length < 2) throw new HttpError('A bundle needs at least 2 products', 400);
    const seen = new Set();
    for (const item of items) {
        const productId = String(item.productId || '').trim();
        if (!productId) throw new HttpError('Every bundle item needs a product', 400);
        if (seen.has(productId)) throw new HttpError('Each product can only appear once in a bundle', 400);
        seen.add(productId);
    }
}

router.get('/bundles', asyncRoute(async (req, res) => {
    sendJson(res, await repo.getPublished(), 200, 30);
}, 'Failed to fetch bundles'));

router.get('/bundles/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.getAllAdmin());
}, 'Failed to fetch bundles'));

router.get('/bundles/admin/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const bundle = await repo.getById(req.params.id);
    if (!bundle) return sendError(res, 'Bundle not found', 404);
    sendJson(res, bundle);
}, 'Failed to fetch bundle'));

router.post('/bundles', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    const title = String(body.title || '').trim();
    if (!title) return sendError(res, 'Bundle title is required', 400);

    const discountType = body.discountType || 'percent';
    if (!['percent', 'flat'].includes(discountType)) return sendError(res, 'Invalid discount type', 400);

    const items = Array.isArray(body.items) ? body.items : [];
    validateItems(items);

    const now = new Date().toISOString();
    const bundle = {
        id: generateId('bundle'),
        title,
        subtitle: String(body.subtitle || '').trim(),
        description: String(body.description || '').trim(),
        image: String(body.image || '').trim(),
        discountType,
        discountValue: Number(body.discountValue ?? 0),
        isPublished: Boolean(body.isPublished ?? true),
        sortOrder: Number.parseInt(body.sortOrder ?? 0, 10),
        items,
        createdAt: now,
        updatedAt: now,
    };

    sendJson(res, await repo.create(bundle), 201);
}, 'Failed to create bundle'));

router.put('/bundles/:id/toggle', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const existing = await repo.getById(req.params.id);
    if (!existing) return sendError(res, 'Bundle not found', 404);
    const updated = await repo.update(req.params.id, { isPublished: !existing.isPublished, updatedAt: new Date().toISOString() });
    sendJson(res, updated);
}, 'Failed to toggle bundle'));

router.put('/bundles/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const existing = await repo.getById(req.params.id);
    if (!existing) return sendError(res, 'Bundle not found', 404);

    const body = req.body || {};
    const allowed = ['title', 'subtitle', 'description', 'image', 'discountType', 'discountValue', 'isPublished', 'sortOrder', 'items'];
    const changes = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if ('title' in changes && !String(changes.title).trim()) return sendError(res, 'Bundle title is required', 400);
    if ('discountType' in changes && !['percent', 'flat'].includes(changes.discountType)) return sendError(res, 'Invalid discount type', 400);
    if ('items' in changes) {
        changes.items = Array.isArray(changes.items) ? changes.items : [];
        validateItems(changes.items);
    }

    changes.updatedAt = new Date().toISOString();
    const updated = await repo.update(req.params.id, changes);
    if (!updated) return sendError(res, 'Bundle not found', 404);
    sendJson(res, updated);
}, 'Failed to update bundle'));

router.delete('/bundles/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Bundle not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete bundle'));

export default router;
