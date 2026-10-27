/**
 * Pure builders for SEO data (JSON-LD, URLs). No imports on purpose: this file is used by the
 * React <Seo> component AND by scripts/seo-postbuild.mjs, which runs in plain Node at build time.
 */

export const trimSlash = (s = '') => String(s).replace(/\/+$/, '');

export function absoluteUrl(base, path = '/') {
    if (!path) return trimSlash(base);
    if (/^https?:\/\//i.test(path)) return path;
    return `${trimSlash(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Humanise a category slug: 'digestive-health' → 'Digestive Health'. */
export function humanizeSlug(slug = '') {
    return String(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function organizationJsonLd({ siteUrl, name, logoUrl, email, phone, sameAs = [] }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${trimSlash(siteUrl)}/#organization`,
        name,
        url: trimSlash(siteUrl),
        logo: logoUrl,
        ...(email || phone ? { contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', ...(email ? { email } : {}), ...(phone ? { telephone: phone } : {}), areaServed: 'IN', availableLanguage: ['en', 'hi'] }] } : {}),
        ...(sameAs.length ? { sameAs } : {}),
    };
}

export function websiteJsonLd({ siteUrl, name }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${trimSlash(siteUrl)}/#website`,
        url: trimSlash(siteUrl),
        name,
        publisher: { '@id': `${trimSlash(siteUrl)}/#organization` },
        potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${trimSlash(siteUrl)}/shop?search={search_term_string}` },
            'query-input': 'required name=search_term_string',
        },
    };
}

export function breadcrumbJsonLd(siteUrl, crumbs) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.name,
            ...(crumb.path ? { item: absoluteUrl(siteUrl, crumb.path) } : {}),
        })),
    };
}

export function faqJsonLd(faqs = []) {
    const entries = faqs.filter((f) => f?.question && f?.answer);
    if (entries.length === 0) return null;
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entries.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
    };
}

/** Product + Offer (+ AggregateRating when reviews exist). `resolveImage` turns stored paths into absolute URLs. */
export function productJsonLd(product, { siteUrl, brand, resolveImage = (x) => x, returnDays }) {
    const url = absoluteUrl(siteUrl, `/product/${product.id}`);
    const variants = (product.variants ?? []).filter((v) => typeof v.price === 'number');
    const prices = variants.length ? variants.map((v) => v.price) : [product.price];
    const inStock = (variants.length ? variants.some((v) => v.stock > 0) : product.stock > 0);
    const availability = `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`;
    const common = {
        '@type': 'Offer',
        priceCurrency: 'INR',
        availability,
        itemCondition: 'https://schema.org/NewCondition',
        url,
        seller: { '@id': `${trimSlash(siteUrl)}/#organization` },
        ...(returnDays > 0
            ? { hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'IN', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: Number(returnDays) } }
            : {}),
    };
    const offers = prices.length > 1 && Math.min(...prices) !== Math.max(...prices)
        ? { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability, url, seller: common.seller }
        : { ...common, price: prices[0] };

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${url}#product`,
        name: product.title,
        description: product.description,
        sku: product.id,
        image: (product.images ?? []).slice(0, 5).map(resolveImage),
        category: humanizeSlug(product.category),
        brand: { '@type': 'Brand', name: brand },
        url,
        offers,
        ...(product.reviewCount > 0 && product.rating
            ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(product.rating), reviewCount: Number(product.reviewCount) } }
            : {}),
    };
}

/** Shorten text for meta descriptions without cutting mid-word. */
export function clip(text = '', max = 158) {
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}
