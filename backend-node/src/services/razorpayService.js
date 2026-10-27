import crypto from 'node:crypto';
import { httpRequest } from '../lib/httpClient.js';

/** Thin Razorpay Orders API client — mirrors backend/lib/RazorpayService.php. */
function keyId() {
    return String(process.env.RAZORPAY_KEY_ID || '').trim();
}
function keySecret() {
    return String(process.env.RAZORPAY_KEY_SECRET || '').trim();
}
function webhookSecret() {
    return String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
}

export function isRazorpayConfigured() {
    return keyId() !== '' && keySecret() !== '';
}

export function isWebhookConfigured() {
    return webhookSecret() !== '';
}

export function verifyWebhookSignature(rawBody, signature) {
    if (!isWebhookConfigured() || !rawBody || !signature) return false;
    const expected = crypto.createHmac('sha256', webhookSecret()).update(rawBody).digest('hex');
    return timingSafeEqualStr(expected, signature);
}

export async function createRazorpayOrder(amountPaise, receipt, notes = {}) {
    if (!isRazorpayConfigured()) throw new Error('Razorpay is not configured');
    if (amountPaise < 100) throw new Error('Amount must be at least ₹1');

    const payload = { amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes };
    const headers = [
        'Content-Type: application/json',
        `Authorization: Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`,
    ];

    const result = await httpRequest('POST', 'https://api.razorpay.com/v1/orders', headers, JSON.stringify(payload), 30000);
    if (!result.ok) throw new Error(`Razorpay request failed: ${result.error || 'unknown error'}`);

    const data = JSON.parse(result.body || '{}');
    if (result.httpCode < 200 || result.httpCode >= 300 || !data.id) {
        const msg = data?.error?.description || result.body;
        throw new Error(`Razorpay order failed: ${msg}`);
    }

    return { id: String(data.id), amount: Number(data.amount), currency: String(data.currency || 'INR'), receipt: String(data.receipt || receipt) };
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
    if (!isRazorpayConfigured() || !orderId || !paymentId || !signature) return false;
    const expected = crypto.createHmac('sha256', keySecret()).update(`${orderId}|${paymentId}`).digest('hex');
    return timingSafeEqualStr(expected, signature);
}

function timingSafeEqualStr(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
