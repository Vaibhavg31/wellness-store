import { Router } from 'express';
import { requireAdmin, requireCustomer, optionalCustomer } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { ReviewRepository } from '../repositories/reviewRepository.js';
import { OrderRepository } from '../repositories/orderRepository.js';
import { UserRepository } from '../repositories/userRepository.js';

const router = Router();
const repo = new ReviewRepository();
const orders = new OrderRepository();
const users = new UserRepository();

function toPublic(review) {
    const { userId, email, ...rest } = review;
    return rest;
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

router.get('/reviews', asyncRoute(async (req, res) => {
    const productId = req.query.productId || null;
    const reviews = productId ? await repo.getByProductId(productId) : await repo.getApproved();
    sendJson(res, reviews.map(toPublic));
}, 'Failed to fetch reviews'));

router.get('/reviews/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.getAll());
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
    if (!(await orders.hasUserPurchasedProduct(userId, productId))) {
        return sendJson(res, { eligible: false, reason: 'not_purchased' });
    }
    sendJson(res, { eligible: true });
}, 'Failed to check review eligibility'));

router.post('/reviews', asyncRoute(async (req, res) => {
    const customer = await requireCustomer(req);
    const userId = String(customer.userId);

    const body = req.body || {};
    const productId = String(body.productId || '').trim();
    const comment = String(body.comment || '').trim();
    if (!productId || !comment) return sendError(res, 'productId and comment are required', 400);

    if (await repo.findByUserAndProduct(userId, productId)) {
        throw new HttpError('You have already reviewed this product. Thank you!', 409);
    }
    if (!(await orders.hasUserPurchasedProduct(userId, productId))) {
        throw new HttpError('Only customers who have purchased this product can review it', 403);
    }

    const user = await users.getById(userId);
    if (!user) return sendError(res, 'Account not found', 404);

    const images = Array.isArray(body.images)
        ? body.images.filter((v) => typeof v === 'string' && v !== '').slice(0, 6)
        : [];

    const review = {
        id: generateId('review'),
        productId,
        userId,
        name: user.name || 'Verified Buyer',
        email: user.email || '',
        rating: Math.max(1, Math.min(5, Number.parseInt(body.rating ?? 5, 10))),
        comment: escapeHtml(comment),
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
