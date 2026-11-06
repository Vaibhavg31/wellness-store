import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { CategoryRepository } from '../repositories/categoryRepository.js';

const router = Router();
const repo = new CategoryRepository();

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Shared admin input rules for category fields; only the fields present are checked. */
function assertValidCategory(fields) {
    if ('slug' in fields && (typeof fields.slug !== 'string' || fields.slug.length > 64 || !SLUG.test(fields.slug))) {
        throw new HttpError('Slug may only use lowercase letters, numbers and single dashes (max 64 characters), e.g. "immunity-boosters"', 400);
    }
    if ('label' in fields && (typeof fields.label !== 'string' || !fields.label.trim() || fields.label.length > 120)) {
        throw new HttpError('Name is required and must be 120 characters or fewer', 400);
    }
    if ('description' in fields && fields.description != null && (typeof fields.description !== 'string' || fields.description.length > 2000)) {
        throw new HttpError('Description must be text of 2000 characters or fewer', 400);
    }
    if ('order' in fields && (!Number.isInteger(Number(fields.order)) || Number(fields.order) < 0 || Number(fields.order) > 9999)) {
        throw new HttpError('Order must be a whole number from 0 to 9999', 400);
    }
}

router.get('/categories', asyncRoute(async (req, res) => {
    // Categories change rarely; admin edits go through /api/categories/admin/all so this cache never masks an admin's own change.
    sendJson(res, await repo.getPublished(), 200, 300);
}, 'Failed to fetch categories'));

router.get('/categories/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.getAllWithProductCount());
}, 'Failed to fetch categories'));

router.get('/categories/:slug', asyncRoute(async (req, res) => {
    const cat = await repo.findBySlug(req.params.slug);
    if (!cat) return sendError(res, 'Category not found', 404);
    sendJson(res, cat);
}, 'Failed to fetch category'));

router.post('/categories', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    if (!body.label || !body.slug) return sendError(res, 'label and slug are required', 400);
    assertValidCategory(body);
    if (await repo.findBySlug(body.slug)) return sendError(res, 'A category with this slug already exists', 409);

    const category = {
        id: body.slug,
        slug: body.slug,
        label: body.label,
        description: body.description ?? '',
        image: body.image ?? '',
        isPublished: Boolean(body.isPublished ?? true),
        order: Number.parseInt(body.order ?? 99, 10),
    };

    sendJson(res, await repo.create(category), 201);
}, 'Failed to create category'));

router.put('/categories/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const allowed = ['label', 'description', 'image', 'isPublished', 'order'];
    const body = req.body || {};
    const changes = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    assertValidCategory(changes);
    if ('order' in changes) changes.order = Number(changes.order);

    const updated = await repo.update(req.params.id, changes);
    if (!updated) return sendError(res, 'Category not found', 404);
    sendJson(res, updated);
}, 'Failed to update category'));

router.delete('/categories/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const productCount = await repo.countProducts(req.params.id);
    if (productCount > 0) {
        const noun = productCount === 1 ? 'product' : 'products';
        return sendError(res, `Can't delete this category — ${productCount} ${noun} still use it. Move or delete those products first, or unpublish the category instead.`, 409);
    }

    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Category not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete category'));

export default router;
