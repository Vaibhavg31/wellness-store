import { SettingsRepository } from '../repositories/settingsRepository.js';

/**
 * Chikit Club Card pricing rules, in one place.
 *
 * A member pays the product's own club price when the admin set one, otherwise the store-wide club discount
 * (a percentage) off the price shown to everyone. A product can be left out of the club, and a member price that would
 * not actually be lower is ignored. The same rule is mirrored in the storefront (src/utils/pricing.js) for display;
 * the server's answer is the one that is charged.
 */

const settings = new SettingsRepository();
let cached = null;
let cachedAt = 0;

/** { enabled, discountPercent, cardName } from the admin's settings, refreshed at most every 20 seconds. */
export async function clubConfig() {
    if (cached && Date.now() - cachedAt < 20_000) return cached;
    try {
        const { extras } = await settings.get();
        const club = extras?.club ?? {};
        cached = { enabled: club.enabled !== false, discountPercent: Number(club.discountPercent) || 0, cardName: club.cardName || 'Chikit Club Card' };
    } catch {
        cached = { enabled: true, discountPercent: 0, cardName: 'Chikit Club Card' };
    }
    cachedAt = Date.now();
    return cached;
}

/** Forget the cached settings (called after the admin saves, so a change shows at once). */
export function resetClubConfigCache() {
    cached = null;
}

const round2 = (n) => Math.round(n * 100) / 100;

/** The member price for one price point, or null when there is no member saving on it. */
export function memberPriceFor({ price, clubPrice = null, eligible = true }, cfg) {
    if (!cfg?.enabled || eligible === false) return null;
    const own = Number(clubPrice);
    const member = own > 0 ? own : round2(Number(price) * (1 - (cfg.discountPercent || 0) / 100));
    return member > 0 && member < Number(price) ? member : null;
}

/** Adds `memberPrice` to a product and each of its pack options (null when a member saves nothing). */
export function withMemberPrices(product, cfg) {
    const eligible = product.clubEligible !== false;
    for (const variant of product.variants ?? []) {
        variant.memberPrice = memberPriceFor({ price: variant.price, clubPrice: variant.clubPrice, eligible }, cfg);
    }
    const base = (product.variants ?? []).find((v) => v.isDefault) ?? product.variants?.[0];
    product.memberPrice = base
        ? base.memberPrice
        : memberPriceFor({ price: product.price, clubPrice: product.clubPrice, eligible }, cfg);
    return product;
}
