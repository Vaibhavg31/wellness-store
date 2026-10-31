/**
 * Money rules for the offer pages. Kept free of any database access so they can be tested on their own, and mirrored
 * in the storefront (src/utils/pricing.js) so the bag shows exactly what checkout will charge.
 */

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** "Buy 1 Get 1 Free": two units are bought as a pair, each priced at half, so a pair costs one unit's price. */
export function bogoUnitPrice(listPrice) {
    return round2(Number(listPrice) / 2);
}

/**
 * "Pick any N for one price": the box costs `boxPrice`, or the plain total when that is lower (a box must never cost more
 * than buying the same things one by one). The saving is spread over the lines in proportion to their prices and the
 * last line takes the rounding, so the lines always add up to exactly the box price. Returns each line's unit price.
 */
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
