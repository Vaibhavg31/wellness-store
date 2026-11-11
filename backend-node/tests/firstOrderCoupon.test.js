import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CouponService, FIRST_ORDER_ONLY } from '../src/services/couponService.js';

/** A service with its database parts replaced, so only the first-order rule is tested. */
function serviceWith({ user = null, earlier = 0 } = {}) {
    const svc = Object.create(CouponService.prototype);
    svc.users = { getById: async () => user };
    svc.countCalls = [];
    svc.orders = { countEarlierOrders: async (who) => { svc.countCalls.push(who); return earlier; } };
    return svc;
}
const welcome = { code: 'WELCOME10', audience: 'new_customers', isEnabled: true, type: 'percent', value: 10 };

test('first-order coupon: a customer with no earlier order may use it', async () => {
    const svc = serviceWith({ user: { email: 'a@b.in', phone: '9876543210' }, earlier: 0 });
    assert.equal(await svc.audienceError(welcome, 'u1'), null);
});

test('first-order coupon: any earlier order (account, email or phone) ends it', async () => {
    const svc = serviceWith({ user: { email: 'a@b.in', phone: '9876543210' }, earlier: 1 });
    assert.equal(await svc.audienceError(welcome, 'u1', { phone: '+91 98765 11111' }), FIRST_ORDER_ONLY);
    assert.deepEqual(svc.countCalls[0], { userId: 'u1', email: 'a@b.in', phones: ['9876543210', '+91 98765 11111'] });
});

test('first-order coupon: a visitor who is not signed in is not blocked (checkout needs an account and checks again)', async () => {
    const svc = serviceWith({ earlier: 5 });
    assert.equal(await svc.audienceError(welcome, null), null);
    assert.equal(svc.countCalls.length, 0);
});

test('first-order coupon: public listing says it is first-order only; other audiences are not', () => {
    const svc = Object.create(CouponService.prototype);
    assert.equal(svc.publicListShape(welcome).firstOrderOnly, true);
    assert.equal(svc.publicCouponShape(welcome).firstOrderOnly, true);
    assert.equal(svc.publicListShape({ ...welcome, audience: 'everyone' }).firstOrderOnly, false);
});

test('first-order coupon: listableFor hides it from a customer who has ordered, shows it to a new one', async () => {
    const used = serviceWith({ user: { email: 'a@b.in' }, earlier: 2 });
    const fresh = serviceWith({ user: { email: 'a@b.in' }, earlier: 0 });
    assert.equal(await used.listableFor(welcome, 'u1'), false);
    assert.equal(await fresh.listableFor(welcome, 'u1'), true);
});
