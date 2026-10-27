/**
 * Normalize site content before PUT /api/settings so empty values persist
 * correctly.
 *
 * Deliberately strips `sections` out of every payload built here: homepage
 * section order/visibility has its own dedicated, save-immediately path
 * (AdminContentPage's handleSectionsChange, fired by the reorder/toggle UI
 * itself). This general Save button covers everything else — Brand,
 * Homepage field content, About, Contact, SEO, Popup — and used to
 * silently re-send whatever `sections` snapshot was sitting in this page's
 * state from whenever it was first loaded, clobbering any more recent
 * reordering done via the dedicated UI (in this tab or another) the moment
 * someone saved something as unrelated as a headline edit.
 */
export function prepareSiteContentForSave(content) {
    const trim = (v) => (typeof v === 'string' ? v.trim() : v);
    const { sections: _sections, ...rest } = content;

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
        productImageIds: (content.hero?.productImageIds ?? []).filter(Boolean),
    };

    return {
        ...rest,
        social,
        instagram,
        hero,
    };
}
