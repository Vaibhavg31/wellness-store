/**
 * One-time move of browser storage written under earlier brand names (rims → krivea → wellness)
 * to the Chikit keys, so existing visitors keep their session, bag and wishlist.
 */
const MOVES = {
    localStorage: [
        ['wellness-auth-token', 'chikit-auth-token'],
        ['wellness-auth-user', 'chikit-auth-user'],
        ['wellness-admin-token', 'chikit-admin-token'],
        ['wellness-cart', 'chikit-cart'],
        ['wellness-coupon', 'chikit-coupon'],
        ['wellness-wishlist', 'chikit-wishlist'],
        ['wellness-recently-viewed', 'chikit-recently-viewed'],
        ['wellness-auto-coupon-skipped', 'chikit-auto-coupon-skipped'],
        ['wellness-msg91-access-token', 'chikit-msg91-access-token'],
        ['wellness-msg91-req-id', 'chikit-msg91-req-id'],
    ],
    sessionStorage: [
        ['wellness-checkout-otp-flow', 'chikit-checkout-otp-flow'],
        ['wellness-loader-seen', 'chikit-loader-seen'],
        ['wellness-promo-dismissed', 'chikit-promo-dismissed'],
    ],
};

export function migrateStorage() {
    for (const [storeName, pairs] of Object.entries(MOVES)) {
        try {
            const store = window[storeName];
            for (const [oldKey, newKey] of pairs) {
                const value = store.getItem(oldKey);
                if (value !== null && store.getItem(newKey) === null) store.setItem(newKey, value);
                if (value !== null) store.removeItem(oldKey);
            }
        } catch {
            /* storage unavailable (private mode) — nothing to migrate */
        }
    }
}
