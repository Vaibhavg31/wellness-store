/**
 * The Chikit "Well" range, from the client's icon sheet (chikit icon.pdf): each series is a family of products for one
 * health need, with its own line icon. A product joins a series through its `series` field (set on the product page in
 * the admin). `concern` ties the series to the matching Concern page; `products` are the names on the icon sheet, shown
 * as "coming soon" until a product of that series is live.
 */
export const WELL_SERIES = [
    { key: 'himwell', name: 'HimWell', tagline: 'Stamina, strength and calm for men', concern: 'mens-wellness', icon: '/brand/icons/himwell-stamina.webp',
        products: ['HimWell Stamina: Pure Shilajit Gold Resin', 'HimWell Calm: Ashwagandha KSM-66 Capsules', 'HimWell Performance'] },
    { key: 'herwell', name: 'HerWell', tagline: 'Cycle balance and hair care for women', concern: 'womens-wellness', icon: '/brand/icons/herwell-cycle.webp',
        products: ['HerWell Cycle: Period Balance Shatavari Juice', 'HerWell Roots: Wild Amla Juice'] },
    { key: 'gutwell', name: 'GutWell', tagline: 'Everyday digestion and gentle cleanse', concern: 'digestive-wellness', icon: '/brand/icons/gutwell-pure.webp',
        products: ['GutWell Pure', 'GutWell Flush'] },
    { key: 'weighwell', name: 'WeighWell', tagline: 'Metabolism and healthy weight', concern: 'weight-wellness', icon: '/brand/icons/weighwell-lean.webp',
        products: ['WeighWell Burn: Amla, Harad, Daru Haridra, Gokhru Juice', 'WeighWell Lean: Raw Himalayan Apple Cider Vinegar with Mother'] },
    { key: 'sugarwell', name: 'SugarWell', tagline: 'Support for healthy sugar levels', concern: 'diabetic-wellness', icon: '/brand/icons/sugarwell-shield.webp',
        products: ['SugarWell Shield: Karela Jamun Juice'] },
    { key: 'heartwell', name: 'HeartWell', tagline: 'Heart and cholesterol care', concern: 'cardiac-wellness', icon: '/brand/icons/heartwell-cholesterol.webp',
        products: ['HeartWell Cholesterol Guard: Herbal Cholesterol Care Juice'] },
    { key: 'liverwell', name: 'LiverWell', tagline: 'Liver care with Bhumi Amla and Kalmegh', concern: 'liver-wellness', icon: '/brand/icons/liverwell-protect.webp',
        products: ['LiverWell Protect: Bhumi Amla & Kalmegh Liver Juice'] },
    { key: 'elderwell', name: 'ElderWell', tagline: 'Joint comfort and uric acid balance', concern: 'pain-reliever', icon: '/brand/icons/elderwell-uric.webp',
        products: ['ElderWell Uric: Balance Juice'] },
    { key: 'glowwell', name: 'GlowWell', tagline: 'Skin glow from within', concern: 'skin-wellness', icon: '/brand/icons/glowwell-berry.webp',
        products: ['GlowWell Berry: Himalayan Sea Buckthorn Juice'] },
    { key: 'thyrowell', name: 'ThyroWell', tagline: 'Thyroid balance', concern: 'thyroid-wellness', icon: '/brand/icons/thyrowell.webp',
        products: ['ThyroWell: Jatamansi, Jyotishmati, Gokshur, Karchur Juice'] },
    { key: 'calmwell', name: 'CalmWell', tagline: 'Restful sleep', concern: 'sleep-calm', icon: '/brand/icons/ingredients/tagar-sleep.webp',
        products: ['CalmWell Sleep: Tagar Tablets'] },
    { key: 'babywell', name: 'BabyWell', tagline: 'Wholesome nutrition for little ones', concern: 'baby-wellness', icon: '/brand/icons/ingredients/ragi-makhana.webp',
        products: ['BabyWell: Ragi Makhana Powder'] },
];

/** The series a product belongs to: its own `series` field, else a series name at the start of its title ("HerWell Roots …"). */
export function seriesOf(product) {
    const key = String(product?.series ?? '').toLowerCase();
    if (key) return WELL_SERIES.find((s) => s.key === key) ?? null;
    const title = String(product?.title ?? '').toLowerCase();
    return WELL_SERIES.find((s) => title.startsWith(s.key)) ?? null;
}

/** Series names that serve a Concern page, e.g. cardiac-wellness → ['HeartWell']. */
export function seriesForConcern(slug) {
    return WELL_SERIES.filter((s) => s.concern === slug).map((s) => s.name);
}
