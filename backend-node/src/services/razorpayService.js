import crypto from 'node:crypto';
import { httpRequest } from '../lib/httpClient.js';

/**
 * Razorpay REST client: orders, payments (look up, capture), refunds, and the two signature checks.
 * Keys come from the server config (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET); swapping test keys for
 * live keys is a config change and a restart, nothing else.
 */
function keyId() {
    return String(process.env.RAZORPAY_KEY_ID || '').trim();
}
function keySecret() {
    return String(process.env.RAZORPAY_KEY_SECRET || '').trim();
}
function webhookSecret() {
    return String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
}

/** A local stand-in for api.razorpay.com, used by the automated tests. Only honoured in development, never on the live site. */
function apiBase() {
    const override = String(process.env.RAZORPAY_API_BASE || '').trim().replace(/\/+$/, '');
    if (override && (process.env.APP_ENV || '') === 'development') return override;
    return 'https://api.razorpay.com';
}

const looksLikePlaceholder = (v) => !v || /x{4,}|your[_-]?key|changeme/i.test(v);

export function isRazorpayConfigured() {
    return keyId().startsWith('rzp_') && !looksLikePlaceholder(keyId()) && !looksLikePlaceholder(keySecret());
}

export function isWebhookConfigured() {
    return webhookSecret() !== '';
}

/** The public key the browser needs to open Razorpay Checkout ('' when not configured). */
export function publicKeyId() {
    return isRazorpayConfigured() ? keyId() : '';
}

/** 'test' for rzp_test_ keys, 'live' for rzp_live_ keys, null when not configured. */
export function keyMode() {
    if (!isRazorpayConfigured()) return null;
    return keyId().startsWith('rzp_live_') ? 'live' : 'test';
}

export class RazorpayError extends Error {
    constructor(message, { httpCode = 0, network = false } = {}) {
        super(message);
        this.httpCode = httpCode;
        this.network = network; // true when Razorpay could not be reached at all (try again later)
    }
}

async function call(method, path, payload = null, timeoutMs = 30000) {
    if (!isRazorpayConfigured()) throw new RazorpayError('Razorpay is not configured');
    const headers = [
        'Content-Type: application/json',
        `Authorization: Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`,
    ];
    const result = await httpRequest(method, `${apiBase()}${path}`, headers, payload ? JSON.stringify(payload) : null, timeoutMs);
    if (!result.ok) throw new RazorpayError(`Could not reach Razorpay: ${result.error || 'network error'}`, { network: true });
    let data = {};
    try {
        data = JSON.parse(result.body || '{}');
    } catch {
        data = {};
    }
    if (result.httpCode < 200 || result.httpCode >= 300) {
        const msg = data?.error?.description || `HTTP ${result.httpCode}`;
        throw new RazorpayError(`Razorpay: ${msg}`, { httpCode: result.httpCode, network: result.httpCode >= 500 });
    }
    return data;
}

export async function createRazorpayOrder(amountPaise, receipt, notes = {}) {
    if (!isRazorpayConfigured()) throw new RazorpayError('Razorpay is not configured');
    if (amountPaise < 100) throw new RazorpayError('Amount must be at least ₹1');
    const data = await call('POST', '/v1/orders', { amount: amountPaise, currency: 'INR', receipt: String(receipt).slice(0, 40), notes });
    if (!data.id) throw new RazorpayError('Razorpay did not return an order id');
    return { id: String(data.id), amount: Number(data.amount), currency: String(data.currency || 'INR'), receipt: String(data.receipt || receipt) };
}

/** Every payment attempt made against one Razorpay order (newest first, as Razorpay returns them). */
export async function fetchOrderPayments(razorpayOrderId) {
    const data = await call('GET', `/v1/orders/${encodeURIComponent(razorpayOrderId)}/payments`);
    return Array.isArray(data.items) ? data.items : [];
}

export async function fetchPayment(paymentId) {
    return call('GET', `/v1/payments/${encodeURIComponent(paymentId)}`);
}

/** Captures an authorised payment (only needed when the Razorpay account is not set to capture automatically). */
export async function capturePayment(paymentId, amountPaise) {
    return call('POST', `/v1/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: 'INR' });
}

/** Full (or partial) refund of a captured payment. Returns Razorpay's refund: { id, status: pending | processed | failed, amount }. */
export async function refundPayment(paymentId, amountPaise, notes = {}) {
    const body = { speed: 'normal', notes };
    if (amountPaise) body.amount = amountPaise;
    return call('POST', `/v1/payments/${encodeURIComponent(paymentId)}/refund`, body);
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
    if (!isRazorpayConfigured() || !orderId || !paymentId || !signature) return false;
    const expected = crypto.createHmac('sha256', keySecret()).update(`${orderId}|${paymentId}`).digest('hex');
    return timingSafeEqualStr(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
    if (!isWebhookConfigured() || !rawBody || !signature) return false;
    const expected = crypto.createHmac('sha256', webhookSecret()).update(rawBody).digest('hex');
    return timingSafeEqualStr(expected, signature);
}

function timingSafeEqualStr(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
