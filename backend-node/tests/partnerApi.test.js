// Run with: npm --prefix backend-node test   (Node's built-in test runner; these need no database)
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { eventsForChange, isPublicAddress, orderForApi, parseEvents, signPayload, webhookUrlProblem } from '../src/lib/webhooks.js';
import { hashKey, newApiKey, readPartnerInput } from '../src/lib/apiKeys.js';

const order = (o = {}) => ({ id: 'order-1', orderSource: 'api', status: 'placed', paymentStatus: 'cod', payment: 'cod', items: [], shipping: {}, ...o });

test('webhook events: one per real change, with what it was before', () => {
    assert.deepEqual(eventsForChange(null, order()).map((e) => e.type), ['order.created']);
    assert.deepEqual(eventsForChange(order(), order({ adminNotes: 'x' })), []);
    const cancel = eventsForChange(order(), order({ status: 'cancelled' }));
    assert.deepEqual(cancel.map((e) => e.type), ['order.status_changed', 'order.cancelled']);
    assert.equal(cancel[0].previous.status, 'placed');
    assert.deepEqual(eventsForChange(order({ status: 'out_for_delivery' }), order({ status: 'delivered' })).map((e) => e.type), ['order.status_changed', 'order.delivered']);
    assert.deepEqual(eventsForChange(order({ paymentStatus: 'pending' }), order({ paymentStatus: 'paid' })).map((e) => e.type), ['order.paid']);
    assert.deepEqual(eventsForChange(order(), order({ trackingNumber: 'AWB1' })).map((e) => e.type), ['order.shipment_updated']);
    assert.deepEqual(eventsForChange(order(), order({ returnStatus: 'requested' })).map((e) => e.type), ['order.return_updated']);
    assert.deepEqual(eventsForChange(order(), order({ refundStatus: 'refunded' })).map((e) => e.type), ['order.refunded']);
});

test('the order sent to partners carries no secrets or admin notes', () => {
    const out = orderForApi(order({ razorpaySignature: 'sig', adminNotes: 'private', payment: 'offline', paymentStatus: 'paid', items: [{ productId: 'p', price: 10.5, quantity: 3, title: 'T' }] }));
    const json = JSON.stringify(out);
    assert.ok(!json.includes('sig') && !json.includes('private'));
    assert.equal(out.payment.method, 'prepaid');
    assert.equal(out.items[0].lineTotal, 31.5);
});

test('signature is HMAC-SHA256 of "<timestamp>.<body>"', () => {
    const want = crypto.createHmac('sha256', 'whsec_x').update('1700000000.{"a":1}').digest('hex');
    assert.equal(signPayload('whsec_x', 1700000000, '{"a":1}'), want);
});

test('private and local addresses are never webhook targets', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '224.0.0.1']) {
        assert.equal(isPublicAddress(ip), false, ip);
    }
    for (const ip of ['8.8.8.8', '172.32.0.1', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip);
    const prev = process.env.APP_ENV;
    process.env.APP_ENV = 'production';
    try {
        assert.notEqual(webhookUrlProblem('http://example.com/hook'), '');
        assert.notEqual(webhookUrlProblem('https://localhost/hook'), '');
        assert.notEqual(webhookUrlProblem('https://169.254.169.254/latest'), '');
        assert.notEqual(webhookUrlProblem('https://u:p@example.com/x'), '');
        assert.notEqual(webhookUrlProblem('ftp://example.com'), '');
        assert.equal(webhookUrlProblem('https://hooks.example.com/chikit'), '');
    } finally {
        process.env.APP_ENV = prev;
    }
});

test('event lists: * means all, unknown names are dropped', () => {
    assert.deepEqual(parseEvents('*'), ['*']);
    assert.deepEqual(parseEvents('order.created, nope ,order.paid'), ['order.created', 'order.paid']);
});

test('API keys: random, prefixed, only the hash is kept', () => {
    const a = newApiKey();
    const b = newApiKey();
    assert.match(a.key, /^ck_(live|test)_[A-Za-z0-9_-]{32}$/);
    assert.notEqual(a.key, b.key);
    assert.equal(a.hash, hashKey(a.key));
    assert.equal(a.prefix, a.key.slice(0, 12));
});

test('partner form is checked', () => {
    const ok = readPartnerInput({ name: ' Acme ', scopes: ['orders:read'], allowedPayments: ['cod'], ipAllowlist: '203.0.113.7\n198.51.100.0/24' });
    assert.equal(ok.name, 'Acme');
    assert.equal(ok.ip_allowlist, '203.0.113.7,198.51.100.0/24');
    for (const bad of [{ name: '' }, { name: 'x', scopes: ['admin'] }, { name: 'x', scopes: [] }, { name: 'x', allowedPayments: ['upi'] }, { name: 'x', ipAllowlist: '1.2.3.4/40' }, { name: 'x', contactEmail: 'no' }]) {
        assert.throws(() => readPartnerInput(bad), (err) => err.statusCode === 400, JSON.stringify(bad));
    }
});
