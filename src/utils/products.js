export function getFeaturedProducts(products) {
    const featured = products.filter((p) => p.isNew);
    return featured.length > 0 ? featured : products.slice(0, 4);
}
export function getBestSellers(products) {
    return products.filter((p) => p.isBestSeller);
}
