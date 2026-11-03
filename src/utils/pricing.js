/**
 * What a shopper pays for the offer pages and the Chikit Club price, for showing in the bag. This mirrors
 * backend-node/src/lib/pricing.js exactly; the server recalculates every line at checkout and its answer is the one charged.
 */

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** "Buy 1 Get 1 Free": a pair is two units each priced at half, so the pair costs one unit's price. */
export function bogoUnitPrice(listPrice) {
    return round2(Number(listPrice) / 2);
}

/** "Pick any N for one price": unit prices that add up to the box price, or to the plain total when that is lower. */
export function mixUnitPrices(listPrices, boxPrice) {
    const total = round2(listPrices.reduce((sum, p) => sum + Number(p), 0));
    if (total <= 0) return listPrices.map(() => 0);
    const target = Math.min(total, Number(boxPrice));
    const units = [];
    let allocated = 0;
    listPrices.forEach((price, i) => {
        const unit = i === listPrices.length - 1 ? round2(target - allocated) : round2((Number(price) * target) / total);
        allocated = round2(allocated + unit);
        units.push(unit);
    });
    return units;
}

/** What the box costs for the chosen products (never more than buying them one by one). */
export function mixTotal(listPrices, boxPrice) {
    return round2(mixUnitPrices(listPrices, boxPrice).reduce((sum, p) => sum + p, 0));
}

/** The price a shopper sees for a product or pack option: the member price for members, else the shown price. */
export function priceFor(item, isMember) {
    return isMember && item?.memberPrice ? item.memberPrice : item.price;
}

/**
 * A Pick & Mix box for one shopper (mirrors backend-node/src/lib/pricing.js). Everyone pays the box price, or the plain total when
 * that is lower. A Chikit Club member pays whichever is lower for them: the box price, or the Club prices of the same products
 * bought one by one. An offer and a Club price never add up on one line.
 */
export function mixBoxPricing(listPrices, memberPrices, boxPrice, isMember) {
    const units = mixUnitPrices(listPrices, boxPrice);
    const boxTotal = round2(units.reduce((sum, p) => sum + p, 0));
    if (!isMember) return { units, byClub: false, boxTotal, clubTotal: null };
    const clubUnits = listPrices.map((list, i) => {
        const member = Number(memberPrices?.[i]) || 0;
        return member > 0 && member < Number(list) ? member : Number(list);
    });
    const clubTotal = round2(clubUnits.reduce((sum, p) => sum + p, 0));
    return clubTotal < boxTotal ? { units: clubUnits, byClub: true, boxTotal, clubTotal } : { units, byClub: false, boxTotal, clubTotal };
}

/**
 * Re-prices every Pick & Mix box in a bag for the shopper's current membership, so a box added as a guest is fair the moment they
 * sign in (and goes back to the box price when they sign out). Lines carry `listPrice`, `clubAlt` (that product's Club price) and
 * `offerPrice` (the box price). Other lines are returned untouched.
 */
export function repriceMixBoxes(items, isMember) {
    const groups = new Map();
    items.forEach((item, i) => {
        const p = item.product;
        if (p.offerKind !== 'mix_match' || !p.offerGroup) return;
        if (!groups.has(p.offerGroup)) groups.set(p.offerGroup, []);
        groups.get(p.offerGroup).push(i);
    });
    if (groups.size === 0) return items;
    const next = items.slice();
    groups.forEach((indexes) => {
        const lines = indexes.map((i) => items[i].product);
        const { units, byClub } = mixBoxPricing(lines.map((p) => p.listPrice), lines.map((p) => p.clubAlt), lines[0].offerPrice, isMember);
        indexes.forEach((i, k) => {
            const p = items[i].product;
            if (p.price === units[k] && Boolean(p.mixByClub) === byClub) return;
            next[i] = { ...items[i], product: { ...p, price: units[k], mixByClub: byClub } };
        });
    });
    return next;
}

/**
 * What the Chikit Club does to a bag, line by line:
 *  - applied:   what a member is already saving (list price minus what they pay)
 *  - potential: what a guest would save by joining (list price minus Club price)
 * Offer lines are left out of "potential" (the offer is the deal there) and a Pick & Mix box a member prices by Club counts as applied.
 */
export function clubSavings(items, isMember) {
    let applied = 0;
    let potential = 0;
    items.forEach(({ product, quantity }) => {
        if (product.bundleId) return;
        const list = Number(product.listPrice ?? product.price) || 0;
        if (product.offerId) {
            if (isMember && product.mixByClub) applied += Math.max(0, list - Number(product.price)) * quantity;
            return;
        }
        const member = Number(product.memberPrice) || 0;
        if (!(member > 0 && member < list)) return;
        if (isMember) applied += (list - Number(product.price)) * quantity;
        else potential += (list - member) * quantity;
    });
    return { applied: round2(Math.max(0, applied)), potential: round2(Math.max(0, potential)) };
}
