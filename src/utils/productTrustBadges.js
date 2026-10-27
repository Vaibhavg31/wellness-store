import { Shield, Truck, RotateCcw, Sparkles, Leaf, Wheat, Droplet, BadgeCheck } from 'lucide-react';
import { FREE_DELIVERY_THRESHOLD } from '@/constants';

/**
 * Preset trust badges an admin can pick per product, each with its own icon.
 * Keep labels here in sync with BADGE_OPTIONS in AdminProductFormPage.jsx.
 *
 * "Free Delivery" and "Fast Returns" are special: their on-screen text is
 * computed live from site delivery settings (so it always matches the
 * current threshold/return window), but whether they show at all is still
 * entirely up to whether the admin picked them for this product — same as
 * every other badge here. Nothing is added automatically.
 */
export const BADGE_ICONS = {
    'FSSAI Certified': Shield,
    'Lab Tested': Sparkles,
    '100% Vegetarian': Leaf,
    'Gluten-Free': Wheat,
    'No Added Sugar': Droplet,
    'GMP Certified': BadgeCheck,
    'Free Delivery': Truck,
    'Fast Returns': RotateCcw,
};

/** Resolve a stored badge label to its display label (dynamic for Free Delivery / Fast Returns). */
export function resolveBadgeLabel(label, content) {
    const delivery = content?.delivery ?? {};

    if (label === 'Free Delivery') {
        const threshold = Number(delivery.freeThreshold ?? FREE_DELIVERY_THRESHOLD);
        return Number.isFinite(threshold) && threshold > 0 ? `Free Delivery ₹${threshold}+` : 'Free Delivery';
    }

    if (label === 'Fast Returns') {
        const returnDays = Number(delivery.returnDays);
        return Number.isFinite(returnDays) && returnDays > 0 ? `${returnDays}-Day Returns` : 'Fast Returns';
    }

    return label;
}

/**
 * Build product-page trust badges: exactly the badges the admin picked for
 * this product, in order — nothing more, nothing less. Gated entirely by
 * the product's showTrustBadges flag.
 */
export function getProductTrustBadges(content, product) {
    if (!product || product.showTrustBadges === false) {
        return [];
    }

    return (product.badges ?? []).map((label) => ({
        icon: BADGE_ICONS[label] || BadgeCheck,
        label: resolveBadgeLabel(label, content),
    }));
}
