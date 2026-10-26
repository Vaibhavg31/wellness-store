import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { ProductRepository } from '../repositories/productRepository.js';

const router = Router();
const repo = new ProductRepository();

function validateProduct(body, required) {
    const fields = ['title', 'price', 'originalPrice', 'category', 'description', 'stock'];
    for (const field of fields) {
        const v = body[field];
        if (required && (v === undefined || v === null || v === '') && v !== 0) {
            throw new HttpError(`Missing required field: ${field}`, 400);
        }
    }
    if (required && (!Array.isArray(body.images) || body.images.length < 1)) {
        throw new HttpError('At least one image is required', 400);
    }
}

// Short cache (30s): this list grows with the catalog and is fetched on nearly every storefront page.
// The admin panel reads/writes through a DIFFERENT URL (/api/products/admin/all), so admins always see fresh data.
router.get('/products', asyncRoute(async (req, res) => {
    sendJson(res, await repo.getPublished(), 200, 30);
}, 'Failed to fetch products'));

router.get('/products/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.getAdmin());
}, 'Failed to fetch products'));

router.get('/products/trending', asyncRoute(async (req, res) => {
    sendJson(res, await repo.getTrending(), 200, 30);
}, 'Failed to fetch trending products'));

router.get('/products/admin/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const product = await repo.getById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);
    sendJson(res, product);
}, 'Failed to fetch product'));

router.post('/products', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    validateProduct(body, true);

    const now = new Date().toISOString();
    const product = {
        id: generateId('product'),
        title: body.title,
        price: Number(body.price),
        originalPrice: Number(body.originalPrice),
        discount: ProductRepository.calcDiscount(Number(body.price), Number(body.originalPrice), body.discount !== undefined ? Number(body.discount) : null),
        category: body.category,
        tags: body.tags ?? [],
        rating: Number(body.rating ?? 0),
        reviewCount: Number.parseInt(body.reviewCount ?? 0, 10),
        description: body.description,
        features: body.features ?? [],
        badges: Array.isArray(body.badges) ? body.badges : [],
        stock: Number.parseInt(body.stock, 10),
        images: body.images,
        variants: Array.isArray(body.variants) ? body.variants : [],
        ingredients: body.ingredients ?? [],
        howToUse: body.howToUse ?? [],
        nutrition: body.nutrition ?? { servingSize: '', rows: [] },
        faqs: body.faqs ?? [],
        isNew: Boolean(body.isNew ?? false),
        isBestSeller: Boolean(body.isBestSeller ?? false),
        isTrendingPinned: Boolean(body.isTrendingPinned ?? false),
        orbitFeatured: Boolean(body.orbitFeatured ?? false),
        orbitSortOrder: Number.parseInt(body.orbitSortOrder ?? 0, 10),
        showTrustBadges: 'showTrustBadges' in body ? Boolean(body.showTrustBadges) : true,
        isPublished: Boolean(body.isPublished ?? true),
        codEnabled: 'codEnabled' in body ? Boolean(body.codEnabled) : true,
        onlinePaymentEnabled: 'onlinePaymentEnabled' in body ? Boolean(body.onlinePaymentEnabled) : true,
        createdAt: now,
        updatedAt: now,
    };

    sendJson(res, await repo.create(product), 201);
}, 'Failed to create product'));

router.get('/products/:id', asyncRoute(async (req, res) => {
    const product = await repo.getPublicById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);
    sendJson(res, product, 200, 30);
}, 'Failed to fetch product'));

router.put('/products/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    const product = await repo.getById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);

    const allowed = ['title', 'price', 'originalPrice', 'discount', 'category', 'tags', 'rating', 'reviewCount',
        'description', 'features', 'badges', 'stock', 'images', 'isNew', 'isBestSeller', 'isTrendingPinned',
        'orbitFeatured', 'orbitSortOrder', 'showTrustBadges', 'isPublished', 'codEnabled', 'onlinePaymentEnabled', 'variants',
        'ingredients', 'howToUse', 'nutrition', 'faqs'];

    const changes = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if ('variants' in changes && !Array.isArray(changes.variants)) delete changes.variants;

    const price = Number(changes.price ?? product.price);
    const originalPrice = Number(changes.originalPrice ?? product.originalPrice);
    changes.discount = ProductRepository.calcDiscount(price, originalPrice, body.discount !== undefined ? Number(body.discount) : null);
    changes.updatedAt = new Date().toISOString();

    const updated = await repo.update(req.params.id, changes);
    if (!updated) return sendError(res, 'Product not found', 404);
    sendJson(res, updated);
}, 'Failed to update product'));

router.delete('/products/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Product not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete product'));

export default router;
