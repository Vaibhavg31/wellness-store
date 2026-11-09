import { Router } from 'express';
import { CategoryRepository } from '../repositories/categoryRepository.js';
import { OfferRepository } from '../repositories/offerRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';

/**
 * /sitemap.xml and /robots.txt, built from the live catalogue on every request (cached for an hour).
 * The production image is built without the API (see Dockerfile), so the build-time SEO step that used to write these files
 * never runs there: the live site had no sitemap at all, and its robots.txt did not point to one.
 */
const router = Router();

const STATIC_PAGES = [
    ['/', '1.0', 'daily'], ['/shop', '0.9', 'daily'], ['/offers', '0.8', 'weekly'], ['/new-launches', '0.7', 'weekly'],
    ['/club', '0.6', 'monthly'], ['/reviews', '0.5', 'weekly'], ['/about', '0.5', 'monthly'], ['/contact', '0.5', 'monthly'],
    ['/faq', '0.5', 'monthly'], ['/track-order', '0.3', 'yearly'], ['/shipping-policy', '0.3', 'yearly'],
    ['/refund-policy', '0.3', 'yearly'], ['/privacy', '0.3', 'yearly'], ['/terms', '0.3', 'yearly'],
];
// Pages that are private to a shopper or the shop (they also carry noindex).
const PRIVATE = ['/chikit-studio', '/cart', '/checkout', '/account', '/orders', '/wishlist', '/login', '/forgot-password', '/reset-password', '/verify-email', '/product-preview'];

/** The public address of the store: FRONTEND_URL, else the address the request came in on. */
export function siteOrigin(req) {
    const configured = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    if (/^https?:\/\//i.test(configured)) return configured;
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    return /^[a-z0-9.-]+(:\d+)?$/i.test(host) && /^https?$/.test(proto) ? `${proto}://${host}` : '';
}

const xml = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const day = (iso) => {
    const t = Date.parse(iso || '');
    return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : '';
};

router.get('/sitemap.xml', async (req, res) => {
    const site = siteOrigin(req);
    const entries = STATIC_PAGES.map(([path, priority, changefreq]) => ({ path, priority, changefreq }));
    try {
        const [categories, offers, products] = await Promise.all([
            new CategoryRepository().getPublished(),
            new OfferRepository().getLive(),
            new ProductRepository().getPublished(),
        ]);
        for (const c of categories) if (c.slug) entries.push({ path: `/category/${encodeURIComponent(c.slug)}`, priority: '0.8', changefreq: 'weekly' });
        for (const o of offers) if (o.slug) entries.push({ path: `/offers/${encodeURIComponent(o.slug)}`, priority: '0.7', changefreq: 'weekly' });
        for (const p of products) entries.push({ path: `/product/${encodeURIComponent(p.id)}`, priority: '0.9', changefreq: 'weekly', lastmod: day(p.updatedAt) });
    } catch (err) {
        // The static pages are still worth listing if the catalogue cannot be read for a moment.
        console.error('sitemap: catalogue unavailable', err?.message);
    }
    const body = entries.map((e) => `  <url><loc>${xml(site + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`).join('\n');
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

router.get('/robots.txt', (req, res) => {
    const site = siteOrigin(req);
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('text/plain').send(['User-agent: *', 'Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`), '', site ? `Sitemap: ${site}/sitemap.xml` : ''].join('\n').trim() + '\n');
});

export default router;
