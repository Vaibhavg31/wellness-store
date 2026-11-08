import { Router } from 'express';
import crypto from 'node:crypto';
import { HttpError } from '../lib/response.js';
import { generateId, getPool } from '../lib/db.js';
import { requirePartner } from '../lib/apiKeys.js';
import { orderForApi, API_VERSION } from '../lib/webhooks.js';
import { validateAddress, normalizeAddress } from '../lib/addressHelper.js';
import { decrementStock, restoreStockItems } from '../lib/orderStock.js';
import { CANCEL_REASONS, CANCELLABLE_STATUSES, reasonLabel } from '../lib/orderReasons.js';
import { round2 } from '../lib/pricing.js';
import { OrderRepository } from '../repositories/orderRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { CouponService } from '../services/couponService.js';
import * as emailService from '../services/emailService.js';

/**
 * Partner API, version 1 — /api/v1/…  (full guide: docs/partner-api.md)
 *
 * For other businesses' systems, not browsers: every call carries the partner's key ("Authorization: Bearer ck_live_…").
 * A partner sees the published catalogue and only its own orders. Prices always come from this shop's database (the list
 * price of the product or pack size); a partner cannot send its own prices. Every order needs the partner's own order
 * number (externalRef): sending the same one again returns the order already made instead of making a second one, so a
 * partner can safely retry after a timeout.
 *
 * Errors are JSON: { "error": "A sentence a person can read", "code": "short_machine_code" }.
 */

const router = Router();
const orders = new OrderRepository();
const products = new ProductRepository();
const couponService = new CouponService();

const MAX_LINES = 50;
const MAX_QTY = 100;
const ORDER_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];
const CODE_FOR_STATUS = { 400: 'invalid_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 409: 'conflict', 429: 'rate_limited' };

/** Like asyncRoute, but every answer carries a request id, and errors carry a machine code too. */
function apiRoute(handler) {
    return async (req, res) => {
        const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
        res.set('X-Request-Id', requestId);
        res.set('Chikit-Api-Version', API_VERSION);
        res.set('Cache-Control', 'no-store');
        try {
            await handler(req, res);
        } catch (err) {
            if (err?.statusCode) {
                if (err.statusCode === 429) res.set('Retry-After', '60');
                return res.status(err.statusCode).json({ error: err.message, code: err.code || CODE_FOR_STATUS[err.statusCode] || 'error', requestId });
            }
            console.error(`[partner-api] ${requestId}`, err);
            res.status(500).json({ error: 'Something went wrong on our side. Please try again; if it keeps happening, send us this request id.', code: 'server_error', requestId });
        }
    };
}

const bad = (message, code = 'invalid_request') => new HttpError(message, 400, code);
const text = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// ── Catalogue ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function siteUrl() {
    return (process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
}

function absolute(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const site = siteUrl();
    return site ? `${site}${url.startsWith('/') ? '' : '/'}${url}` : url;
}

function productForApi(p) {
    const variants = (p.variants ?? []).map((v) => ({
        id: v.id, sku: v.sku || null, label: v.label, netQuantity: v.netQuantity || null, price: Number(v.price), originalPrice: Number(v.originalPrice || v.price),
        stock: Math.max(0, Number(v.stock)), inStock: Number(v.stock) > 0, isDefault: Boolean(v.isDefault), image: absolute(v.image),
    }));
    return {
        id: p.id, title: p.title, category: p.category ?? null, description: p.description ?? '',
        url: siteUrl() ? `${siteUrl()}/product/${encodeURIComponent(p.id)}` : null,
        images: (p.images ?? []).map(absolute),
        price: Number(p.price), originalPrice: Number(p.originalPrice || p.price), currency: 'INR',
        stock: Math.max(0, Number(p.stock)), inStock: Number(p.stock) > 0,
        codAvailable: p.codEnabled !== false,
        hasVariants: variants.length > 0, variants,
        updatedAt: p.updatedAt ?? p.createdAt ?? null,
    };
}

router.get('/v1/me', apiRoute(async (req, res) => {
    const partner = await requirePartner(req);
    res.json({ id: partner.id, name: partner.name, scopes: partner.scopes, allowedPayments: partner.allowedPayments, apiVersion: API_VERSION });
}));

router.get('/v1/products', apiRoute(async (req, res) => {
    await requirePartner(req, 'products:read');
    const list = await products.getPublished();
    list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    res.json({ data: list.map(productForApi) });
}));

router.get('/v1/products/:id', apiRoute(async (req, res) => {
    await requirePartner(req, 'products:read');
    const product = await products.getPublicById(String(req.params.id));
    if (!product) throw new HttpError('No published product has that id.', 404, 'product_not_found');
    res.json(productForApi(product));
}));

// ── Building an order ─────────────────────────────────────────────────────────────────────────────────────────────────

async function productForSku(sku) {
    const [rows] = await getPool().query('SELECT product_id, id FROM product_variants WHERE sku = ? LIMIT 2', [sku]);
    if (rows.length !== 1) return null; // unknown, or the same SKU on two packs (then productId + variantId must be used)
    return { productId: rows[0].product_id, variantId: rows[0].id };
}

/** Prices every line from the database at the product's (or pack size's) list price, and checks it is in stock. */
async function buildItems(rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw bad('"items" must be a list with at least one line.');
    if (rawItems.length > MAX_LINES) throw bad(`Up to ${MAX_LINES} lines per order.`);
    const built = [];
    const wanted = new Map(); // same product / pack on two lines: their total must be in stock
    for (const [index, line] of rawItems.entries()) {
        const where = `items[${index}]`;
        if (!isPlainObject(line)) throw bad(`${where} must be an object.`);
        const qty = ['number', 'string'].includes(typeof line.quantity) ? Number(line.quantity) : NaN;
        if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw bad(`${where}.quantity must be a whole number from 1 to ${MAX_QTY}.`);

        let productId = text(line.productId);
        let variantId = text(line.variantId);
        const sku = text(line.sku);
        if (sku && !productId) {
            const found = await productForSku(sku);
            if (!found) throw bad(`${where}: no single pack size has the SKU "${sku.slice(0, 60)}". Use productId and variantId instead.`, 'unknown_sku');
            ({ productId, variantId } = found);
        }
        if (!productId) throw bad(`${where} needs a "productId" (and "variantId" for a pack size) or a "sku".`);

        const product = await products.getPublicById(productId);
        if (!product) throw bad(`${where}: no published product has the id "${productId.slice(0, 64)}".`, 'product_not_found');
        if (product.hasVariants && !variantId) {
            throw bad(`${where}: "${product.title}" comes in pack sizes, so "variantId" is needed (see GET /api/v1/products/${product.id}).`, 'variant_required');
        }
        const variant = variantId ? await products.getVariant(productId, variantId) : null;
        if (variantId && !variant) throw bad(`${where}: "${product.title}" has no pack size with the id "${variantId.slice(0, 64)}".`, 'variant_not_found');

        const key = variant ? `v:${variant.id}` : `p:${product.id}`;
        const total = (wanted.get(key) ?? 0) + qty;
        wanted.set(key, total);
        const stock = variant ? Number(variant.stock) : Number(product.stock || 0);
        const title = variant ? `${product.title} — ${variant.label}` : product.title;
        if (stock < total) throw new HttpError(stock <= 0 ? `"${title}" is out of stock.` : `Only ${stock} of "${title}" are in stock.`, 409, 'out_of_stock');

        built.push({
            productId: product.id, variantId: variant?.id ?? null, variantLabel: variant?.label ?? null,
            title, price: round2(variant ? Number(variant.price) : Number(product.price || 0)), quantity: qty,
            image: (variant?.image || product.images?.[0]) ?? '', codEnabled: product.codEnabled !== false,
        });
    }
    const subtotal = round2(built.reduce((sum, i) => sum + i.price * i.quantity, 0));
    return { items: built, subtotal };
}

function readPayment(body, partner, items, settings) {
    const payment = text(body.payment || 'prepaid').toLowerCase();
    if (!['prepaid', 'cod'].includes(payment)) throw bad('"payment" must be "prepaid" or "cod".');
    if (!partner.allowedPayments.includes(payment)) throw new HttpError(`This API key may not place "${payment}" orders. Allowed: ${partner.allowedPayments.join(', ')}.`, 403, 'payment_not_allowed');
    if (payment === 'cod') {
        if (settings.payments?.codEnabled === false) throw bad('Cash on delivery is switched off in the shop at the moment.', 'cod_unavailable');
        const blocked = items.find((i) => !i.codEnabled);
        if (blocked) throw bad(`Cash on delivery is not available for "${blocked.title}".`, 'cod_unavailable');
    }
    return payment;
}

function readCustomer(body) {
    const customer = isPlainObject(body.customer) ? body.customer : {};
    const shippingIn = isPlainObject(body.shipping) ? body.shipping : null;
    if (!shippingIn) throw bad('"shipping" (the delivery address) is required.');
    const name = text(customer.name) || text(shippingIn.name);
    const phone = text(shippingIn.phone) || text(customer.phone);
    const email = text(customer.email).toLowerCase();
    if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw bad('"customer.email" does not look like an email address.');

    const raw = { ...shippingIn, name: shippingIn.name ?? name, phone: shippingIn.phone ?? phone };
    const errors = validateAddress(raw);
    if (!errors.name && !name) errors.name = 'Name is required';
    if (String(raw.phone ?? '').replace(/\D/g, '').length < 10) errors.phone = 'Enter a valid 10-digit mobile number';
    const first = Object.entries(errors)[0];
    if (first) throw bad(`shipping.${first[0]}: ${first[1]}`, 'invalid_address');
    const n = normalizeAddress(raw);
    return { email, shipping: { name: n.name, phone: n.phone, address: n.address, landmark: n.landmark || null, city: n.city, state: n.state, pincode: n.pincode } };
}

function readExternalRef(body) {
    const ref = text(body.externalRef);
    if (!ref) throw bad('"externalRef" (your own order number) is required, so a retried request never makes a second order.', 'external_ref_required');
    if (ref.length > 100 || !/^[A-Za-z0-9._:#/-]+$/.test(ref)) throw bad('"externalRef" may use letters, numbers and . _ : # / - (up to 100 characters).');
    return ref;
}

async function quoteFor(body, partner) {
    const { items, subtotal } = await buildItems(body.items);
    const settings = await new SettingsRepository().get();
    const payment = readPayment(body, partner, items, settings);
    const delivery = await couponService.deliverySettings();
    const deliveryFee = subtotal >= delivery.freeThreshold ? 0 : delivery.fee;
    return { items, subtotal, deliveryFee, total: round2(subtotal + deliveryFee), payment };
}

const publicLines = (items) => items.map((i) => ({ productId: i.productId, variantId: i.variantId, title: i.title, variantLabel: i.variantLabel, quantity: i.quantity, unitPrice: i.price, lineTotal: round2(i.price * i.quantity) }));

// ── Orders ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Prices an order without placing it (nothing is reserved). */
router.post('/v1/orders/quote', apiRoute(async (req, res) => {
    const partner = await requirePartner(req, 'orders:write');
    const body = isPlainObject(req.body) ? req.body : {};
    const q = await quoteFor(body, partner);
    res.json({ currency: 'INR', items: publicLines(q.items), subtotal: q.subtotal, deliveryFee: q.deliveryFee, total: q.total, payment: q.payment });
}));

router.post('/v1/orders', apiRoute(async (req, res) => {
    const partner = await requirePartner(req, 'orders:write');
    const body = isPlainObject(req.body) ? req.body : {};
    const externalRef = readExternalRef(body);

    const replay = async () => {
        const existing = await orders.findByPartnerRef(partner.id, externalRef);
        if (!existing) return false;
        res.set('Idempotent-Replayed', 'true');
        res.status(200).json(orderForApi(existing));
        return true;
    };
    if (await replay()) return;

    const { email, shipping } = readCustomer(body);
    const q = await quoteFor(body, partner);
    const note = text(body.note).slice(0, 500);
    const items = q.items.map(({ codEnabled: _codEnabled, ...line }) => line);

    try {
        await decrementStock(items);
    } catch (err) {
        if (err instanceof HttpError) throw new HttpError('The stock changed while the order was being placed. Please check stock and try again.', 409, 'out_of_stock');
        throw err;
    }

    const now = new Date().toISOString();
    const prepaid = q.payment === 'prepaid';
    const order = {
        id: generateId('order'), orderSource: 'api', apiPartnerId: partner.id, apiPartnerName: partner.name, externalRef,
        userId: '', email, items, subtotal: q.subtotal, discountAmount: 0, deliveryFee: q.deliveryFee, total: q.total,
        status: 'placed', shipping, payment: prepaid ? 'offline' : 'cod', paymentStatus: prepaid ? 'paid' : 'cod',
        createdAt: now, updatedAt: now, createdBy: `partner:${partner.id}`.slice(0, 50),
        statusHistory: [{ status: 'placed', at: now, by: 'partner', note: `Placed by ${partner.name} through the API (their order ${externalRef})` }],
        ...(prepaid ? { paidAt: now } : {}),
        ...(note ? { adminNotes: `Note from ${partner.name}: ${note}` } : {}),
    };

    let created;
    try {
        created = await orders.create(order);
    } catch (err) {
        await restoreStockItems(items);
        // Two requests with the same order number at the same moment: the other one won, so answer with its order.
        if (err?.code === 'ER_DUP_ENTRY' && (await replay())) return;
        throw err;
    }

    if (email) {
        try { await emailService.handleOrderEvent(created, prepaid ? 'confirmed' : 'placed'); } catch (err) { console.error(`[partner-api] order email failed for ${created.id}: ${err?.message || err}`); }
    }
    res.status(201).json(orderForApi(created));
}));

/** The partner's own orders, newest first. ?status=…&updatedSince=ISO&externalRef=…&limit=1-100&offset=… */
router.get('/v1/orders', apiRoute(async (req, res) => {
    const partner = await requirePartner(req, 'orders:read');
    const q = req.query;
    const externalRef = text(q.externalRef);
    if (externalRef) {
        const one = await orders.findByPartnerRef(partner.id, externalRef);
        return res.json({ data: one ? [orderForApi(one)] : [], limit: 1, offset: 0, hasMore: false });
    }
    const status = text(q.status);
    if (status && !ORDER_STATUSES.includes(status)) throw bad(`"status" must be one of: ${ORDER_STATUSES.join(', ')}.`);
    let since = '';
    if (text(q.updatedSince)) {
        const d = new Date(text(q.updatedSince));
        if (Number.isNaN(d.getTime())) throw bad('"updatedSince" must be a date and time, like 2026-11-01T00:00:00Z.');
        since = d.toISOString().slice(0, 19).replace('T', ' ');
    }
    const limit = q.limit === undefined ? 50 : Number(q.limit);
    const offset = q.offset === undefined ? 0 : Number(q.offset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw bad('"limit" must be a whole number from 1 to 100.');
    if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000) throw bad('"offset" must be a whole number, 0 or more.');
    const page = await orders.listForPartner(partner.id, { status, since, limit: limit + 1, offset });
    res.json({ data: page.slice(0, limit).map(orderForApi), limit, offset, hasMore: page.length > limit });
}));

async function ownOrder(partner, id) {
    const order = await orders.getById(String(id));
    // Another partner's (or a website) order looks exactly like a missing one.
    if (!order || order.apiPartnerId !== partner.id) throw new HttpError('No order of yours has that id.', 404, 'order_not_found');
    return order;
}

router.get('/v1/orders/:id', apiRoute(async (req, res) => {
    const partner = await requirePartner(req, 'orders:read');
    res.json(orderForApi(await ownOrder(partner, req.params.id)));
}));

/** Cancels an order that has not shipped yet. Its stock goes back on the shelf. Cancelling twice is harmless. */
router.post('/v1/orders/:id/cancel', apiRoute(async (req, res) => {
    const partner = await requirePartner(req, 'orders:write');
    const order = await ownOrder(partner, req.params.id);
    if (order.status === 'cancelled') return res.json(orderForApi(order));
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new HttpError(`This order is "${order.status}", so it can no longer be cancelled. Please contact the shop.`, 409, 'not_cancellable');
    }
    const body = isPlainObject(req.body) ? req.body : {};
    const reason = reasonLabel(CANCEL_REASONS, text(body.reason)) || 'Cancelled by the partner';
    const note = text(body.note).slice(0, 500);

    await restoreStockItems(order.items ?? []);
    const now = new Date().toISOString();
    const updated = await orders.update(order.id, {
        status: 'cancelled', cancelledAt: now, updatedAt: now, cancelledBy: 'partner', cancelReason: reason, cancelNote: note || null,
        statusHistory: [...(order.statusHistory ?? []), { status: 'cancelled', at: now, by: 'partner', note: `Cancelled by ${partner.name}: ${reason}${note ? ` (${note})` : ''}` }],
    });
    if (updated?.email) {
        try { await emailService.handleOrderEvent(updated, 'cancelled'); } catch (err) { console.error(`[partner-api] cancel email failed for ${updated.id}: ${err?.message || err}`); }
    }
    res.json(orderForApi(updated));
}));

export default router;
