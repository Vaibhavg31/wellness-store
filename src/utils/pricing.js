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
