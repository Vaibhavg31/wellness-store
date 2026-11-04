/**
 * Products to show off the Chikit Club with: each has a picture and a Chikit Club price below its usual price, best sellers first.
 * Used by the home page's Club band and by the Club page, so both list the same products in the same order.
 */
export function clubExamples(products, count = 8) {
    const withClub = (products ?? []).filter((p) => p.images?.[0] && Number(p.memberPrice) > 0 && p.memberPrice < p.price && !(typeof p.stock === 'number' && p.stock <= 0));
    const ranked = [...withClub.filter((p) => p.isBestSeller), ...withClub.filter((p) => !p.isBestSeller)];
    return ranked.slice(0, Math.max(1, count));
}
