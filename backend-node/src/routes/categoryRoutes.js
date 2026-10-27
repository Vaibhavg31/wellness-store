import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError } from '../lib/response.js';
import { CategoryRepository } from '../repositories/categoryRepository.js';

const router = Router();
const repo = new CategoryRepository();

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
