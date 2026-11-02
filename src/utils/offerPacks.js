import { hasPack } from '@/data/packs';

/** The products an offer applies to: its own list, or the whole shop when it covers every product. */
export function offerPool(offer, products) {
    if (!offer) return [];
    if (offer.allProducts || (offer.productIds ?? []).length === 0) return products;
    const byId = new Map(products.map((p) => [p.id, p]));
    return offer.productIds.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * The products to show on an offer's stage: up to three different packs for a Pick & Mix box (different shapes first, so the
 * trio looks varied), the same pack twice for Buy 1 Get 1. Only products with a 3D pack and a photo qualify.
 */
export function stageProducts(offer, products, looks = {}) {
    const pool = offerPool(offer, products).filter((p) => p.images?.[0] && hasPack(p, looks));
    if (pool.length === 0) return [];
    if (offer.kind === 'bogo') return [pool[0], pool[0]];
    const picked = [];
    const kinds = new Set();
    for (const p of pool) {
        const kind = looks[p.id]?.kind ?? p.id;
        if (!kinds.has(kind) && picked.length < 3) { kinds.add(kind); picked.push(p); }
    }
    for (const p of pool) if (picked.length < 3 && !picked.includes(p)) picked.push(p);
    return picked;
}

/** What a Pick & Mix box can save at most: the priciest N products against the box price. 0 when it cannot save. */
export function maxSaving(offer, products) {
    if (offer?.kind !== 'mix_match') return 0;
    const prices = offerPool(offer, products).map((p) => p.price).sort((a, b) => b - a).slice(0, offer.pickCount);
    if (prices.length < offer.pickCount) return 0;
    return Math.max(0, prices.reduce((s, p) => s + p, 0) - offer.price);
}
