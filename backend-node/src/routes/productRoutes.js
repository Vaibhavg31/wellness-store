import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { assertAmount, assertImageUrl, assertText, assertWhole } from '../lib/validate.js';
import { ProductRepository } from '../repositories/productRepository.js';

const router = Router();
const repo = new ProductRepository();

const REQUIRED = { title: 'Product name', price: 'Selling price', originalPrice: 'MRP', category: 'Category', description: 'Description', stock: 'Stock' };
const MAX_RUPEES = 1000000;

/**
 * Checks a product before it is saved (all fields when creating, only the ones sent when updating). The admin form
 * checks the same things, but the API must not rely on it: a price of "abc" used to end in a 500, a hidden draft could
 * be saved with a negative price or stock, and MySQL (not in strict mode) silently cut text that was too long.
 */
function validateProduct(body, creating) {
    if (creating) {
        for (const [field, label] of Object.entries(REQUIRED)) {
            const v = body[field];
            if (v === undefined || v === null || v === '') throw new HttpError(`${label} is required`, 400);
        }
        if (!Array.isArray(body.images) || body.images.length < 1) throw new HttpError('Add at least one photo', 400);
    }
    if ('title' in body) assertText(body.title, 'Product name', 500, { required: true });
    if ('description' in body) assertText(body.description, 'Description', 20000);
    if ('category' in body) assertText(body.category, 'Category', 64, { required: true });
    if ('series' in body) assertText(body.series ?? '', 'Series', 120);
    if ('price' in body) assertAmount(body.price, 'Selling price', { max: MAX_RUPEES });
    if ('originalPrice' in body) assertAmount(body.originalPrice, 'MRP', { max: MAX_RUPEES });
    if ('stock' in body) assertWhole(body.stock, 'Stock', { min: 0, max: MAX_RUPEES });
    if ('clubPrice' in body && body.clubPrice !== null && body.clubPrice !== '') assertAmount(body.clubPrice, 'Club price', { max: MAX_RUPEES });
    if ('images' in body) {
        if (!Array.isArray(body.images) || body.images.length > 20) throw new HttpError('A product can have 1 to 20 photos', 400);
        body.images.forEach((url) => assertImageUrl(url, 'Product photo', { required: true }));
    }
    if ('variants' in body && Array.isArray(body.variants)) {
        if (body.variants.length > 20) throw new HttpError('A product can have up to 20 options', 400);
        for (const v of body.variants) {
            if (!v || typeof v !== 'object') throw new HttpError('Each option needs a name and a price', 400);
            assertText(v.label, 'Option name', 150, { required: true });
            assertAmount(v.price, `Price of "${v.label}"`, { max: MAX_RUPEES });
            if (v.originalPrice !== undefined && v.originalPrice !== null && v.originalPrice !== '') assertAmount(v.originalPrice, `MRP of "${v.label}"`, { max: MAX_RUPEES });
            assertWhole(v.stock ?? 0, `Stock of "${v.label}"`, { min: 0, max: MAX_RUPEES });
            assertText(v.sku ?? '', 'SKU', 100);
            assertText(v.netQuantity ?? '', 'Net quantity', 100);
            assertText(v.tag ?? '', 'Option ribbon', 40);
            assertImageUrl(v.image, 'Option picture');
        }
    }
}

/** A product may be saved as a hidden draft without a price, but never shown to shoppers until it has one. */
function assertPriceBeforePublish(published, price, variants) {
    if (!published) return;
    const hasPrice = Number(price) > 0 || (Array.isArray(variants) && variants.some((v) => Number(v?.price) > 0));
    if (!hasPrice) throw new HttpError('Set a price before showing this product in the shop', 400);
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
    assertPriceBeforePublish(body.isPublished ?? true, body.price, body.variants);

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
        concerns: body.concerns ?? [],
        videos: body.videos ?? [],
        infoBanners: body.infoBanners ?? [],
        highlights: body.highlights ?? [],
        clubEligible: body.clubEligible !== false,
        clubPrice: body.clubPrice ?? null,
        series: body.series ?? '',
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
        'ingredients', 'howToUse', 'nutrition', 'faqs', 'concerns', 'videos', 'infoBanners', 'highlights', 'clubEligible', 'clubPrice', 'series'];

    const changes = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if ('variants' in changes && !Array.isArray(changes.variants)) delete changes.variants;
    validateProduct(changes, false);

    const price = Number(changes.price ?? product.price);
    const originalPrice = Number(changes.originalPrice ?? product.originalPrice);
    assertPriceBeforePublish(changes.isPublished ?? product.isPublished, price, changes.variants ?? product.variants);
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
