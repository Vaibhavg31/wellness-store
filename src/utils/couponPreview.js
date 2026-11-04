import { formatPrice } from '@/utils/formatPrice';

/**
 * Plain-words helpers for coupons, so every screen explains a coupon the same way.
 * The arithmetic mirrors CouponService on the server, which is what actually decides; this only previews it.
 */

/** "10% off, up to ₹150" / "₹100 off" / "Free delivery". */
export function couponTerms(coupon) {
    if (coupon.type === 'free_delivery') return 'Free delivery';
    if (coupon.type === 'flat') return `${formatPrice(coupon.value)} off`;
    const cap = coupon.maxDiscount > 0 ? `, up to ${formatPrice(coupon.maxDiscount)}` : '';
    return `${coupon.value}% off${cap}`;
}

/** The small print: the minimum and what the coupon cannot be used on. */
export function couponConditions(coupon) {
    const parts = [];
    if (coupon.minOrderAmount > 0) {
        parts.push(coupon.type === 'free_delivery'
            ? `On orders of ${formatPrice(coupon.minOrderAmount)} or more`
            : `On regular-priced products worth ${formatPrice(coupon.minOrderAmount)} or more`);
    }
    if (coupon.type !== 'free_delivery') parts.push('Not on offer boxes, pairs or bundles');
    return parts;
}

/**
 * What this coupon would do for the bag right now.
 *  - ready:   it applies; `saves` is the rupees it would take off
 *  - short:   the bag needs `gap` more rupees of regular-priced products
 *  - blocked: nothing in the bag can be discounted (everything is on an offer or bundle price)
 *  - idle:    the bag is empty
 */
export function couponPreview(coupon, { subtotal, eligibleSubtotal }) {
    if (subtotal <= 0) return { status: 'idle' };
    const reduces = coupon.type === 'percent' || coupon.type === 'flat';
    if (reduces && eligibleSubtotal <= 0) return { status: 'blocked' };
    const counted = reduces ? eligibleSubtotal : subtotal;
    if (coupon.minOrderAmount > 0 && counted < coupon.minOrderAmount) return { status: 'short', gap: Math.ceil(coupon.minOrderAmount - counted) };
    if (coupon.type === 'free_delivery') return { status: 'ready', saves: 0 };
    let saves = coupon.type === 'flat' ? Math.min(coupon.value, eligibleSubtotal) : (eligibleSubtotal * coupon.value) / 100;
    if (coupon.type === 'percent' && coupon.maxDiscount > 0) saves = Math.min(saves, coupon.maxDiscount);
    return { status: 'ready', saves: Math.round(Math.min(saves, eligibleSubtotal)) };
}
