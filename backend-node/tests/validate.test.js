// Run with: npm --prefix backend-node test   (uses Node's built-in test runner, no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, assertText, assertWhole, assertAmount, assertImageUrl, assertLink, assertDateRange } from '../src/lib/validate.js';
import { normalizeAddress, validateAddress } from '../src/lib/addressHelper.js';

const rejects = (fn, status = 400) => assert.throws(fn, (err) => err.statusCode === status);

test('isValidEmail accepts normal addresses and refuses malformed ones (QA-015)', () => {
    for (const ok of ['a@b.co', 'first.last+tag@sub.example.com', 'x_y@d-e.in']) assert.equal(isValidEmail(ok), true, ok);
    for (const bad of ['', 'plain', 'a@b', '@x.com', 'a b@c.com', 'a@b..com', '.a@b.com', 'a.@b.com', `${'x'.repeat(250)}@a.com`, null, undefined]) assert.equal(isValidEmail(bad), false, String(bad));
});

test('assertWhole accepts whole numbers and numeric strings only (QA-002, QA-009)', () => {
    assert.equal(assertWhole(5, 'n'), 5);
    assert.equal(assertWhole('7', 'n'), 7);
    for (const bad of ['abc', '', null, undefined, 1.5, NaN, Infinity, true, [], {}, -1]) rejects(() => assertWhole(bad, 'n', { min: 0, max: 10 }));
    rejects(() => assertWhole(11, 'n', { min: 0, max: 10 }));
});

test('assertAmount accepts finite money within bounds (QA-016)', () => {
    assert.equal(assertAmount('99.5', 'fee'), 99.5);
    assert.equal(assertAmount(0, 'fee'), 0);
    for (const bad of ['abc', '', null, NaN, Infinity, -1, 1e12, {}]) rejects(() => assertAmount(bad, 'fee', { min: 0, max: 100000 }));
});

test('assertText refuses non-strings, blanks when required, and over-long text (QA-017)', () => {
    assertText('ok', 'x', 5);
    assertText(undefined, 'x', 5);
    rejects(() => assertText({ a: 1 }, 'x', 5));
    rejects(() => assertText('   ', 'x', 5, { required: true }));
    rejects(() => assertText('toolong', 'x', 5));
});

test('assertImageUrl and assertLink block script and data URLs (QA-010)', () => {
    for (const ok of ['/uploads/a.webp', 'https://cdn.example.com/a.png']) assertImageUrl(ok, 'img');
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'JaVaScRiPt:alert(1)', 'a.png', { a: 1 }, 'x'.repeat(3000)]) rejects(() => assertImageUrl(bad, 'img'));
    for (const ok of ['/shop', '#top', '?q=1', 'https://x.com', 'mailto:a@b.co', 'tel:+911234567890', '']) assertLink(ok, 'link');
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', 'shop']) rejects(() => assertLink(bad, 'link'));
});

test('assertDateRange needs an end after the start (QA-009, QA-012)', () => {
    assertDateRange('2030-01-01', '2030-02-01');
    assertDateRange('', '');
    rejects(() => assertDateRange('2030-02-01', '2030-01-01'));
    rejects(() => assertDateRange('2030-01-01', 'not-a-date'));
});

test('normalizeAddress ignores objects instead of saving "[object Object]" (QA-018)', () => {
    const a = normalizeAddress({ name: 'A', address: '1 Road', city: { x: 1 }, state: 'MH', pincode: '411 001', phone: '+91 98765 43210' });
    assert.equal(a.city, '');
    assert.equal(a.pincode, '411001');
    assert.equal(a.phone, '9876543210');
});

test('validateAddress needs every delivery field and sane lengths (QA-001, QA-018)', () => {
    const ok = { name: 'A', address: '1 Road', city: 'Pune', state: 'MH', pincode: '411001', phone: '9876543210' };
    assert.deepEqual(validateAddress(ok), {});
    for (const [field, value] of [['address', ''], ['city', ''], ['state', ''], ['pincode', '41100'], ['pincode', 'abc'], ['name', '']]) {
        assert.ok(validateAddress({ ...ok, [field]: value })[field], `${field}=${value}`);
    }
    assert.ok(Object.keys(validateAddress({ ...ok, address: 'A'.repeat(600) })).length > 0);
    assert.ok(Object.keys(validateAddress({})).length > 0);
});
