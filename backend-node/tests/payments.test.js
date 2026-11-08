// Run with: npm --prefix backend-node test   (Node's built-in test runner; these need no database)
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describePaymentError, isAwaitingPayment, paymentDeadline, paymentWindowMinutes, settledPayment } from '../src/lib/onlinePayments.js';
import { isRazorpayConfigured, keyMode, publicKeyId, verifyPaymentSignature, verifyWebhookSignature } from '../src/services/razorpayService.js';
import { googleProfileProblem } from '../src/routes/authRoutes.js';
import { googleClientId } from '../src/lib/servicesConfig.js';

function withEnv(vars, fn) {
    const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
    Object.assign(process.env, vars);
    try { return fn(); } finally {
        for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
}

test('an order waits for payment only while online, unpaid and placed', () => {
    assert.equal(isAwaitingPayment({ payment: 'razorpay', paymentStatus: 'pending', status: 'placed' }), true);
    assert.equal(isAwaitingPayment({ payment: 'razorpay', paymentStatus: 'paid', status: 'confirmed' }), false);
    assert.equal(isAwaitingPayment({ payment: 'razorpay', paymentStatus: 'failed', status: 'cancelled' }), false);
    assert.equal(isAwaitingPayment({ payment: 'cod', paymentStatus: 'cod', status: 'placed' }), false);
});

test('payment window: 30 minutes by default, clamped, and the stored deadline wins', () => {
    withEnv({ PAYMENT_WINDOW_MINUTES: '' }, () => assert.equal(paymentWindowMinutes(), 30));
    withEnv({ PAYMENT_WINDOW_MINUTES: '1' }, () => assert.equal(paymentWindowMinutes(), 5));
    withEnv({ PAYMENT_WINDOW_MINUTES: '99999' }, () => assert.equal(paymentWindowMinutes(), 1440));
    const created = '2026-11-08T10:00:00.000Z';
    assert.equal(paymentDeadline({ createdAt: created }).toISOString(), '2026-11-08T10:30:00.000Z');
    assert.equal(paymentDeadline({ createdAt: created, paymentExpiresAt: '2026-11-08T10:45:00.000Z' }).toISOString(), '2026-11-08T10:45:00.000Z');
});

test('the payment that settles an order: captured first, then authorised, never a failed one', () => {
    assert.equal(settledPayment([{ id: 'a', status: 'failed' }, { id: 'b', status: 'authorized' }, { id: 'c', status: 'captured' }]).id, 'c');
    assert.equal(settledPayment([{ id: 'a', status: 'failed' }, { id: 'b', status: 'authorized' }]).id, 'b');
    assert.equal(settledPayment([{ id: 'a', status: 'failed' }]), null);
    assert.equal(settledPayment(null), null);
});

test('failure reasons are short and never empty', () => {
    assert.equal(describePaymentError({ description: 'Your bank declined it' }), 'Your bank declined it');
    assert.equal(describePaymentError({ error_description: 'Card expired' }), 'Card expired');
    assert.equal(describePaymentError({}), 'The payment did not go through.');
    assert.equal(describePaymentError({ description: 'undefined' }), 'The payment did not go through.');
    assert.ok(describePaymentError({ description: 'x'.repeat(400) }).length <= 250);
});

test('Razorpay keys: placeholders do not count, test/live mode is read from the key', () => {
    withEnv({ RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '' }, () => { assert.equal(isRazorpayConfigured(), false); assert.equal(publicKeyId(), ''); assert.equal(keyMode(), null); });
    withEnv({ RAZORPAY_KEY_ID: 'rzp_test_xxxxxxxx', RAZORPAY_KEY_SECRET: 'secret' }, () => assert.equal(isRazorpayConfigured(), false));
    withEnv({ RAZORPAY_KEY_ID: 'rzp_test_AbC123', RAZORPAY_KEY_SECRET: 's3cret' }, () => { assert.equal(isRazorpayConfigured(), true); assert.equal(keyMode(), 'test'); assert.equal(publicKeyId(), 'rzp_test_AbC123'); });
    withEnv({ RAZORPAY_KEY_ID: 'rzp_live_AbC123', RAZORPAY_KEY_SECRET: 's3cret' }, () => assert.equal(keyMode(), 'live'));
});

test('payment and webhook signatures are checked exactly as Razorpay signs them', () => {
    withEnv({ RAZORPAY_KEY_ID: 'rzp_test_AbC123', RAZORPAY_KEY_SECRET: 's3cret', RAZORPAY_WEBHOOK_SECRET: 'whsec' }, () => {
        const good = crypto.createHmac('sha256', 's3cret').update('order_1|pay_1').digest('hex');
        assert.equal(verifyPaymentSignature('order_1', 'pay_1', good), true);
        assert.equal(verifyPaymentSignature('order_1', 'pay_2', good), false);
        assert.equal(verifyPaymentSignature('order_1', 'pay_1', 'short'), false);
        const body = '{"event":"payment.captured"}';
        assert.equal(verifyWebhookSignature(body, crypto.createHmac('sha256', 'whsec').update(body).digest('hex')), true);
        assert.equal(verifyWebhookSignature(`${body} `, crypto.createHmac('sha256', 'whsec').update(body).digest('hex')), false);
    });
});

test('Google: only a verified email with an account id can sign in', () => {
    assert.equal(googleProfileProblem({ email: 'a@b.co', email_verified: true, sub: '123' }), '');
    assert.equal(googleProfileProblem({ email: 'a@b.co', email_verified: 'true', sub: '123' }), '');
    assert.notEqual(googleProfileProblem({ email: 'a@b.co', email_verified: false, sub: '123' }), '');
    assert.notEqual(googleProfileProblem({ email: 'a@b.co', sub: '123' }), '');
    assert.notEqual(googleProfileProblem({ email_verified: true, sub: '123' }), '');
    assert.notEqual(googleProfileProblem({ email: 'a@b.co', email_verified: true }), '');
    assert.notEqual(googleProfileProblem(null), '');
});

test('Google client id: must look like a real web client id', () => {
    withEnv({ GOOGLE_CLIENT_ID: '', VITE_GOOGLE_CLIENT_ID: '' }, () => assert.equal(googleClientId(), ''));
    withEnv({ GOOGLE_CLIENT_ID: 'your-client-id', VITE_GOOGLE_CLIENT_ID: '' }, () => assert.equal(googleClientId(), ''));
    withEnv({ GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com' }, () => assert.equal(googleClientId(), '123-abc.apps.googleusercontent.com'));
});
