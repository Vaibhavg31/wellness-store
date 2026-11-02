import { productMatches } from '@/utils/searchProducts';
import { seriesOf } from '@/utils/wellRange';

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

/**
 * The starting list (from the client's brief). `search` holds the keywords that also place a product in the concern. Pictures
 * are the line icons from the client's own icon sheet (chikit icon.pdf), in public/brand/icons. Kidney Wellness and Blood
 * Purifier have no icon of their own in that sheet yet, so they borrow the closest one (flush, karela-jamun).
 */
export const DEFAULT_CONCERNS = [
    { label: 'Cardiac Wellness', search: 'heart, cardiac, arjuna', icon: 'heart', image: '/brand/icons/heartwell-cholesterol.webp' },
    { label: 'Daily Wellness', search: 'daily, multivitamin, greens', icon: 'sun', image: '/brand/icons/himwell-calm.webp' },
    { label: 'Diabetic Wellness', search: 'diabetic, sugar, glucose', icon: 'droplet', image: '/brand/icons/sugarwell-shield.webp' },
    { label: 'Digestive Wellness', search: 'digestive, digestion, gut, aloe, triphala', icon: 'leaf', image: '/brand/icons/gutwell-pure.webp' },
    { label: 'Hair Wellness', search: 'hair, scalp, biotin, onion', icon: 'sparkles', image: '/brand/icons/herwell-roots.webp' },
    { label: 'Immunity Wellness', search: 'immunity, giloy, tulsi, amla', icon: 'shield', image: '/brand/icons/ingredients/wild-amla.webp' },
    { label: 'Kidney Wellness', search: 'kidney, renal', icon: 'bean', image: '/brand/icons/gutwell-flush.webp' },
    { label: 'Liver Wellness', search: 'liver, detox', icon: 'flask', image: '/brand/icons/liverwell-protect.webp' },
    { label: 'Men’s Wellness', search: 'men, mens, stamina', icon: 'mars', image: '/brand/icons/himwell-performance.webp' },
    { label: 'Pain Reliever', search: 'pain, joint, relief', icon: 'activity', image: '/brand/icons/elderwell-uric.webp' },
    { label: 'Skin Wellness', search: 'skin, face, neem, glow', icon: 'smile', image: '/brand/icons/glowwell-berry.webp' },
    { label: 'Stamina Booster', search: 'stamina, energy, protein, ashwagandha', icon: 'zap', image: '/brand/icons/himwell-stamina.webp' },
    { label: 'Women’s Wellness', search: 'women, womens, hormonal', icon: 'venus', image: '/brand/icons/herwell-cycle.webp' },
    { label: 'Blood Purifier', search: 'blood, purifier, neem', icon: 'droplets', image: '/brand/icons/ingredients/karela-jamun.webp' },
    // From the client's icon sheet (chikit icon.pdf), which names more needs than the first list of 14: WeighWell, ThyroWell, CalmWell, BabyWell.
    { label: 'Weight Wellness', search: 'weight, metabolism, fat, slim', icon: 'zap', image: '/brand/icons/weighwell-lean.webp' },
    { label: 'Thyroid Wellness', search: 'thyroid, thyro', icon: 'sparkles', image: '/brand/icons/thyrowell.webp' },
    { label: 'Sleep & Calm', search: 'sleep, calm, stress, tagar, ashwagandha', icon: 'sun', image: '/brand/icons/ingredients/tagar-sleep.webp' },
    { label: 'Baby Wellness', search: 'baby, kids, ragi, makhana', icon: 'smile', image: '/brand/icons/ingredients/ragi-makhana.webp' },
].map((c) => ({ image: '', enabled: true, ...c, slug: concernSlug(c.label) }));

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
        || seriesOf(p)?.concern === concern.slug
        || keywords.some((k) => productMatches(p, k, categories))
    ));
}
