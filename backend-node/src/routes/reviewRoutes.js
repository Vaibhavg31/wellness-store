import { Router } from 'express';
import { requireAdmin, requireCustomer, optionalCustomer } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { assertText, assertWhole, assertImageUrl } from '../lib/validate.js';
import { ProductRepository } from '../repositories/productRepository.js';
import { ReviewRepository } from '../repositories/reviewRepository.js';
import { OrderRepository } from '../repositories/orderRepository.js';
import { UserRepository } from '../repositories/userRepository.js';

const router = Router();
const repo = new ReviewRepository();
const orders = new OrderRepository();
const users = new UserRepository();

// Reviews used to be HTML-escaped when saved, but the storefront (React) escapes on display, so shoppers saw "doesn&#039;t".
// New reviews are stored as typed; rows saved the old way are decoded here when they are sent out.
const LEGACY_ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'" };
const decodeLegacy = (text) => String(text ?? '').replace(/&(?:amp|lt|gt|quot|#039);/g, (m) => LEGACY_ENTITIES[m]);
const withPlainText = (review) => ({ ...review, comment: decodeLegacy(review.comment) });

function toPublic(review) {
    // Who wrote it (account id and email) is private: shoppers only see the name, rating and words.
    const { userId: _userId, email: _email, ...rest } = withPlainText(review);
    return rest;
}

router.get('/reviews', asyncRoute(async (req, res) => {
    const productId = req.query.productId || null;
    const reviews = productId ? await repo.getByProductId(productId) : await repo.getApproved();
    sendJson(res, reviews.map(toPublic));
}, 'Failed to fetch reviews'));

router.get('/reviews/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, (await repo.getAll()).map(withPlainText));
}, 'Failed to fetch reviews'));

router.get('/reviews/eligibility', asyncRoute(async (req, res) => {
    const productId = String(req.query.productId || '').trim();
    if (!productId) return sendError(res, 'productId is required', 400);

    const customer = optionalCustomer(req);
    if (!customer) return sendJson(res, { eligible: false, reason: 'signed_out' });

    const userId = String(customer.userId);
    if (await repo.findByUserAndProduct(userId, productId)) {
        return sendJson(res, { eligible: false, reason: 'already_reviewed' });
    }
    // Like the big marketplaces: a "verified purchase" review needs the parcel to have arrived (an unpaid or
    // undelivered order does not count yet).
    const state = await orders.reviewPurchaseState(userId, productId);
    if (state !== 'delivered') {
        return sendJson(res, { eligible: false, reason: state === 'pending' ? 'not_delivered' : 'not_purchased' });
    }
    sendJson(res, { eligible: true });
}, 'Failed to check review eligibility'));

router.post('/reviews', asyncRoute(async (req, res) => {
    const customer = await requireCustomer(req);
    const userId = String(customer.userId);

    const body = req.body || {};
    const productId = String(body.productId || '').trim();
    const comment = String(body.comment || '').trim();
    if (!productId) return sendError(res, 'Choose the product you are reviewing', 400);
    if (!comment) return sendError(res, 'Please write a few words about the product', 400);

    if (await repo.findByUserAndProduct(userId, productId)) {
        throw new HttpError('You have already reviewed this product. Thank you!', 409);
    }
    const state = await orders.reviewPurchaseState(userId, productId);
    if (state === 'pending') throw new HttpError('You can review this product once your order has been delivered', 403);
    if (state !== 'delivered') throw new HttpError('Only customers who have purchased this product can review it', 403);

    const user = await users.getById(userId);
    if (!user) return sendError(res, 'Account not found', 404);

    const images = Array.isArray(body.images)
        ? body.images.filter((v) => typeof v === 'string' && v !== '').slice(0, 6)
        : [];
    // Photos are the ones uploaded through /upload/review-images (own-site paths); anything else (javascript:, data:) is refused.
    for (const image of images) assertImageUrl(image, 'Review photo');

    const review = {
        id: generateId('review'),
        productId,
        userId,
        name: user.name || 'Verified Buyer',
        email: user.email || '',
        rating: assertWhole(body.rating ?? 5, 'Rating', { min: 1, max: 5 }),
        comment: comment.slice(0, 2000),
        images,
        isVerifiedPurchase: true,
        isApproved: false,
        createdAt: new Date().toISOString(),
    };

    sendJson(res, await repo.create(review), 201);
}, 'Failed to submit review'));

router.post('/reviews/admin', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    assertWhole(body.rating ?? 5, 'Rating', { min: 1, max: 5 });
    assertText(body.name ?? 'Admin', 'Name', 100, { required: true });
    assertText(body.comment ?? '', 'Comment', 2000);
    assertText(body.email ?? '', 'Email', 254);
    if (!(await new ProductRepository().getById(String(body.productId ?? '')))) return sendError(res, 'Choose a product that exists', 400);
    const review = {
        id: generateId('review'),
        productId: body.productId ?? '',
        name: body.name ?? 'Admin',
        email: body.email ?? '',
        rating: Number.parseInt(body.rating ?? 5, 10),
        comment: body.comment ?? '',
        isApproved: true,
        createdAt: new Date().toISOString(),
    };
    sendJson(res, await repo.create(review), 201);
}, 'Failed to create review'));

router.put('/reviews/:id/approve', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const updated = await repo.approve(req.params.id);
    if (!updated) return sendError(res, 'Review not found', 404);
    sendJson(res, updated);
}, 'Failed to approve review'));

router.put('/reviews/:id/reject', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const updated = await repo.reject(req.params.id);
    if (!updated) return sendError(res, 'Review not found', 404);
    sendJson(res, updated);
}, 'Failed to reject review'));

router.delete('/reviews/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return sendError(res, 'Review not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete review'));

export default router;
