/** 'digestive-health' → 'Digestive Health' (fallback when a category label isn't loaded). */
export function humanizeSlug(slug = '') {
    return String(slug).replace(/[-_]+/g, ' ').replace(/w/g, (c) => c.toUpperCase());
}

export function getFeaturedProducts(products) {
    const featured = products.filter((p) => p.isNew);
    return featured.length > 0 ? featured : products.slice(0, 4);
}
export function getBestSellers(products) {
    return products.filter((p) => p.isBestSeller);
}
