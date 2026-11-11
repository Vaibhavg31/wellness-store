import { Router } from 'express';
import crypto from 'node:crypto';
import { requireCustomer, requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, sendCsv, HttpError } from '../lib/response.js';
import { generateId } from '../lib/db.js';
import { checkRateLimit } from '../lib/rateLimiter.js';
import { exportTablePdf } from '../lib/exportHelper.js';
import { revenueForOrder } from '../lib/orderRevenue.js';
import * as addressBookHelper from '../lib/addressBookHelper.js';
import { validateAddress } from '../lib/addressHelper.js';
import * as otpConfig from '../lib/otpConfig.js';
import { isOtpEnabled } from '../lib/servicesConfig.js';
import { isEmailVerified } from './authRoutes.js';
import { OrderRepository } from '../repositories/orderRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';
import { CouponRepository } from '../repositories/couponRepository.js';
import { BundleRepository } from '../repositories/bundleRepository.js';
import { OfferRepository } from '../repositories/offerRepository.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { CouponService } from '../services/couponService.js';
import * as razorpay from '../services/razorpayService.js';
import * as emailService from '../services/emailService.js';
import { recordPurchase } from '../lib/analytics.js';
import { clubConfig, memberPriceFor } from '../lib/club.js';
import { bogoUnitPrice, mixBoxPricing, round2 } from '../lib/pricing.js';
import { CANCEL_REASONS, CANCELLABLE_STATUSES, RETURN_REASONS, RETURN_WINDOW_DAYS, reasonLabel } from '../lib/orderReasons.js';
import { createPaymentFlow, isAwaitingPayment, paymentDeadline, paymentWindowMinutes } from '../lib/onlinePayments.js';

const router = Router();
const repo = new OrderRepository();
const products = new ProductRepository();
const coupons = new CouponRepository();
const bundles = new BundleRepository();
const offers = new OfferRepository();
const couponService = new CouponService();
const users = new UserRepository();

const ALLOWED_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'out_for_delivery'];

// ── Helpers ──────────────────────────────────────────────────────────────

async function dispatchOrderEmail(order, event, prevStatus = null) {
    try {
        if (event === 'confirmed' && prevStatus !== null) {
            if (order.payment === 'razorpay' && order.paymentStatus === 'paid' && prevStatus === 'confirmed') return;
        }
        const allowed = ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'packed', 'shipped', 'payment_failed'];
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
    if (isAwaitingPayment(order)) order.paymentDeadline = paymentDeadline(order).toISOString();
    return order;
}

/**
 * What the customer sees of their own order: the shop's internal notes, the payment signature and the refund error text
 * stay in the admin. (The admin notes used to be sent to the customer's browser with every order.)
 */
function customerView(order) {
    if (!order) return order;
    const { adminNotes, razorpaySignature, refundError, createdBy, ...rest } = enrichOrder(order); // eslint-disable-line no-unused-vars
    return rest;
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

/**
 * Moving a cancelled website order back to an active status takes its stock (and coupon use) again; otherwise the
 * stock that cancelling returned to the shelf would be sold twice. Refused when the shelf no longer has enough.
 */
async function reserveStockForReopenedOrder(order) {
    if (order.orderSource === 'direct' || !Array.isArray(order.items)) return;
    try {
        await decrementStock(order.items);
    } catch (err) {
        if (err instanceof HttpError) throw new HttpError('Not enough stock to reopen this cancelled order. Restock the items first.', 400);
        throw err;
    }
    const couponId = String(order.couponId || '').trim();
    if (couponId) await couponService.recordUsage(couponId);
}

async function restoreStockForOrder(order) {
    const items = order.items;
    if (!Array.isArray(items)) return;
    await restoreStockItems(items);
}

// Online payment lifecycle (confirm, retry, switch to cash, unpaid timeout, refunds, webhook): see lib/onlinePayments.js.
const paymentFlow = createPaymentFlow({
    statusChange: buildStatusChange,
    restoreStock: restoreStockForOrder,
    releaseCoupon: releaseCouponForOrder,
    sendEmail: dispatchOrderEmail,
    trackPurchase: (order, ids, userId) => trackPurchase(order, ids, userId),
});

/** Cancels orders left unpaid past their payment window (started once from server.js). */
export const startUnpaidOrderSweep = () => paymentFlow.startSweep();
export const sweepUnpaidOrders = () => paymentFlow.sweep();

/** After an order paid online is cancelled or returned: send the money back through Razorpay. Never fails the request. */
async function refundIfPaidOnline(order, reason, by) {
    if (!order || order.payment !== 'razorpay' || order.paymentStatus !== 'paid' || order.refundStatus === 'refunded') return order;
    try {
        return await paymentFlow.refundOrder(order, { reason, by });
    } catch (err) {
        console.error(`[payments] automatic refund failed for ${order.id}: ${err.message}`);
        return (await repo.getById(order.id)) || order;
    }
}

/** The signed-in customer's own order, or a 404 (never tells whether someone else's order id exists). */
async function ownOrder(req, res) {
    const payload = await requireCustomer(req);
    const order = await repo.getById(String(req.params.id || req.body?.orderId || ''));
    if (!order || order.userId !== payload.userId) {
        sendError(res, 'Order not found', 404);
        return null;
    }
    return { payload, order };
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

/**
 * Prices every bag line from the database (never from what the browser sent) and checks stock.
 * Lines can be priced four ways: a bundle's share, an offer page (Buy 1 Get 1 pairs, Pick & Mix boxes), the Chikit Club
 * member price (members only), or the plain price. Offers and the club price never stack on the same line; a member's Pick & Mix
 * box is priced the better of the box price and the Club prices of the same products (mixBoxPricing).
 */
async function validateAndBuildItems(rawItems, { isMember = false } = {}) {
    if (rawItems.length === 0) throw new HttpError('Your bag is empty', 400);

    const club = await clubConfig();
    const offerCache = new Map();
    const liveOffer = async (offerId) => {
        if (!offerCache.has(offerId)) offerCache.set(offerId, await offers.getByIdLive(offerId));
        const offer = offerCache.get(offerId);
        if (!offer) throw new HttpError('One of the offers in your bag has ended. Please update your bag.', 400);
        return offer;
    };

    const built = [];
    const mixLines = new Map(); // "offerId|group" → [{ index, listPrice, offer, productId }]

    for (const line of rawItems) {
        if (!line || typeof line !== 'object') throw new HttpError('One of the items in your bag is not valid. Please update your bag.', 400);

        const productId = String(line.productId || '');
        const variantId = String(line.variantId || '').trim();
        const bundleId = String(line.bundleId || '').trim();
        const offerId = String(line.offerId || '').trim();
        // Only a whole number counts: "abc", true, {}, Infinity and "1.5" used to slip through parseInt as NaN / a silent 1.
        const qty = ['number', 'string'].includes(typeof line.quantity) ? Number(line.quantity) : NaN;

        if (!productId || !Number.isInteger(qty) || qty < 1) throw new HttpError('Each item in your bag needs a quantity of at least 1. Please update your bag.', 400);
        // Nobody needs more than 9 of one item (a Buy 1 Get 1 line holds the free ones too, so 18). Bundles have their own fixed quantity.
        if (!bundleId && qty > (offerId ? 18 : 9)) throw new HttpError(`You can order up to 9 of one item. Please lower the quantity.`, 400);

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

        const listPrice = variant ? variant.price : Number(product.price || 0);
        const memberUnit = variant
            ? memberPriceFor({ price: variant.price, clubPrice: variant.clubPrice, eligible: product.clubEligible !== false }, club)
            : product.memberPrice;
        let price = listPrice;
        let offerRef = null;

        if (offerId) {
            const offer = await liveOffer(offerId);
            if (!(offer.allProducts || offer.productIds.includes(productId))) throw new HttpError(`"${title}" is not part of the "${offer.title}" offer`, 400);
            if (offer.kind === 'bogo') {
                if (qty % 2 !== 0) throw new HttpError(`"${title}" is Buy 1 Get 1 Free: please add it in pairs`, 400);
                price = bogoUnitPrice(listPrice);
            } else if (offer.kind === 'mix_match') {
                if (qty !== 1) throw new HttpError(`Each product can be picked once in "${offer.title}"`, 400);
                const key = `${offerId}|${String(line.offerGroup || 'box')}`;
                if (!mixLines.has(key)) mixLines.set(key, []);
                mixLines.get(key).push({ index: built.length, listPrice, memberUnit, offer, productId });
            } else {
                throw new HttpError(`"${offer.title}" is not a pricing offer`, 400);
            }
            offerRef = offer;
        } else if (isMember) {
            if (memberUnit) price = memberUnit;
        }

        built.push({
            productId, variantId: variant?.id ?? null, variantLabel: variant?.label ?? null,
            title: displayTitle, price, quantity: qty, image: product.images?.[0] ?? (line.image ?? ''),
            ...(offerRef ? { offerId: offerRef.id, offerTitle: offerRef.title } : {}),
            ...(!offerRef && price < listPrice ? { offerTitle: club.cardName } : {}),
        });
    }

    // Each Pick & Mix box must hold exactly the offer's number of different products; its lines are then priced as one box.
    for (const group of mixLines.values()) {
        const { offer } = group[0];
        if (group.length !== offer.pickCount) throw new HttpError(`Your "${offer.title}" box needs exactly ${offer.pickCount} different products`, 400);
        if (new Set(group.map((g) => g.productId)).size !== group.length) throw new HttpError('Each product can only be picked once in a box', 400);
        // A member pays the lower of the box price and the Club prices of the same products (see mixBoxPricing).
        const { units, byClub } = mixBoxPricing(group.map((g) => g.listPrice), group.map((g) => g.memberUnit), offer.price, isMember);
        // The box price is a saving, so the picks must be worth at least that much; a cheaper trio is just bought one by one.
        const worth = round2(group.reduce((sum, g) => sum + g.listPrice, 0));
        if (worth < offer.price) throw new HttpError(`The "${offer.title}" box needs products worth at least ₹${Math.round(offer.price)} (yours come to ₹${Math.round(worth)}). Please swap in a pricier product.`, 400);
        group.forEach((g, i) => {
            built[g.index].price = units[i];
            if (byClub) built[g.index].offerTitle = club.cardName;
        });
    }

    const subtotal = built.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { items: built, subtotal: round2(subtotal) };
}

async function buildDirectOrderItems(rawItems) {
    if (rawItems.length === 0) throw new HttpError('At least one item is required', 400);

    const built = [];
    let subtotal = 0;

    for (const line of rawItems) {
        if (!line || typeof line !== 'object') throw new HttpError('Invalid line item', 400);

        const title = String(line.title || '').trim();
        const qty = ['number', 'string'].includes(typeof line.quantity) ? Number(line.quantity) : NaN;
        const price = Number(line.price || 0);
        let productId = String(line.productId || '').trim();

        if (!title || !Number.isInteger(qty) || qty < 1) throw new HttpError('Each item needs a title and a whole-number quantity ≥ 1', 400);
        if (!Number.isFinite(price) || price < 0) throw new HttpError('Item price must be a number that is not negative', 400);

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

/** Funnel analytics: best-effort — a sale must never fail because the visit could not be recorded. */
async function trackPurchase(order, ids, userId) {
    try {
        await recordPurchase({ visitorId: ids?.visitorId, sessionId: ids?.sessionId, userId: userId || null, order });
    } catch (err) {
        console.error('[analytics] could not record purchase:', err.message);
    }
}

router.get('/orders', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const orders = await repo.getByUserId(payload.userId);
    sendJson(res, orders.map(customerView));
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
        'Payment Status', 'Coupon', 'Tracking', 'Carrier', 'User ID', 'Cancel Reason', 'Return Status', 'Return Reason'];

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
            order.cancelReason || '', order.returnStatus || '', order.returnReason || '',
        ];
    });

    const from = filters.from || 'all';
    const to = filters.to || 'all';
    const baseName = `chikit-orders-${from}-to-${to}`;

    if (format === 'pdf') return exportTablePdf(res, `${baseName}.pdf`, 'Orders Export', headers, rows);
    sendCsv(res, `${baseName}.csv`, headers, rows);
}, 'Failed to export orders'));

router.post('/orders/admin/create-direct', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    if (!Array.isArray(body.items) || body.items.length === 0) return sendError(res, 'Add at least one item to the order', 400);

    const { items, subtotal } = await buildDirectOrderItems(body.items);

    const shipping = body.shipping && typeof body.shipping === 'object' ? body.shipping : {};
    const name = String(shipping.name || '').trim();
    const phone = String(shipping.phone || '').trim();
    if (!name || !phone) return sendError(res, 'Customer name and phone are required', 400);

    const discountAmount = Math.max(0, Number(body.discountAmount || 0));
    const deliveryFee = Math.max(0, Number(body.deliveryFee || 0));
    if (!Number.isFinite(discountAmount) || !Number.isFinite(deliveryFee)) return sendError(res, 'Discount and delivery fee must be numbers', 400);
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

/** The short lists the cancel / return forms offer, and the rules around them, so the storefront and admin never drift from the server. */
router.get('/orders/reasons', asyncRoute(async (req, res) => {
    sendJson(res, { cancel: CANCEL_REASONS, return: RETURN_REASONS, returnWindowDays: RETURN_WINDOW_DAYS, cancellableStatuses: CANCELLABLE_STATUSES });
}, 'Failed to load reasons'));

router.get('/orders/admin/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const order = await repo.getById(req.params.id);
    if (!order) return sendError(res, 'Order not found', 404);
    sendJson(res, enrichOrder(order));
}, 'Failed to fetch order'));

router.get('/orders/:id', asyncRoute(async (req, res) => {
    const own = await ownOrder(req, res);
    if (!own) return;
    sendJson(res, customerView(own.order));
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

    // An online order that is still waiting for its payment can only be cancelled: confirming or shipping it would send
    // goods that were never paid for. (Once paid it is confirmed on its own; or the customer switches it to cash on delivery.)
    if (isAwaitingPayment(existing) && status !== 'cancelled' && status !== prev) {
        return sendError(res, 'This order is still waiting for its online payment. It confirms itself once paid; you can only cancel it until then.', 400);
    }
    if (isAwaitingPayment(existing) && status === 'cancelled') {
        const picked = reasonLabel(CANCEL_REASONS, String(body.reason || '')) || 'Cancelled by the shop';
        const result = await paymentFlow.cancelUnpaid(existing, { by: 'admin', reason: picked, note: note || 'Cancelled by admin before payment' });
        if (!result.cancelled && result.paid) return sendError(res, 'The customer has just paid for this order, so it was confirmed instead of cancelled. Cancel it again if you still need to (the money is then refunded).', 409);
        return sendJson(res, enrichOrder(result.order));
    }

    if (status === 'cancelled' && prev !== 'cancelled') {
        await restoreStockForOrder(existing);
        await releaseCouponForOrder(existing);
    } else if (prev === 'cancelled' && status !== 'cancelled') {
        if (existing.payment === 'razorpay' && existing.paymentStatus !== 'paid') return sendError(res, 'This online order was never paid, so it cannot be reopened. Ask the customer to order again.', 400);
        if (existing.payment === 'razorpay' && ['refunded', 'pending', 'processing'].includes(existing.refundStatus)) return sendError(res, 'This order\'s payment has been refunded, so it cannot be reopened.', 400);
        await reserveStockForReopenedOrder(existing);
    }

    const changes = buildStatusChange(existing, status, note || null, 'admin');
    if (status === 'cancelled' && prev !== 'cancelled') {
        changes.cancelledBy = 'admin';
        const picked = reasonLabel(CANCEL_REASONS, String(body.reason || ''));
        if (picked) changes.cancelReason = picked;
        if (note) changes.cancelNote = note.slice(0, 500);
    }
    let updated = await repo.update(req.params.id, changes);
    if (updated && prev !== status) await dispatchOrderEmail(updated, status, prev);
    // A paid online order that the shop cancels gets its money back straight away (body.refund: false to refund by hand).
    if (updated && status === 'cancelled' && prev !== 'cancelled' && body.refund !== false) updated = await refundIfPaidOnline(updated, 'Order cancelled by the shop', 'admin');

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
    const skipped = [];
    for (const rawId of ids) {
        const id = String(rawId);
        const existing = await repo.getById(id);
        if (!existing) continue;

        const prev = existing.status || '';
        if (isAwaitingPayment(existing)) {
            if (status !== 'cancelled') { skipped.push({ id, error: 'Still waiting for its online payment' }); continue; }
            const result = await paymentFlow.cancelUnpaid(existing, { by: 'admin', reason: 'Cancelled by the shop', note: note || 'Bulk update' });
            if (result.cancelled) updated.push(enrichOrder(result.order));
            else skipped.push({ id, error: result.paid ? 'The customer has just paid; it was confirmed instead' : 'Could not cancel' });
            continue;
        }
        if (status === 'cancelled' && prev !== 'cancelled') {
            await restoreStockForOrder(existing);
            await releaseCouponForOrder(existing);
        } else if (prev === 'cancelled' && status !== 'cancelled') {
            if (existing.payment === 'razorpay' && (existing.paymentStatus !== 'paid' || ['refunded', 'pending', 'processing'].includes(existing.refundStatus))) {
                skipped.push({ id, error: 'An unpaid or refunded online order cannot be reopened' });
                continue;
            }
            try {
                await reserveStockForReopenedOrder(existing);
            } catch (err) {
                if (err instanceof HttpError) { skipped.push({ id, error: err.message }); continue; }
                throw err;
            }
        }

        const changes = buildStatusChange(existing, status, note || 'Bulk update', 'admin');
        if (status === 'cancelled' && prev !== 'cancelled') changes.cancelledBy = 'admin';
        let result = await repo.update(id, changes);
        if (result) {
            if (prev !== status) await dispatchOrderEmail(result, status, prev);
            if (status === 'cancelled' && prev !== 'cancelled') result = await refundIfPaidOnline(result, 'Order cancelled by the shop', 'admin');
            updated.push(enrichOrder(result));
        }
    }

    sendJson(res, { updated: updated.length, orders: updated, skipped });
}, 'Failed to bulk update orders'));

router.post('/orders/admin/bulk-refund', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const note = String(body.note || 'Refund processed').trim();

    if (ids.length === 0) return sendError(res, 'ids array is required', 400);

    const updated = [];
    const failed = [];
    for (const rawId of ids) {
        const id = String(rawId);
        let existing = await repo.getById(id);
        if (!existing) continue;
        if (existing.refundStatus === 'refunded') { updated.push(enrichOrder(existing)); continue; }
        if (existing.payment === 'razorpay' && existing.paymentStatus !== 'paid') { failed.push({ id, error: 'This online order was never paid, so there is nothing to refund' }); continue; }

        // Paid online: the money goes back through Razorpay; the order is then marked returned (unless already cancelled/returned).
        if (existing.payment === 'razorpay') {
            try {
                existing = await paymentFlow.refundOrder(existing, { reason: note, by: 'admin' });
            } catch (err) {
                failed.push({ id, error: err.message });
                continue;
            }
            if (!['cancelled', 'returned'].includes(existing.status || '')) existing = await repo.update(id, buildStatusChange(existing, 'returned', note, 'admin'));
            updated.push(enrichOrder(existing));
            continue;
        }

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

    sendJson(res, { updated: updated.length, orders: updated, failed });
}, 'Failed to process refunds'));

/** Admin: refund one order paid online, through Razorpay (full amount). */
router.post('/orders/admin/:id/refund', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const order = await repo.getById(req.params.id);
    if (!order) return sendError(res, 'Order not found', 404);
    const reason = String(req.body?.note || 'Refund by the shop').trim().slice(0, 200) || 'Refund by the shop';
    try {
        sendJson(res, enrichOrder(await paymentFlow.refundOrder(order, { reason, by: 'admin' })));
    } catch (err) {
        sendError(res, err.message, 400);
    }
}, 'Failed to refund order'));

/** Admin: ask Razorpay how an online order's payment stands right now (confirms it if the money did arrive). */
router.post('/orders/admin/:id/check-payment', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const order = await repo.getById(req.params.id);
    if (!order) return sendError(res, 'Order not found', 404);
    if (order.payment !== 'razorpay') return sendError(res, 'This order is not paid online', 400);
    const result = await paymentFlow.reconcile(order);
    sendJson(res, { state: result.state, error: result.error || null, order: enrichOrder(result.order || order) });
}, 'Failed to check payment'));

/**
 * The checkout reports a successful payment. The signature proves it came from Razorpay for this order; the order is then
 * confirmed once (the webhook may have done it already). If the order had stopped waiting (cancelled, or the hold ran out),
 * the money is refunded automatically and the customer is told.
 */
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
    if (!order.razorpayOrderId) return sendError(res, 'Order is not a Razorpay payment', 400);
    if (order.razorpayOrderId !== razorpayOrderId) return sendError(res, 'Razorpay order mismatch', 400);
    if (!razorpay.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) return sendError(res, 'Invalid payment signature', 400);

    const updated = await paymentFlow.markPaid(order, { paymentId: razorpayPaymentId, signature: razorpaySignature, analytics: body.analytics, userId: payload.userId, via: 'checkout' });
    if (updated && (updated.status === 'cancelled' || updated.payment !== 'razorpay')) {
        return sendJson(res, {
            error: updated.payment !== 'razorpay'
                ? 'This order was already switched to Cash on Delivery, so your online payment is being refunded. It reaches your account in 5 to 7 working days.'
                : 'This order had already been cancelled, so your payment is being refunded. It reaches your account in 5 to 7 working days.',
            code: 'PAYMENT_REFUNDED', order: customerView(updated),
        }, 409);
    }
    sendJson(res, customerView(updated));
}, 'Failed to verify payment'));

/**
 * Razorpay's server-to-server notice (Dashboard → Settings → Webhooks → https://<site>/api/webhooks/razorpay). Handles
 * payment.authorized / payment.captured / order.paid (confirm), payment.failed (remember why), and refund.* (refund state).
 * A 500 makes Razorpay send it again later, which is what we want when the database is briefly unavailable.
 */
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

    try {
        const note = await paymentFlow.handleWebhook(String(payload.event || ''), payload);
        sendJson(res, { ok: true, note });
    } catch (err) {
        console.error('[payments] webhook failed:', err.message);
        sendError(res, 'Failed to process webhook', 500);
    }
}, 'Failed to process webhook'));

// ── Paying for an order that is waiting for its online payment ─────────

/** Try again: reopens Razorpay for the same order (same amount, same Razorpay order, so it can never be paid twice over). */
router.post('/orders/:id/pay', asyncRoute(async (req, res) => {
    const own = await ownOrder(req, res);
    if (!own) return;
    let { order } = own;
    if (!(await checkRateLimit(`pay-${order.id}`, 20, 900))) return sendError(res, 'Too many payment attempts. Please wait a few minutes.', 429);
    if (order.paymentStatus === 'paid' && order.status !== 'cancelled') return sendJson(res, { paid: true, order: customerView(order) });
    if (!isAwaitingPayment(order)) return sendError(res, order.status === 'cancelled' ? 'This order was cancelled, so it can no longer be paid. Please place it again from your bag.' : 'This order is not waiting for an online payment.', 400);
    if (!razorpay.isRazorpayConfigured()) return sendError(res, 'Online payment is temporarily unavailable. You can switch this order to Cash on Delivery.', 503);

    // Money may already be on its way (a UPI app finishing late): check before opening a second payment.
    const check = await paymentFlow.reconcile(order);
    if (check.state === 'paid') return sendJson(res, { paid: true, order: customerView(check.order) });
    order = check.order || order;
    if (paymentDeadline(order).getTime() <= Date.now()) {
        const closed = await paymentFlow.cancelUnpaid(order, { by: 'system', reason: 'Payment not completed', email: 'payment_failed', note: `No payment within ${paymentWindowMinutes()} minutes, so the order was cancelled and its items released.` });
        if (closed.paid) return sendJson(res, { paid: true, order: customerView(closed.order) });
        return sendError(res, 'The time to pay for this order has run out, so it was cancelled and its items released. Please place it again from your bag.', 410);
    }
    order = await repo.update(order.id, { paymentAttempts: (order.paymentAttempts || 1) + 1, updatedAt: new Date().toISOString() });
    sendJson(res, {
        paid: false,
        order: customerView(order),
        razorpay: { keyId: razorpay.publicKeyId(), orderId: order.razorpayOrderId, amount: order.razorpayAmount ?? Math.round(order.total * 100), currency: 'INR' },
    });
}, 'Failed to start the payment'));

/** The Razorpay window reported a failed try. The order keeps waiting; the reason is shown on the order page and in the admin. */
router.post('/orders/:id/payment-failed', asyncRoute(async (req, res) => {
    const own = await ownOrder(req, res);
    if (!own) return;
    const err = req.body?.error && typeof req.body.error === 'object' ? req.body.error : {};
    const paymentId = String(err.metadata?.payment_id || req.body?.paymentId || '').slice(0, 100) || null;
    const updated = await paymentFlow.recordFailure(own.order, { description: String(err.description || '').slice(0, 250), reason: String(err.reason || '').slice(0, 100) }, paymentId);
    sendJson(res, customerView(updated));
}, 'Failed to record the payment'));

/** After the Razorpay window closes without a success: ask Razorpay whether the money arrived anyway. */
router.post('/orders/:id/check-payment', asyncRoute(async (req, res) => {
    const own = await ownOrder(req, res);
    if (!own) return;
    if (!(await checkRateLimit(`paycheck-${own.order.id}`, 30, 600))) return sendError(res, 'Please wait a moment and try again.', 429);
    const result = await paymentFlow.reconcile(own.order);
    sendJson(res, { state: result.state, order: customerView(result.order || own.order) });
}, 'Failed to check the payment'));

/** Pay on delivery instead: an unpaid online order becomes a Cash on Delivery order (when the shop and every item allow it). */
router.post('/orders/:id/pay-on-delivery', asyncRoute(async (req, res) => {
    const own = await ownOrder(req, res);
    if (!own) return;
    const check = await paymentFlow.reconcile(own.order);
    if (check.state === 'paid') return sendJson(res, customerView(check.order));
    const order = check.order || own.order;
    if (!isAwaitingPayment(order)) return sendError(res, order.status === 'cancelled' ? 'This order was cancelled, so it can no longer be changed.' : 'This order is not waiting for an online payment.', 400);
    await validatePaymentMethod('cod', order.items || []);

    const now = new Date().toISOString();
    const won = await repo.updateIf(order.id, { payment: 'razorpay', paymentStatus: 'pending', status: 'placed' }, { payment: 'cod', paymentStatus: 'cod', updatedAt: now });
    if (!won) return sendJson(res, customerView(await repo.getById(order.id)));
    const updated = await repo.update(order.id, {
        paymentError: null,
        statusHistory: [...(order.statusHistory ?? []), { status: 'payment_changed', at: now, by: 'customer', note: 'Switched to Cash on Delivery' }],
    });
    await trackPurchase(updated, req.body?.analytics, own.payload.userId);
    await dispatchOrderEmail(updated, 'placed');
    sendJson(res, customerView(updated));
}, 'Failed to switch to Cash on Delivery'));

// ── Guest order tracking ────────────────────────────────────────────────
// Public lookup for customers who ordered without signing in (or lost access): they must supply the order id
// AND the email or phone number used on the order. Rate-limited, and every failure returns the same generic
// 404 so the endpoint can't be used to discover which order ids exist.

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');
const last10 = (value) => digitsOnly(value).slice(-10);

function publicTrackingView(order) {
    const o = enrichOrder(order);
    return {
        id: o.id,
        status: o.status,
        statusHistory: (o.statusHistory ?? []).map((h) => ({ status: h.status, at: h.at })),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        payment: o.payment,
        paymentStatus: o.paymentStatus,
        subtotal: o.subtotal,
        discountAmount: o.discountAmount,
        deliveryFee: o.deliveryFee,
        couponCode: o.couponCode,
        total: o.total,
        items: (o.items ?? []).map((i) => ({ title: i.title, image: i.image, quantity: i.quantity, price: i.price, variantLabel: i.variantLabel })),
        shipping: { city: o.shipping?.city ?? '', state: o.shipping?.state ?? '', pincode: o.shipping?.pincode ?? '' },
    };
}

router.post('/orders/track', asyncRoute(async (req, res) => {
    const ip = String(req.ip || req.socket?.remoteAddress || 'unknown');
    if (!(await checkRateLimit(`track-${ip}`, 10, 900))) return sendError(res, 'Too many attempts. Please try again in a few minutes.', 429);

    const orderId = String(req.body?.orderId ?? '').trim().replace(/^#/, '');
    const contact = String(req.body?.contact ?? '').trim();
    if (!orderId || !contact) return sendError(res, 'Enter your order ID and the email or phone number used on the order.', 400);

    const notFound = () => sendError(res, "We couldn't find an order matching those details. Check the order ID and the email or phone number you used.", 404);
    const order = await repo.getById(orderId);
    if (!order) return notFound();

    const emailMatch = contact.includes('@') && String(order.email ?? '').toLowerCase().trim() === contact.toLowerCase();
    const phoneMatch = !contact.includes('@') && last10(contact).length === 10 && last10(order.shipping?.phone) === last10(contact);
    if (!emailMatch && !phoneMatch) return notFound();

    sendJson(res, publicTrackingView(order));
}, 'Failed to look up order'));

/** Reads { reason, note } from a request: a known reason id, and a note that "Other" must have. Returns { label, note }. */
function readReason(body, list) {
    const label = reasonLabel(list, String(body?.reason || ''));
    if (!label) throw new HttpError('Please choose a reason.', 400);
    const note = String(body?.note || '').trim().slice(0, 500);
    if (body.reason === 'other' && note.length < 3) throw new HttpError('Please tell us a little more about the reason.', 400);
    return { label, note };
}

function deliveredAt(order) {
    const entries = (order.statusHistory ?? []).filter((h) => h.status === 'delivered');
    return entries.length > 0 ? entries[entries.length - 1].at : order.updatedAt;
}

/** A customer cancels their own order, before it ships. Stock and the coupon come back; an online payment is flagged for refund. */
router.post('/orders/:id/cancel', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const order = await repo.getById(req.params.id);
    if (!order || order.userId !== payload.userId) return sendError(res, 'Order not found', 404);
    if (order.status === 'cancelled') return sendError(res, 'This order is already cancelled.', 400);
    if (!CANCELLABLE_STATUSES.includes(order.status)) return sendError(res, 'This order has already been shipped, so it can no longer be cancelled. You can ask for a return after it is delivered.', 400);
    const { label, note } = readReason(req.body, CANCEL_REASONS);

    // Not paid yet: Razorpay is asked first (a late payment confirms the order instead), then stock and coupon go back.
    if (isAwaitingPayment(order)) {
        const result = await paymentFlow.cancelUnpaid(order, { by: 'customer', reason: label, note: `Cancelled by the customer: ${label}${note ? ` (${note})` : ''}` });
        if (!result.cancelled && result.paid) return sendError(res, 'Your payment for this order has just come through, so it is confirmed. You can still cancel it from this page; the money is then refunded.', 409);
        if (result.cancelled && note) await repo.update(order.id, { cancelNote: note });
        return sendJson(res, customerView(await repo.getById(order.id)));
    }

    // One cancel only: two taps (or two tabs) at the same moment must not put the stock back twice.
    const now = new Date().toISOString();
    if (!(await repo.updateIf(order.id, { status: order.status }, { status: 'cancelled', cancelledAt: now, updatedAt: now }))) {
        return sendError(res, 'This order was just updated. Please refresh the page.', 409);
    }
    await restoreStockForOrder(order);
    await releaseCouponForOrder(order);
    const changes = buildStatusChange(order, 'cancelled', `Cancelled by the customer: ${label}${note ? ` (${note})` : ''}`, 'customer');
    changes.cancelReason = label;
    changes.cancelNote = note || null;
    changes.cancelledBy = 'customer';
    let updated = await repo.update(order.id, changes);
    if (updated) await dispatchOrderEmail(updated, 'cancelled', order.status);
    // Paid online: the refund goes back to the same card / UPI / bank account, automatically.
    updated = await refundIfPaidOnline(updated, `Cancelled by the customer: ${label}`, 'customer');
    sendJson(res, customerView(updated));
}, 'Failed to cancel order'));

/** A customer asks to return a delivered order (within the return window). The shop then approves or declines it in Admin. */
router.post('/orders/:id/return', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const order = await repo.getById(req.params.id);
    if (!order || order.userId !== payload.userId) return sendError(res, 'Order not found', 404);
    if (order.status !== 'delivered') return sendError(res, 'A return can be asked for once the order is delivered.', 400);
    if (order.returnStatus) return sendError(res, 'A return has already been requested for this order.', 400);
    const since = deliveredAt(order);
    if (since && Date.now() - new Date(since).getTime() > RETURN_WINDOW_DAYS * 86_400_000) {
        return sendError(res, `The ${RETURN_WINDOW_DAYS}-day return window for this order has passed.`, 400);
    }
    const { label, note } = readReason(req.body, RETURN_REASONS);

    const now = new Date().toISOString();
    const history = [...(order.statusHistory ?? []), { status: 'return_requested', at: now, by: 'customer', note: `${label}${note ? ` (${note})` : ''}` }];
    const updated = await repo.update(order.id, {
        returnStatus: 'requested', returnReason: label, returnNote: note || null, returnRequestedAt: now, statusHistory: history, updatedAt: now,
    });
    sendJson(res, customerView(updated));
}, 'Failed to request return'));

/** Admin answers a return request: approve, decline (with a reason for the customer), or mark the parcel received (the order becomes Returned). */
router.put('/orders/:id/return', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const existing = await repo.getById(req.params.id);
    if (!existing) return sendError(res, 'Order not found', 404);
    if (!existing.returnStatus) return sendError(res, 'No return was requested for this order.', 400);
    const action = String(req.body?.action || '');
    const note = String(req.body?.note || '').trim().slice(0, 500);
    const next = { approve: 'approved', reject: 'rejected', received: 'received' }[action];
    if (!next) return sendError(res, 'action must be approve, reject or received', 400);
    if (next === 'rejected' && note.length < 3) return sendError(res, 'Please tell the customer why the return is declined.', 400);

    const now = new Date().toISOString();
    const history = [...(existing.statusHistory ?? []), { status: `return_${next}`, at: now, by: 'admin', note }];
    const changes = { returnStatus: next, returnResolvedAt: now, statusHistory: history, updatedAt: now };
    if (next === 'received') {
        Object.assign(changes, buildStatusChange({ ...existing, statusHistory: history }, 'returned', note || 'Return received', 'admin'));
    }
    let updated = await repo.update(existing.id, changes);
    // The returned parcel is in: an online payment is refunded straight away (cash orders are refunded by the shop as before).
    if (next === 'received') updated = await refundIfPaidOnline(updated, 'Return received', 'admin');
    sendJson(res, enrichOrder(updated));
}, 'Failed to update return'));

router.post('/orders/cancel-pending', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const orderId = String(req.body?.orderId || '');
    if (!orderId) return sendError(res, 'orderId is required', 400);

    const order = await repo.getById(orderId);
    if (!order || order.userId !== payload.userId) return sendError(res, 'Order not found', 404);
    if (order.payment !== 'razorpay') return sendError(res, 'Only pending online payments can be cancelled this way', 400);
    if (order.paymentStatus === 'paid') return sendError(res, 'Payment already completed', 400);
    if (order.status === 'cancelled') return sendJson(res, customerView(order));

    const result = await paymentFlow.cancelUnpaid(order, { by: 'customer', reason: 'Payment not completed', note: 'Cancelled by the customer before paying' });
    if (!result.cancelled && result.paid) return sendJson(res, { error: 'Your payment has just come through, so this order is confirmed.', code: 'ALREADY_PAID', order: customerView(result.order) }, 409);
    sendJson(res, customerView(result.order));
}, 'Failed to cancel order'));

router.post('/orders', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const body = req.body || {};
    // The shopper can see this (a bag emptied in another tab), so it is said in their words.
    if (!Array.isArray(body.items) || body.items.length === 0) return sendError(res, 'Your bag is empty', 400);

    const payment = String(body.payment || 'cod').toLowerCase();
    if (!['cod', 'razorpay'].includes(payment)) return sendError(res, 'Invalid payment method', 400);

    // A delivery address is mandatory: the storefront form enforces it, but the server must too (an order with no
    // address, phone or PIN code can never be delivered).
    const shippingInput = body.shipping && typeof body.shipping === 'object' && !Array.isArray(body.shipping) ? body.shipping : {};
    const addressErrors = validateAddress(shippingInput);
    if (String(shippingInput.phone || '').replace(/\D/g, '').length < 10) addressErrors.phone = 'Enter a valid 10-digit mobile number';
    const firstAddressError = Object.values(addressErrors)[0];
    if (firstAddressError) return sendError(res, firstAddressError, 400);

    const buyer = await users.getById(payload.userId || '');
    const validated = await validateAndBuildItems(body.items, { isMember: Boolean(buyer?.clubMember) });
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
    // A coupon only discounts regular-priced lines: offer and bundle lines already carry their own deal.
    const eligibleSubtotal = CouponService.eligibleSubtotalOf(items);

    if (couponCode) {
        // The delivery number counts too: a first-order coupon is not given again to a new account that delivers to a number which has ordered before.
        const validation = await couponService.validate(couponCode, subtotal, payload.userId || '', eligibleSubtotal, { phone: String(shipping.phone || ''), email: String(body.customerEmail || shipping.email || '') });
        if (!validation.valid) throw new HttpError(validation.message || 'Invalid coupon', 400);

        couponRecord = await coupons.findByCode(couponCode);
        const breakdown = validation.breakdown || (await couponService.calculateBreakdown(subtotal, couponRecord || {}, eligibleSubtotal));
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
            // The order (and its stock) is held this long for the payment; after that it is cancelled (lib/onlinePayments.js).
            order.paymentExpiresAt = new Date(Date.now() + paymentWindowMinutes() * 60000).toISOString();
            order.paymentAttempts = 1;
        } catch (err) {
            await restoreStockItems(items);
            if (couponRecord) await couponService.releaseUsage(String(couponRecord.id));
            console.error(`[payments] could not start a Razorpay order for ${orderId}: ${err.message}`);
            return sendError(res, 'We could not start the online payment just now. Please try again, or choose Cash on Delivery.', 502);
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

    // Online payments count as a sale only once the payment is verified (see verify-payment); cash on delivery counts now.
    if (payment !== 'razorpay') await trackPurchase(created, body.analytics, payload.userId);

    if (payment !== 'razorpay') await dispatchOrderEmail(created, 'placed');

    const response = customerView(created);
    if (payment === 'razorpay') response.razorpayKeyId = razorpay.publicKeyId();

    sendJson(res, response, 201);
}, 'Failed to create order'));

export default router;
