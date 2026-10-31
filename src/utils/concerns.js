import { productMatches } from '@/utils/searchProducts';

/**
 * "Concerns" are the health goals shoppers browse by (Digestive Wellness, Hair Wellness …). The admin can switch each
 * one on or off, rename it and give it a picture; this file holds the starting list and the rules for which products
 * belong to a concern.
 */

/** URL-safe name: "Men’s Wellness" → "mens-wellness". */
export function concernSlug(label) {
    return String(label ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’`]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** The starting list (from the client's brief). `search` holds the keywords that also place a product in the concern. */
export const DEFAULT_CONCERNS = [
    { label: 'Cardiac Wellness', search: 'heart, cardiac, arjuna', icon: 'heart' },
    { label: 'Daily Wellness', search: 'daily, multivitamin, greens', icon: 'sun' },
    { label: 'Diabetic Wellness', search: 'diabetic, sugar, glucose', icon: 'droplet' },
    { label: 'Digestive Wellness', search: 'digestive, digestion, gut, aloe, triphala', icon: 'leaf' },
    { label: 'Hair Wellness', search: 'hair, scalp, biotin, onion', icon: 'sparkles' },
    { label: 'Immunity Wellness', search: 'immunity, giloy, tulsi, amla', icon: 'shield' },
    { label: 'Kidney Wellness', search: 'kidney, renal', icon: 'bean' },
    { label: 'Liver Wellness', search: 'liver, detox', icon: 'flask' },
    { label: 'Men’s Wellness', search: 'men, mens, stamina', icon: 'mars' },
    { label: 'Pain Reliever', search: 'pain, joint, relief', icon: 'activity' },
    { label: 'Skin Wellness', search: 'skin, face, neem, glow', icon: 'smile' },
    { label: 'Stamina Booster', search: 'stamina, energy, protein, ashwagandha', icon: 'zap' },
    { label: 'Women’s Wellness', search: 'women, womens, hormonal', icon: 'venus' },
    { label: 'Blood Purifier', search: 'blood, purifier, neem', icon: 'droplets' },
].map((c) => ({ ...c, slug: concernSlug(c.label), image: '', enabled: true }));

/** The concerns to show: the admin's own list when there is one, else the starting list; switched-off ones removed. */
export function activeConcerns(extras) {
    const saved = Array.isArray(extras?.concerns) ? extras.concerns : [];
    const list = saved.length > 0 ? saved : DEFAULT_CONCERNS;
    return list
        .filter((c) => c.label && c.enabled !== false)
        .map((c) => ({ ...c, slug: c.slug || concernSlug(c.label) }));
}

/**
 * Products in a concern: the ones the admin ticked for it on the product page, plus anything that matches the
 * concern's keywords (so a new product shows up under "Hair Wellness" the moment it says "hair").
 */
export function productsForConcern(products, concern, categories = []) {
    if (!concern) return [];
    const keywords = String(concern.search ?? '').split(/[,;\n]/).map((k) => k.trim()).filter(Boolean);
    return products.filter((p) => (
        (p.concerns ?? []).includes(concern.slug)
        || keywords.some((k) => productMatches(p, k, categories))
    ));
}
