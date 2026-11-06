import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { assertText, assertWhole, assertAmount, assertImageUrl } from '../lib/validate.js';
import { BundleRepository } from '../repositories/bundleRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';

const router = Router();
const repo = new BundleRepository();
const productRepo = new ProductRepository();

/**
 * Input rules for a bundle. `current` is the saved bundle when editing, so a change to only the discount is still
 * checked against the products already in it. A discount may never make the bundle free (or negative).
 */
async function assertValidBundle(fields, current = null) {
    if ('title' in fields) assertText(fields.title, 'Title', 255, { required: true });
    if ('subtitle' in fields) assertText(fields.subtitle, 'Subtitle', 255);
    if ('description' in fields) assertText(fields.description, 'Description', 5000);
    if ('image' in fields) assertImageUrl(fields.image, 'Bundle image');
    if ('sortOrder' in fields) assertWhole(fields.sortOrder, 'Order', { min: 0, max: 9999 });

    const type = fields.discountType ?? current?.discountType ?? 'percent';
    const discount = 'discountValue' in fields ? fields.discountValue : (current?.discountValue ?? 0);
    const value = assertAmount(discount, 'Discount', { min: 0, max: type === 'percent' ? 100 : 1000000 });
    if (type === 'percent' && value >= 100) throw new HttpError('A percentage discount must be below 100% (a bundle cannot be free)', 400);

    let lines = null;
    if (Array.isArray(fields.items)) {
        lines = [];
        for (const item of fields.items) {
            const quantity = item.quantity === undefined || item.quantity === null || item.quantity === '' ? 1 : assertWhole(item.quantity, 'Quantity', { min: 1, max: 99 });
            const product = await productRepo.getById(String(item.productId || '').trim());
            if (!product) throw new HttpError(`Product not found: ${String(item.productId).slice(0, 60)}`, 400);
            lines.push({ price: Number(product.price) || 0, quantity });
        }
    } else if (current?.items) {
        lines = current.items.map((i) => ({ price: Number(i.product?.price) || 0, quantity: Number(i.quantity) || 1 }));
    }
    if (type === 'flat' && lines) {
        const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
        if (value >= subtotal) throw new HttpError(`A flat discount must be smaller than the products' total (₹${Math.round(subtotal)})`, 400);
    }
}

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
    await assertValidBundle({ ...body, items });

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
    await assertValidBundle(changes, existing);

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
