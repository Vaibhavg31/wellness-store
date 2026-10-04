import { useEffect } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { absoluteUrl, clip } from '@/utils/seoSchema';
import { imageUrl } from '@/services/api';

/** Canonical origin of the storefront (build-time VITE_SITE_URL, else the current origin). */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');

const DEFAULT_IMAGE = '/og-image.png';

/**
 * Per-page head tags. React 19 hoists <title>/<meta>/<link> to <head>, and the build step
 * (scripts/seo-postbuild.mjs) writes the same tags into static HTML for crawlers that don't run JS.
 *
 * `path` is the canonical path (no query string). `jsonLd` is one object or an array of them.
 */
export default function Seo({ title, description, path = '/', image, type = 'website', noindex = false, jsonLd }) {
    const { content } = useSiteContent();
    const brand = content.brandName || 'Chikit';
    const fullTitle = title ? `${title} | ${brand}` : content.seo?.title || `${brand} | ${content.brandTagline}`;
    const desc = clip(description || content.seo?.description || content.brandDescription);
    const url = absoluteUrl(SITE_URL, path);
    const img = absoluteUrl(SITE_URL, image ? imageUrl(image) : DEFAULT_IMAGE);
    // Drop the generic defaults from index.html now that this page supplies its own tags.
    useEffect(() => {
        document.querySelectorAll('[data-seo-default]').forEach((el) => el.remove());
    }, []);

    const schemas = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean);

    return (
        <>
            <title>{fullTitle}</title>
            <meta name="description" content={desc} />
            <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
            {!noindex && <link rel="canonical" href={url} />}

            <meta property="og:site_name" content={brand} />
            <meta property="og:locale" content="en_IN" />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:url" content={url} />
            <meta property="og:image" content={img} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={desc} />
            <meta name="twitter:image" content={img} />

            {schemas.map((schema, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
            ))}
        </>
    );
}
