/**
 * "Buy Again" — re-adds a past order's line items to the cart at TODAY's
 * price and stock (never the order's original price), by looking each
 * productId back up against the live catalogue already loaded via
 * useProducts(). A variant line (variantId set) is resolved by
 * CartContext's own resolveCartProduct — passing `variantId` through on the
 * live product is all that's needed, since it already carries the current
 * `variants` array.
 *
 * Deliberately skips (rather than throws on) products that were removed,
 * unpublished, or a variant that no longer exists — an order can be years
 * old, and a handful of stale lines shouldn't block re-adding everything
 * else. Callers get counts back to tell the shopper what actually happened.
 *
 * @returns {{ addedCount: number, unavailableCount: number, totalCount: number }}
 */
export function reorderItems(order, products, addToCart) {
    const items = order?.items || [];
    let addedCount = 0;
    let unavailableCount = 0;

    for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product || product.isPublished === false) {
            unavailableCount++;
            continue;
        }

        if (item.variantId) {
            const variantStillExists = product.variants?.some((v) => v.id === item.variantId);
            if (!variantStillExists) {
                unavailableCount++;
                continue;
            }
        } else if ((product.stock ?? 0) <= 0) {
            unavailableCount++;
            continue;
        }

        const cartProduct = item.variantId ? { ...product, variantId: item.variantId } : product;
        const ok = addToCart(cartProduct, item.quantity || 1);
        if (ok) addedCount++; else unavailableCount++;
    }

    return { addedCount, unavailableCount, totalCount: items.length };
}

/** Turns a reorderItems() result into one shopper-facing sentence. */
export function reorderSummaryMessage({ addedCount, unavailableCount }) {
    if (addedCount === 0) {
        return 'None of these items are available right now.';
    }
    if (unavailableCount === 0) {
        return `Added ${addedCount} item${addedCount === 1 ? '' : 's'} to your bag.`;
    }
    return `Added ${addedCount} item${addedCount === 1 ? '' : 's'} to your bag — ${unavailableCount} ${unavailableCount === 1 ? 'is' : 'are'} no longer available.`;
}
