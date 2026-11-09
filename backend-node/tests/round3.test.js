import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendCsv } from '../src/lib/response.js';
import { siteOrigin } from '../src/routes/seoRoutes.js';

function fakeRes() {
    const res = { headers: {}, body: '', statusCode: 0 };
    res.status = (c) => { res.statusCode = c; return res; };
    res.set = (k, v) => { res.headers[k.toLowerCase()] = v; return res; };
    res.send = (b) => { res.body = b; return res; };
    return res;
}

test('CSV export: text that looks like a formula is written as plain text, numbers stay numbers (QA-064)', () => {
    const res = fakeRes();
    sendCsv(res, 'x.csv', ['Name', 'Phone', 'Total', 'Note'], [['=HYPERLINK("http://evil","x")', '+919876543210', -5, '@SUM(A1)'], ['Asha', '9876543210', 120.5, 'ok, thanks']]);
    const [bom, ...rest] = res.body;
    assert.equal(bom, '﻿');
    const lines = rest.join('').split('\r\n');
    assert.equal(lines[1], `"'=HYPERLINK(""http://evil"",""x"")",'+919876543210,-5,'@SUM(A1)`);
    assert.equal(lines[2], 'Asha,9876543210,120.5,"ok, thanks"');
});

test('sitemap / robots: the site address comes from FRONTEND_URL, else a sane request host (QA-067)', () => {
    const before = process.env.FRONTEND_URL;
    try {
        process.env.FRONTEND_URL = 'https://chikit.co.in/';
        assert.equal(siteOrigin({ headers: { host: 'evil.example' }, protocol: 'http' }), 'https://chikit.co.in');
        delete process.env.FRONTEND_URL;
        assert.equal(siteOrigin({ headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'www.chikit.co.in' }, protocol: 'http' }), 'https://www.chikit.co.in');
        assert.equal(siteOrigin({ headers: { host: 'bad host"><script>' }, protocol: 'http' }), '');
    } finally {
        if (before === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = before;
    }
});
