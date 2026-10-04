import { Router } from 'express';
import crypto from 'node:crypto';
import { requireCustomer, requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, sendCsv, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { exportTablePdf } from '../lib/exportHelper.js';
import { revenueForOrder } from '../lib/orderRevenue.js';
import * as addressBookHelper from '../lib/addressBookHelper.js';
import * as otpConfig from '../lib/otpConfig.js';
import { isOtpEnabled } from '../lib/servicesConfig.js';
import { isEmailVerified } from './authRoutes.js';
import { OrderRepository } from '../repositories/orderRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';
import { CouponRepository } from '../repositories/couponRepository.js';
import { BundleRepository } from '../repositories/bundleRepository.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { CouponService } from '../services/couponService.js';
import * as razorpay from '../services/razorpayService.js';
import * as emailService from '../services/emailService.js';

const router = Router();
const repo = new OrderRepository();
const products = new ProductRepository();
const coupons = new CouponRepository();
const bundles = new BundleRepository();
const couponService = new CouponService();
const users = new UserRepository();

const ALLOWED_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'out_for_delivery'];

// ── Helpers ──────────────────────────────────────────────────────────────

async function dispatchOrderEmail(order, event, prevStatus = null) {
    try {
        if (event === 'confirmed' && prevStatus !== null) {
            if (order.payment === 'razorpay' && order.paymentStatus === 'paid' && prevStatus === 'confirmed') return;
        }
        const allowed = ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'packed', 'shipped'];
        if (!allowed.includes(event)) return;
        await emailService.handleOrderEvent(order, event);
    } catch (err) {
        console.error(`[Brevo] Order email failed for ${order.id || 'unknown'}: ${err?.message || err}`);
    }
}

function deriveStatusHistory(order) {
    const history = [{ status: 'placed', at: order.createdAt || new Date().toISOString(), by: 'system', note: 'Order placed' }];
    const current = order.status || 'placed';
    if (current !== 'placed') {
        history.push({ status: current, at: order.updatedAt || order.paidAt || order.createdAt || new Date().toISOString(), by: 'system', note: 'Status updated' });
    }
    return history;
}

function enrichOrder(order) {
    if (!order.statusHistory || !Array.isArray(order.statusHistory) || order.statusHistory.length === 0) {
        order.statusHistory = deriveStatusHistory(order);
    }
    if (order.paymentStatus === undefined && order.payment === 'cod') order.paymentStatus = 'cod';
    return order;
}

function buildStatusChange(order, status, note, by) {
    const now = new Date().toISOString();
    const history = Array.isArray(order.statusHistory) && order.statusHistory.length > 0 ? [...order.statusHistory] : deriveStatusHistory(order);

    const last = history[history.length - 1];
    if (!last || last.status !== status) {
        history.push({ status, at: now, by, note: note ?? '' });
    }

    const changes = { status, statusHistory: history, updatedAt: now };
    if (status === 'cancelled') changes.cancelledAt = now;
    return changes;
}

function appendAdminNote(order, note) {
    const existing = String(order.adminNotes || '').trim();
    const stamp = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} — ${note}`;
    return existing ? `${existing}\n${stamp}` : stamp;
}

async function adjustItemStock(item, delta) {
    const variantId = String(item.variantId || '');
    if (variantId) return products.adjustVariantStock(variantId, delta);
    return products.adjustStock(String(item.productId || ''), delta);
}

async function restoreStockItems(items) {
    for (const item of items) await adjustItemStock(item, Number(item.quantity));
}

async function decrementStock(items) {
    const done = [];
    for (const item of items) {
        const ok = await adjustItemStock(item, -Number(item.quantity));
        if (!ok) {
            await restoreStockItems(done);
            throw new HttpError('Stock changed while placing order. Please refresh and try again.', 400);
        }
        done.push(item);
    }
}

async function decrementStockForDirectItems(items) {
    const done = [];
    for (const item of items) {
        if (item.isCustom || String(item.productId || '').startsWith('custom-')) continue;
        const productId = String(item.productId || '');
        if (!productId) continue;
        const ok = await adjustItemStock(item, -Number(item.quantity));
        if (!ok) {
            await restoreStockItems(done);
            throw new HttpError(`Stock unavailable for "${item.title || productId}". Disable stock adjustment or reduce quantity.`, 400);
        }
        done.push(item);
    }
}

async function releaseCouponForOrder(order) {
    const couponId = String(order.couponId || '').trim();
    if (!couponId) return;
    await couponService.releaseUsage(couponId);
}

async function restoreStockForOrder(order) {
    const items = order.items;
    if (!Array.isArray(items)) return;
    await restoreStockItems(items);
}

function normalizePhone10(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) return '';
    return digits.slice(-10);
}

async function requireVerifiedEmail(userId) {
    if (!userId) throw new HttpError('User not found', 401);
    const user = await users.getById(userId);
    if (!user) throw new HttpError('User not found', 404);
    if (!isEmailVerified(user)) throw new HttpError('Please verify your email address before placing an order.', 403);
}

async function requireVerifiedPhone(userId, orderPhone) {
    if (!(await isOtpEnabled()) || (await otpConfig.shouldSkipOtpVerify())) return;
    if (!userId) throw new HttpError('User not found', 401);
    const user = await users.getById(userId);
    if (!user) throw new HttpError('User not found', 404);
    if (!user.phoneVerified) throw new HttpError('Please verify your mobile number before placing an order.', 403);

    const accountPhone = normalizePhone10(user.phone);
    const shippingPhone = normalizePhone10(orderPhone);
    if (!accountPhone || !shippingPhone) throw new HttpError('A valid verified mobile number is required', 400);
    if (accountPhone !== shippingPhone) throw new HttpError('Order mobile must match your verified account number.', 400);
}

async function validatePaymentMethod(payment, items) {
    const settings = await new SettingsRepository().get();
    const payments = settings.payments || {};
    const codGlobal = payments.codEnabled !== false;
    const onlineGlobal = payments.onlinePaymentEnabled !== false;

    if (payment === 'cod') {
        if (!codGlobal) throw new HttpError('Cash on Delivery is not available at the moment', 400);
        for (const line of items) {
            const product = await products.getPublicById(String(line.productId || ''));
            if (product && product.codEnabled === false) throw new HttpError('Cash on Delivery is not available for one or more items in your bag', 400);
        }
        return;
    }

    if (!onlineGlobal) throw new HttpError('Online payment is not available at the moment', 400);
    if (!razorpay.isRazorpayConfigured()) throw new HttpError('Online payment is temporarily unavailable. Please use Cash on Delivery.', 503);
    for (const line of items) {
        const product = await products.getPublicById(String(line.productId || ''));
        if (product && product.onlinePaymentEnabled === false) throw new HttpError('Online payment is not available for one or more items in your bag', 400);
    }
}

async function validateAndBuildItems(rawItems) {
    if (rawItems.length === 0) throw new HttpError('Cart is empty', 400);

    const built = [];
    let subtotal = 0;

    for (const line of rawItems) {
        if (!line || typeof line !== 'object') throw new HttpError('Invalid cart item', 400);

        const productId = String(line.productId || '');
        const variantId = String(line.variantId || '').trim();
        const bundleId = String(line.bundleId || '').trim();
        const qty = Number.parseInt(line.quantity ?? 0, 10);

        if (!productId || qty < 1) throw new HttpError('Each item needs a productId and quantity ≥ 1', 400);

        const product = await products.getPublicById(productId);
        if (!product) throw new HttpError(`Product unavailable: ${productId}`, 400);

        const title = product.title || '';

        if (bundleId) {
            const bundleLine = await bundles.priceForProduct(bundleId, productId);
            if (!bundleLine) throw new HttpError(`That bundle is no longer available for "${title}"`, 400);
            if (qty !== bundleLine.quantity) throw new HttpError(`Please add the full bundle for "${bundleLine.bundleTitle}"`, 400);

            const displayTitle = `${title} — ${bundleLine.bundleTitle}`;
            if (bundleLine.stock < qty) {
                throw new HttpError(bundleLine.stock <= 0 ? `"${title}" is out of stock` : `Only ${bundleLine.stock} left for "${title}". Please update your bag`, 400);
            }

            built.push({
                productId, variantId: bundleLine.variantId, variantLabel: null, bundleId, bundleTitle: bundleLine.bundleTitle,
                title: displayTitle, price: bundleLine.unitPrice, quantity: qty,
                image: product.images?.[0] ?? (line.image ?? ''),
            });
            subtotal += bundleLine.unitPrice * qty;
            continue;
        }

        if (product.hasVariants && !variantId) throw new HttpError(`Please choose an option (pack size) for "${product.title}"`, 400);
        const variant = variantId ? await products.getVariant(productId, variantId) : null;
        if (variantId && !variant) throw new HttpError(`Selected option is no longer available for "${product.title}"`, 400);

        const stock = variant ? variant.stock : Number(product.stock || 0);
        const displayTitle = variant ? `${title} — ${variant.label}` : title;

        if (stock < qty) {
            throw new HttpError(stock <= 0 ? `"${displayTitle}" is out of stock` : `Only ${stock} left for "${displayTitle}". Please update your bag`, 400);
        }

        const price = variant ? variant.price : Number(product.price || 0);
        built.push({
            productId, variantId: variant?.id ?? null, variantLabel: variant?.label ?? null,
            title: displayTitle, price, quantity: qty, image: product.images?.[0] ?? (line.image ?? ''),
        });
        subtotal += price * qty;
    }

    return { items: built, subtotal: Math.round(subtotal * 100) / 100 };
}

async function buildDirectOrderItems(rawItems) {
    if (rawItems.length === 0) throw new HttpError('At least one item is required', 400);

    const built = [];
    let subtotal = 0;

    for (const line of rawItems) {
        if (!line || typeof line !== 'object') throw new HttpError('Invalid line item', 400);

        const title = String(line.title || '').trim();
        const qty = Number.parseInt(line.quantity ?? 0, 10);
        const price = Number(line.price || 0);
        let productId = String(line.productId || '').trim();

        if (!title || qty < 1) throw new HttpError('Each item needs a title and quantity ≥ 1', 400);
        if (price < 0) throw new HttpError('Item price cannot be negative', 400);

        let image = String(line.image || '').trim();
        let isCustom = !productId || productId.startsWith('custom-');

        if (!isCustom && productId) {
            const product = await products.getById(productId);
            if (!image && product?.images?.[0]) image = String(product.images[0]);
        } else {
            productId = productId || `custom-${crypto.randomBytes(4).toString('hex')}`;
            isCustom = true;
        }

        const variantId = String(line.variantId || '').trim();
        let variantLabel = null;
        if (variantId && !isCustom) {
            const variant = await products.getVariant(productId, variantId);
            variantLabel = variant?.label ?? null;
        }

        built.push({
            productId, variantId: variantId || null, variantLabel, title,
            price: Math.round(price * 100) / 100, quantity: qty, image, isCustom,
        });
        subtotal += price * qty;
    }

    return { items: built, subtotal: Math.round(subtotal * 100) / 100 };
}

function filtersFromQuery(query) {
    return {
        status: query.status || '', payment: query.payment || '', search: query.search || '',
        from: query.from || '', to: query.to || '', sort: query.sort || 'createdAt', order: query.order || 'desc',
        source: query.source || '',
    };
}

// ── Routes ───────────────────────────────────────────────────────────────

router.get('/orders', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const orders = await repo.getByUserId(payload.userId);
    sendJson(res, orders.map(enrichOrder));
}, 'Failed to fetch orders'));

router.get('/orders/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const orders = await repo.listAdminFiltered(filtersFromQuery(req.query));
    sendJson(res, orders.map(enrichOrder));
}, 'Failed to fetch orders'));

router.get('/orders/admin/export', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const filters = filtersFromQuery(req.query);
    const orders = await repo.listAdminFiltered(filters);

    const format = String(req.query.format || 'csv').toLowerCase();
    if (!['csv', 'pdf'].includes(format)) return sendError(res, 'Invalid export format. Use csv or pdf.', 400);

    const headers = ['Order ID', 'Date', 'Status', 'Source', 'Customer Name', 'Email', 'Phone', 'City', 'State',
        'Pincode', 'Address', 'Items', 'Subtotal', 'Discount', 'Delivery Fee', 'Total', 'Revenue', 'Payment',
        'Payment Status', 'Coupon', 'Tracking', 'Carrier', 'User ID'];

    const rows = orders.map((order) => {
        const shipping = order.shipping || {};
        const itemTitles = (order.items || []).map((item) => `${item.title || 'Item'} x${item.quantity ?? 1}`);
        return [
            order.id || '', order.createdAt || '', order.status || '', order.orderSource || 'website',
            shipping.name || '', order.email || '', shipping.phone || '', shipping.city || '', shipping.state || '',
            shipping.pincode || '', shipping.address || '', itemTitles.join('; '),
            String(order.subtotal || 0), String(order.discountAmount || 0), String(order.deliveryFee || 0), String(order.total || 0),
            String(revenueForOrder(order)), order.payment || '', order.paymentStatus || '', order.couponCode || '',
            order.trackingNumber || '', order.carrier || '', order.userId || '',
        ];
    });

    const from = filters.from || 'all';
    const to = filters.to || 'all';
    const baseName = `wellness-orders-${from}-to-${to}`;

    if (format === 'pdf') return exportTablePdf(res, `${baseName}.pdf`, 'Orders Export', headers, rows);
    sendCsv(res, `${baseName}.csv`, headers, rows);
}, 'Failed to export orders'));

router.post('/orders/admin/create-direct', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    if (!Array.isArray(body.items) || body.items.length === 0) return sendError(res, 'items array is required', 400);

    const { items, subtotal } = await buildDirectOrderItems(body.items);

    const shipping = body.shipping && typeof body.shipping === 'object' ? body.shipping : {};
    const name = String(shipping.name || '').trim();
    const phone = String(shipping.phone || '').trim();
    if (!name || !phone) return sendError(res, 'Customer name and phone are required', 400);

    const discountAmount = Math.max(0, Number(body.discountAmount || 0));
    const deliveryFee = Math.max(0, Number(body.deliveryFee || 0));
    const total = Math.round(Math.max(0, subtotal - discountAmount + deliveryFee) * 100) / 100;

    const payment = String(body.payment || 'cod').toLowerCase();
    if (!['cod', 'offline', 'pending'].includes(payment)) return sendError(res, 'Invalid payment method. Use cod, offline, or pending', 400);

    const status = body.status || 'placed';
    if (!ALLOWED_STATUSES.includes(status)) return sendError(res, 'Invalid status', 400);

    const adjustStock = (body.adjustStock ?? true) !== false;
    if (adjustStock) await decrementStockForDirectItems(items);

    const orderId = generateId('order');
    const email = String(body.email || shipping.email || '').trim();
    const now = new Date().toISOString();
    const adminNotes = String(body.adminNotes || '').trim();
    const note = String(body.statusNote || 'Direct order created by admin').trim();

    const paymentStatus = payment === 'offline' ? 'paid' : payment === 'pending' ? 'pending' : 'cod';

    const order = {
        id: orderId, orderSource: 'direct', userId: String(body.userId || '').trim(), email, items,
        subtotal, discountAmount, deliveryFee, total, status, shipping, payment, paymentStatus,
        createdAt: now, updatedAt: now, createdBy: 'admin',
        statusHistory: [{ status, at: now, by: 'admin', note }],
    };

    if (payment === 'offline') order.paidAt = now;
    if (adminNotes) order.adminNotes = adminNotes;
    if (String(body.trackingNumber || '').trim()) order.trackingNumber = String(body.trackingNumber).trim();
    if (String(body.carrier || '').trim()) order.carrier = String(body.carrier).trim();
    if (String(body.estimatedDelivery || '').trim()) order.estimatedDelivery = String(body.estimatedDelivery).trim();

    const created = await repo.create(order);

    if (body.sendEmail === true && email) {
        const emailEvent = status === 'confirmed' || paymentStatus === 'paid' ? 'confirmed' : 'placed';
        await dispatchOrderEmail(created, emailEvent);
    }

    sendJson(res, enrichOrder(created), 201);
}, 'Failed to create direct order'));

router.get('/orders/admin/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const order = await repo.getById(req.params.id);
    if (!order) return sendError(res, 'Order not found', 404);
    sendJson(res, enrichOrder(order));
}, 'Failed to fetch order'));

router.get('/orders/:id', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const order = await repo.getById(req.params.id);
    if (!order || order.userId !== payload.userId) return sendError(res, 'Order not found', 404);
    sendJson(res, enrichOrder(order));
}, 'Failed to fetch order'));

router.put('/orders/:id/status', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    const status = body.status || '';
    if (!ALLOWED_STATUSES.includes(status)) return sendError(res, `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`, 400);

    const existing = await repo.getById(req.params.id);
    if (!existing) return sendError(res, 'Order not found', 404);

    const prev = existing.status || '';
    const note = body.note !== undefined ? String(body.note).trim() : '';

    if (status === 'cancelled' && prev !== 'cancelled') {
        await restoreStockForOrder(existing);
        await releaseCouponForOrder(existing);
    }

    const changes = buildStatusChange(existing, status, note || null, 'admin');
    const updated = await repo.update(req.params.id, changes);
    if (updated && prev !== status) await dispatchOrderEmail(updated, status, prev);

    if (!updated) return sendError(res, 'Order not found', 404);
    sendJson(res, enrichOrder(updated));
}, 'Failed to update order'));

router.put('/orders/:id/details', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const existing = await repo.getById(req.params.id);
    if (!existing) return sendError(res, 'Order not found', 404);

    const body = req.body || {};
    const changes = { updatedAt: new Date().toISOString() };
    if ('trackingNumber' in body) changes.trackingNumber = String(body.trackingNumber).trim();
    if ('carrier' in body) changes.carrier = String(body.carrier).trim();
    if ('estimatedDelivery' in body) changes.estimatedDelivery = String(body.estimatedDelivery).trim();
    if ('adminNotes' in body) changes.adminNotes = String(body.adminNotes).trim();

    const updated = await repo.update(req.params.id, changes);
    if (!updated) return sendError(res, 'Order not found', 404);
    sendJson(res, enrichOrder(updated));
}, 'Failed to update order details'));

router.post('/orders/admin/bulk-status', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const status = body.status || '';
    const note = body.note !== undefined ? String(body.note).trim() : '';

    if (ids.length === 0) return sendError(res, 'ids array is required', 400);
    if (!ALLOWED_STATUSES.includes(status)) return sendError(res, 'Invalid status', 400);

    const updated = [];
    for (const rawId of ids) {
        const id = String(rawId);
        const existing = await repo.getById(id);
        if (!existing) continue;

        const prev = existing.status || '';
        if (status === 'cancelled' && prev !== 'cancelled') {
            await restoreStockForOrder(existing);
            await releaseCouponForOrder(existing);
        }

        const changes = buildStatusChange(existing, status, note || 'Bulk update', 'admin');
        const result = await repo.update(id, changes);
        if (result) {
            if (prev !== status) await dispatchOrderEmail(result, status, prev);
            updated.push(enrichOrder(result));
        }
    }

    sendJson(res, { updated: updated.length, orders: updated });
}, 'Failed to bulk update orders'));

router.post('/orders/admin/bulk-refund', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const note = String(body.note || 'Refund processed').trim();

    if (ids.length === 0) return sendError(res, 'ids array is required', 400);

    const updated = [];
    for (const rawId of ids) {
        const id = String(rawId);
        const existing = await repo.getById(id);
        if (!existing) continue;

        let changes = { refundStatus: 'refunded', refundedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const current = existing.status || '';
        if (!['cancelled', 'returned'].includes(current)) {
            changes = { ...changes, ...buildStatusChange(existing, 'returned', note, 'admin') };
        } else {
            changes.adminNotes = appendAdminNote(existing, note);
        }

        const result = await repo.update(id, changes);
        if (result) updated.push(enrichOrder(result));
    }

    sendJson(res, { updated: updated.length, orders: updated });
}, 'Failed to process refunds'));

router.post('/orders/verify-payment', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const body = req.body || {};
    const orderId = String(body.orderId || '');
    const razorpayOrderId = String(body.razorpayOrderId || body.razorpay_order_id || '');
    const razorpayPaymentId = String(body.razorpayPaymentId || body.razorpay_payment_id || '');
    const razorpaySignature = String(body.razorpaySignature || body.razorpay_signature || '');

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return sendError(res, 'Missing payment verification fields', 400);

    const order = await repo.getById(orderId);
    if (!order || order.userId !== payload.userId) return sendError(res, 'Order not found', 404);
    if (order.payment !== 'razorpay') return sendError(res, 'Order is not a Razorpay payment', 400);
    if (order.paymentStatus === 'paid') return sendJson(res, enrichOrder(order));
    if (order.razorpayOrderId !== razorpayOrderId) return sendError(res, 'Razorpay order mismatch', 400);
    if (!razorpay.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) return sendError(res, 'Invalid payment signature', 400);

    const now = new Date().toISOString();
    const prevStatus = order.status || 'placed';
    const statusChanges = buildStatusChange(order, 'confirmed', 'Payment received', 'system');
    const updated = await repo.update(orderId, { ...statusChanges, paymentStatus: 'paid', razorpayPaymentId, razorpaySignature, paidAt: now });

    if (updated) await dispatchOrderEmail(updated, 'confirmed', prevStatus);
    sendJson(res, enrichOrder(updated));
}, 'Failed to verify payment'));

router.post('/webhooks/razorpay', asyncRoute(async (req, res) => {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
    const signature = req.headers['x-razorpay-signature'] || '';

    if (!razorpay.isWebhookConfigured()) return sendJson(res, { ok: true, skipped: 'webhook not configured' });
    if (!razorpay.verifyWebhookSignature(rawBody, String(signature))) return sendError(res, 'Invalid webhook signature', 400);

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return sendError(res, 'Invalid payload', 400);
    }
    if (!payload || typeof payload !== 'object') return sendError(res, 'Invalid payload', 400);

    const event = payload.event || '';
    if (!['payment.captured', 'order.paid'].includes(event)) return sendJson(res, { ok: true, ignored: event });

    try {
        const paymentEntity = payload.payload?.payment?.entity || {};
        const razorpayOrderId = String(paymentEntity.order_id || '');
        const razorpayPaymentId = String(paymentEntity.id || '');

        const order = await repo.findByRazorpayOrderId(razorpayOrderId);
        if (!order) return sendJson(res, { ok: true, note: 'order not found' });
        if (order.paymentStatus === 'paid') return sendJson(res, { ok: true, note: 'already reconciled' });

        const now = new Date().toISOString();
        const prevStatus = order.status || 'placed';
        const statusChanges = buildStatusChange(order, 'confirmed', 'Payment confirmed via webhook', 'system');
        const updated = await repo.update(String(order.id), {
            ...statusChanges, paymentStatus: 'paid', razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId || '', paidAt: now,
        });

        if (updated) await dispatchOrderEmail(updated, 'confirmed', prevStatus);
        sendJson(res, { ok: true });
    } catch {
        sendError(res, 'Failed to process webhook', 500);
    }
}, 'Failed to process webhook'));

router.post('/orders/cancel-pending', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const orderId = String(req.body?.orderId || '');
    if (!orderId) return sendError(res, 'orderId is required', 400);

    const order = await repo.getById(orderId);
    if (!order || order.userId !== payload.userId) return sendError(res, 'Order not found', 404);
    if (order.payment !== 'razorpay') return sendError(res, 'Only pending online payments can be cancelled this way', 400);
    if (order.paymentStatus === 'paid') return sendError(res, 'Payment already completed', 400);
    if (order.status === 'cancelled') return sendJson(res, enrichOrder(order));

    await restoreStockForOrder(order);
    await releaseCouponForOrder(order);
    const statusChanges = buildStatusChange(order, 'cancelled', 'Payment cancelled', 'customer');
    const updated = await repo.update(orderId, { ...statusChanges, paymentStatus: 'failed', cancelledAt: new Date().toISOString() });

    if (updated) await dispatchOrderEmail(updated, 'cancelled');
    sendJson(res, enrichOrder(updated));
}, 'Failed to cancel order'));

router.post('/orders', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const body = req.body || {};
    if (!Array.isArray(body.items) || body.items.length === 0) return sendError(res, 'items array is required', 400);

    const payment = String(body.payment || 'cod').toLowerCase();
    if (!['cod', 'razorpay'].includes(payment)) return sendError(res, 'Invalid payment method', 400);

    const validated = await validateAndBuildItems(body.items);
    await validatePaymentMethod(payment, validated.items);
    const { subtotal, items } = validated;

    const shipping = body.shipping && typeof body.shipping === 'object' ? body.shipping : {};
    await requireVerifiedEmail(payload.userId || '');
    await requireVerifiedPhone(payload.userId || '', String(shipping.phone || ''));

    const couponCode = CouponService.normalizeCode(body.couponCode || '');
    let couponRecord = null;
    let discountAmount = 0;
    let deliveryFee = 0;
    let deliverySaved = 0;
    let couponType = '';

    const deliverySettings = await couponService.deliverySettings();
    const baseDeliveryFee = subtotal >= deliverySettings.freeThreshold ? 0 : deliverySettings.fee;

    if (couponCode) {
        const validation = await couponService.validate(couponCode, subtotal, payload.userId || '');
        if (!validation.valid) throw new HttpError(validation.message || 'Invalid coupon', 400);

        couponRecord = await coupons.findByCode(couponCode);
        const breakdown = validation.breakdown || (await couponService.calculateBreakdown(subtotal, couponRecord || {}));
        discountAmount = Number(breakdown.discountAmount || 0);
        deliveryFee = Number(breakdown.deliveryFee ?? baseDeliveryFee);
        couponType = breakdown.couponType || '';

        if (breakdown.freeDeliveryFromCoupon && baseDeliveryFee > 0) deliverySaved = baseDeliveryFee;
    } else {
        deliveryFee = baseDeliveryFee;
    }

    const total = Math.round(Math.max(0, subtotal - discountAmount + deliveryFee) * 100) / 100;

    // Reserve coupon usage atomically BEFORE touching stock — closes the race where two
    // concurrent checkouts both pass validate()'s now-stale usage_count read.
    if (couponRecord && !(await couponService.recordUsage(String(couponRecord.id)))) {
        throw new HttpError('This coupon just reached its usage limit. Please remove it and try again.', 400);
    }

    try {
        await decrementStock(items);
    } catch (err) {
        if (couponRecord) await couponService.releaseUsage(String(couponRecord.id));
        throw err;
    }

    const orderId = generateId('order');
    const customerEmail = String(body.customerEmail || shipping.email || payload.email || '').trim();
    const now = new Date().toISOString();

    const order = {
        id: orderId, orderSource: 'website', userId: payload.userId, email: customerEmail || (payload.email || ''),
        items, subtotal, discountAmount, deliveryFee, total, status: 'placed', shipping, payment,
        paymentStatus: payment === 'cod' ? 'cod' : 'pending', createdAt: now, updatedAt: now,
        statusHistory: [{ status: 'placed', at: now, by: 'system', note: 'Order placed' }],
    };

    if (couponRecord) {
        order.couponCode = couponRecord.code || couponCode;
        order.couponId = String(couponRecord.id || '');
        order.couponType = couponType;
        if (deliverySaved > 0) order.deliverySaved = deliverySaved;
    }

    if (payment === 'razorpay') {
        try {
            const amountPaise = Math.round(total * 100);
            const rp = await razorpay.createRazorpayOrder(amountPaise, orderId, { order_id: orderId, email: payload.email || '' });
            order.razorpayOrderId = rp.id;
            order.razorpayAmount = rp.amount;
        } catch (err) {
            await restoreStockItems(items);
            if (couponRecord) await couponService.releaseUsage(String(couponRecord.id));
            return sendError(res, err.message, 502);
        }
    }

    let created;
    try {
        created = await repo.create(order);
    } catch (err) {
        await restoreStockItems(items);
        if (couponRecord) await couponService.releaseUsage(String(couponRecord.id));
        throw err;
    }

    // Best-effort convenience sync — must never turn a successfully placed order into a failure response.
    try {
        const addressBook = body.addressBook && typeof body.addressBook === 'object' ? body.addressBook : {};
        await addressBookHelper.syncFromCheckout(String(payload.userId || ''), shipping, addressBook);
    } catch {
        // ignore
    }

    if (payment !== 'razorpay') await dispatchOrderEmail(created, 'placed');

    const response = enrichOrder(created);
    if (payment === 'razorpay') response.razorpayKeyId = razorpay.isRazorpayConfigured() ? (process.env.RAZORPAY_KEY_ID || '').trim() : '';

    sendJson(res, response, 201);
}, 'Failed to create order'));

export default router;
