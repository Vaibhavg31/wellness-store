/** Normalize site content before PUT /api/settings so empty values persist correctly. */
export function prepareSiteContentForSave(content) {
    const trim = (v) => (typeof v === 'string' ? v.trim() : v);

    const social = {
        ...content.social,
        instagramHandle: trim(content.social?.instagramHandle ?? ''),
        instagramUrl: trim(content.social?.instagramUrl ?? ''),
        instagramTagline: trim(content.social?.instagramTagline ?? ''),
    };

    const instagram = {
        ...content.instagram,
        title: trim(content.instagram?.title ?? ''),
        images: (content.instagram?.images ?? []).map(trim).filter(Boolean),
    };

    const hero = {
        ...content.hero,
        orbitProductIds: (content.hero?.orbitProductIds ?? []).filter(Boolean),
    };

    return {
        ...content,
        social,
        instagram,
        hero,
    };
}
