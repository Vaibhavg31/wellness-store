/**
 * Post-build SEO step (runs automatically after `npm run build`).
 *
 * The storefront is a client-rendered SPA, so crawlers and link-preview bots that don't run JavaScript
 * (WhatsApp, Facebook, iMessage, many SEO tools) would only ever see the generic homepage tags. This script
 * fetches the live catalogue and, for every public page, writes dist/<route>/index.html with that page's own
 * <title>, description, canonical, Open Graph / Twitter tags and JSON-LD. It also emits sitemap.xml and
 * robots.txt, and a 404.html SPA fallback (so deep links work on GitHub Pages-style hosts).
 *
 * Config (all optional):
 *   SITE_URL       public origin of the storefront (default: config.json FRONTEND_URL, else https://chikit.in)
 *   SEO_API_URL    API to read products/categories/settings from (default: http://127.0.0.1:8000)
 *   SEO_ENV        which config.json block to use (default: its "environment")
 * If the API is unreachable the static pages and sitemap are still produced; product/category pages are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    absoluteUrl, breadcrumbJsonLd, clip, faqJsonLd, humanizeSlug,
    organizationJsonLd, productJsonLd, trimSlash, websiteJsonLd,
} from '../src/utils/seoSchema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const warn = (msg) => console.warn(`[seo] ${msg}`);
const log = (msg) => console.log(`[seo] ${msg}`);

if (!fs.existsSync(path.join(dist, 'index.html'))) {
    warn('dist/index.html not found — run `vite build` first.');
    process.exit(0);
}

const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const env = config[process.env.SEO_ENV || config.environment] || {};
const siteUrl = trimSlash(process.env.SITE_URL || env.FRONTEND_URL || 'https://chikit.in');
if (!process.env.SITE_URL && !env.FRONTEND_URL) warn(`No SITE_URL / FRONTEND_URL set — using ${siteUrl}. Set FRONTEND_URL in config.json for production.`);
const apiBase = trimSlash(process.env.SEO_API_URL || env.VITE_API_URL || 'http://127.0.0.1:8000');
const publicAssetBase = trimSlash(env.VITE_API_URL || siteUrl);
const adminPath = env.ADMIN_PATH || '/chikit-studio';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const resolveImage = (img) => (!img ? absoluteUrl(siteUrl, '/og-image.png') : /^https?:\/\//i.test(img) ? img : `${publicAssetBase}${img}`);

async function getJson(pathname) {
    try {
        const res = await fetch(`${apiBase}${pathname}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        warn(`Could not read ${apiBase}${pathname} (${err.message})`);
        return null;
    }
}

const [settings, products, categories] = await Promise.all([getJson('/api/settings'), getJson('/api/products'), getJson('/api/categories')]);
const brand = settings?.brandName || 'Chikit';
const tagline = settings?.brandTagline || 'Ayurveda and Wellness';
const defaultDescription = settings?.seo?.description || settings?.brandDescription || 'Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.';
const faqs = settings?.contactPage?.faqs ?? [];
const returnDays = Number(settings?.delivery?.returnDays ?? 7);

const siteSchemas = [
    organizationJsonLd({
        siteUrl, name: brand, logoUrl: absoluteUrl(siteUrl, '/brand/chikit-logo.webp'),
        email: settings?.contact?.email, phone: settings?.contact?.whatsappNumber,
        sameAs: settings?.social?.instagramUrl ? [settings.social.instagramUrl] : [],
    }),
    websiteJsonLd({ siteUrl, name: brand }),
];

function headBlock({ title, description, pathname, image, type = 'website', schemas = [] }) {
    const fullTitle = title ? `${title} | ${brand}` : settings?.seo?.title || `${brand} | ${tagline}`;
    const desc = clip(description || defaultDescription);
    const url = absoluteUrl(siteUrl, pathname);
    const img = resolveImage(image);
    const ld = [...siteSchemas, ...schemas].filter(Boolean)
        .map((s) => `    <script data-seo-default type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`);
    return [
        '<!--seo:start-->',
        `    <title data-seo-default>${esc(fullTitle)}</title>`,
        `    <meta data-seo-default name="description" content="${esc(desc)}" />`,
        '    <meta data-seo-default name="robots" content="index, follow, max-image-preview:large" />',
        `    <link data-seo-default rel="canonical" href="${esc(url)}" />`,
        `    <meta data-seo-default property="og:site_name" content="${esc(brand)}" />`,
        '    <meta data-seo-default property="og:locale" content="en_IN" />',
        `    <meta data-seo-default property="og:type" content="${type}" />`,
        `    <meta data-seo-default property="og:title" content="${esc(fullTitle)}" />`,
        `    <meta data-seo-default property="og:description" content="${esc(desc)}" />`,
        `    <meta data-seo-default property="og:url" content="${esc(url)}" />`,
        `    <meta data-seo-default property="og:image" content="${esc(img)}" />`,
        '    <meta data-seo-default name="twitter:card" content="summary_large_image" />',
        `    <meta data-seo-default name="twitter:title" content="${esc(fullTitle)}" />`,
        `    <meta data-seo-default name="twitter:description" content="${esc(desc)}" />`,
        `    <meta data-seo-default name="twitter:image" content="${esc(img)}" />`,
        ...ld,
        '    <!--seo:end-->',
    ].join('\n');
}

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;
if (!SEO_BLOCK.test(template)) {
    warn('index.html has no <!--seo:start-->…<!--seo:end--> block; skipping page generation.');
    process.exit(0);
}

const written = [];
function writePage(pathname, meta) {
    const html = template.replace(SEO_BLOCK, headBlock({ ...meta, pathname }));
    const file = pathname === '/' ? path.join(dist, 'index.html') : path.join(dist, ...pathname.split('/').filter(Boolean), 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
    written.push(pathname);
}

// ---- Static pages (mirror the titles used by the React <Seo> components) ----
const STATIC_PAGES = [
    { path: '/', title: null, description: defaultDescription, priority: '1.0', changefreq: 'daily' },
    { path: '/shop', title: 'Shop Ayurvedic Wellness Products', description: 'Shop lab-tested, clean-label Ayurvedic supplements, juices, gummies and personal care from Chikit. Free delivery above the threshold, easy returns and COD.', priority: '0.9', changefreq: 'daily' },
    { path: '/about', title: 'Our Story', description: settings?.about?.heroDescription, priority: '0.5', changefreq: 'monthly' },
    { path: '/contact', title: 'Contact Us', description: settings?.contactPage?.description, priority: '0.5', changefreq: 'monthly', schemas: [{ '@context': 'https://schema.org', '@type': 'ContactPage', name: `Contact ${brand}`, url: absoluteUrl(siteUrl, '/contact') }] },
    { path: '/faq', title: 'FAQs', description: 'Answers about Chikit products, purity and lab testing, delivery, returns and payments.', priority: '0.6', changefreq: 'monthly', schemas: [faqJsonLd(faqs)] },
    { path: '/reviews', title: 'Customer Reviews', description: 'Read verified customer reviews of Chikit Ayurvedic products.', priority: '0.5', changefreq: 'weekly' },
    { path: '/privacy', title: 'Privacy Policy', description: 'How Chikit collects, uses and protects your personal information when you shop with us.', priority: '0.2', changefreq: 'yearly' },
    { path: '/shipping-policy', title: 'Shipping Policy', description: 'How Chikit ships your order: delivery charges, free-delivery threshold, order tracking and what to do if something goes wrong.', priority: '0.3', changefreq: 'yearly' },
    { path: '/refund-policy', title: 'Returns & Refund Policy', description: 'Chikit return window, how to cancel an order and how refunds are issued.', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms', title: 'Terms of Service', description: 'Terms of service for shopping at Chikit: orders, payments, shipping, returns and refunds.', priority: '0.2', changefreq: 'yearly' },
];
STATIC_PAGES.forEach((p) => writePage(p.path, p));

// ---- Categories ----
const sitemapEntries = STATIC_PAGES.map((p) => ({ loc: absoluteUrl(siteUrl, p.path), priority: p.priority, changefreq: p.changefreq }));
for (const cat of Array.isArray(categories) ? categories : []) {
    const slug = cat.slug || cat.id;
    const pathname = `/category/${slug}`;
    writePage(pathname, {
        title: cat.label,
        description: cat.description || `Shop ${cat.label} from ${brand} — lab-tested Ayurvedic wellness.`,
        image: cat.image,
        schemas: [breadcrumbJsonLd(siteUrl, [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: cat.label, path: pathname }])],
    });
    sitemapEntries.push({ loc: absoluteUrl(siteUrl, pathname), priority: '0.8', changefreq: 'weekly', image: cat.image });
}

// ---- Products ----
for (const product of Array.isArray(products) ? products : []) {
    const pathname = `/product/${product.id}`;
    const catLabel = (Array.isArray(categories) ? categories : []).find((c) => (c.slug || c.id) === product.category)?.label || humanizeSlug(product.category);
    writePage(pathname, {
        title: product.title,
        description: product.description,
        image: product.images?.[0],
        type: 'product',
        schemas: [
            productJsonLd(product, { siteUrl, brand, resolveImage, returnDays }),
            breadcrumbJsonLd(siteUrl, [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: catLabel, path: `/category/${product.category}` }, { name: product.title }]),
            faqJsonLd(product.faqs),
        ],
    });
    sitemapEntries.push({ loc: absoluteUrl(siteUrl, pathname), priority: '0.9', changefreq: 'weekly', image: product.images?.[0], imageTitle: product.title });
}

// ---- 404.html: SPA fallback for hosts that serve it for unknown paths (e.g. GitHub Pages) ----
fs.writeFileSync(path.join(dist, '404.html'), fs.readFileSync(path.join(dist, 'index.html'), 'utf8').replace(/<link data-seo-default rel="canonical"[^>]*>\n?/, '').replace('content="index, follow, max-image-preview:large"', 'content="noindex"'));

// ---- sitemap.xml ----
const today = new Date().toISOString().slice(0, 10);
const urlXml = (e) => [
    '  <url>',
    `    <loc>${esc(e.loc)}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    ...(e.image ? ['    <image:image>', `      <image:loc>${esc(resolveImage(e.image))}</image:loc>`, ...(e.imageTitle ? [`      <image:title>${esc(e.imageTitle)}</image:title>`] : []), '    </image:image>'] : []),
    '  </url>',
].join('\n');
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${sitemapEntries.map(urlXml).join('\n')}\n</urlset>\n`);

// ---- robots.txt ----
fs.writeFileSync(path.join(dist, 'robots.txt'), [
    'User-agent: *',
    'Allow: /',
    '',
    '# Private, transactional and admin areas',
    `Disallow: ${adminPath}`,
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /orders',
    'Disallow: /wishlist',
    'Disallow: /login',
    'Disallow: /forgot-password',
    'Disallow: /reset-password',
    'Disallow: /verify-email',
    'Disallow: /shop?*search=',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
].join('\n'));

log(`site ${siteUrl} · wrote ${written.length} pages (${written.filter((p) => p.startsWith('/product/')).length} products, ${written.filter((p) => p.startsWith('/category/')).length} categories), sitemap.xml (${sitemapEntries.length} URLs), robots.txt, 404.html`);
