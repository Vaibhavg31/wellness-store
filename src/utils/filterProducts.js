
export function filterProducts(products, filters) {
    let result = [...products];
    if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        result = result.filter((p) => p.title.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query));
    }
    if (filters.category !== 'all') {
        result = result.filter((p) => p.category === filters.category);
    }
    if (filters.tag && filters.tag !== 'all') {
        const wantedTag = filters.tag.toLowerCase();
        result = result.filter((p) => (p.tags ?? []).some((t) => t.toLowerCase() === wantedTag));
    }
    result = result.filter((p) => p.price >= filters.minPrice && p.price <= filters.maxPrice);
    switch (filters.sort) {
        case 'price-low':
            result.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            result.sort((a, b) => b.price - a.price);
            break;
        case 'popularity':
            result.sort((a, b) => b.reviewCount - a.reviewCount);
            break;
        case 'newest':
        default:
            result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
    }
    return result;
}
/** Best sellers and higher-rated products first — used to rank related-product candidates. */
function byRelevance(a, b) {
    if (a.isBestSeller !== b.isBestSeller) return a.isBestSeller ? -1 : 1;
    return (b.rating || 0) - (a.rating || 0);
}

/**
 * Same-category matches first (most relevant), then — if that category is
 * too small to fill the section — other products from the wider catalog, so
 * "You May Also Like" always shows a full set instead of sometimes being
 * empty or nearly empty for products in a sparsely-stocked category.
 */
export function getRelatedProducts(products, currentId, category, limit = 6) {
    const others = products.filter((p) => p.id !== currentId);
    const sameCategory = others.filter((p) => p.category === category).sort(byRelevance);

    if (sameCategory.length >= limit) {
        return sameCategory.slice(0, limit);
    }

    const usedIds = new Set(sameCategory.map((p) => p.id));
    const fillers = others.filter((p) => !usedIds.has(p.id)).sort(byRelevance);

    return [...sameCategory, ...fillers].slice(0, limit);
}
