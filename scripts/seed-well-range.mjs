/**
 * Adds the client's Chikit "Well" range (from chikit icon.pdf) as HIDDEN draft products, so the shop owner only has to add
 * prices, photos and their own wording, then switch each one on. Prices are 0 and stock is 0; the server refuses to show a
 * product without a price. The picture is the product's line icon from the icon sheet until real photos are uploaded.
 * Safe to run again: a product whose title already exists is left alone.
 *
 * Usage: node scripts/seed-well-range.mjs <base-url> <admin-email> <admin-password>
 */
const [base, email, password] = process.argv.slice(2);
if (!base || !email || !password) {
    console.error('Usage: node scripts/seed-well-range.mjs <base-url> <admin-email> <admin-password>');
    process.exit(1);
}

async function call(method, path, body, token) {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${data.error ?? ''}`);
    return data;
}

const ICON = (n) => `/brand/icons/ingredients/${n}.webp`;
const SERIES_ICON = (n) => `/brand/icons/${n}.webp`;
const ing = (...names) => names.map((name) => ({ name, image: '', benefit: '' }));

// title, series, category, concern, format, ingredients, icon
const RANGE = [
    ['HimWell Stamina: Pure Shilajit Gold Resin', 'himwell', 'protein', 'stamina-booster', 'resin', ['Shilajit'], ICON('shilajit-resin')],
    ['HimWell Calm: Ashwagandha KSM-66 Capsules', 'himwell', 'vitamins', 'mens-wellness', 'capsules', ['Ashwagandha (KSM-66)'], ICON('ashwagandha')],
    ['HimWell Performance', 'himwell', 'vitamins', 'mens-wellness', 'formulation', [], SERIES_ICON('himwell-performance')],
    ['HerWell Cycle: Period Balance Shatavari Juice', 'herwell', 'vitamins', 'womens-wellness', 'juice', ['Shatavari'], ICON('shatavari')],
    ['HerWell Roots: Wild Amla Juice', 'herwell', 'personal-care', 'hair-wellness', 'juice', ['Wild Amla'], ICON('wild-amla')],
    ['GutWell Pure', 'gutwell', 'digestive-health', 'digestive-wellness', 'formulation', [], ICON('gut-walnut')],
    ['GutWell Flush', 'gutwell', 'digestive-health', 'digestive-wellness', 'formulation', [], SERIES_ICON('gutwell-flush')],
    ['WeighWell Burn: Amla, Harad, Daru Haridra, Gokhru Juice', 'weighwell', 'weight-management', 'weight-wellness', 'juice', ['Amla', 'Harad', 'Daru Haridra', 'Gokhru'], ICON('weighwell-burn-herbs')],
    ['WeighWell Lean: Raw Himalayan Apple Cider Vinegar with Mother', 'weighwell', 'weight-management', 'weight-wellness', 'apple cider vinegar', ['Himalayan apple cider vinegar (with mother)'], ICON('apple-cider-vinegar')],
    ['SugarWell Shield: Karela Jamun Juice', 'sugarwell', 'vitamins', 'diabetic-wellness', 'juice', ['Karela', 'Jamun'], ICON('karela-jamun')],
    ['HeartWell Cholesterol Guard: Herbal Cholesterol Care Juice', 'heartwell', 'vitamins', 'cardiac-wellness', 'juice', [], ICON('heart-herbal')],
    ['LiverWell Protect: Bhumi Amla & Kalmegh Liver Juice', 'liverwell', 'vitamins', 'liver-wellness', 'juice', ['Bhumi Amla', 'Kalmegh'], ICON('bhumi-amla-kalmegh')],
    ['ElderWell Uric: Balance Juice', 'elderwell', 'vitamins', 'pain-reliever', 'juice', [], ICON('knee-herbs')],
    ['GlowWell Berry: Himalayan Sea Buckthorn Juice', 'glowwell', 'personal-care', 'skin-wellness', 'juice', ['Himalayan Sea Buckthorn'], ICON('sea-buckthorn')],
    ['ThyroWell: Jatamansi, Jyotishmati, Gokshur, Karchur Juice', 'thyrowell', 'vitamins', 'thyroid-wellness', 'juice', ['Jatamansi', 'Jyotishmati', 'Gokshur', 'Karchur'], ICON('thyro-herbs')],
    ['CalmWell Sleep: Tagar Tablets', 'calmwell', 'vitamins', 'sleep-calm', 'tablets', ['Tagar'], ICON('tagar-sleep')],
    ['BabyWell: Ragi Makhana Powder', 'babywell', 'vitamins', 'baby-wellness', 'powder', ['Ragi', 'Makhana'], ICON('ragi-makhana')],
];

const login = await call('POST', '/api/auth/login', { email, password });
if (login.role !== 'admin') throw new Error('That login is not an admin');
const token = login.token;
const existing = new Set((await call('GET', '/api/products/admin/all', null, token)).map((p) => p.title.trim().toLowerCase()));
const categories = new Set((await call('GET', '/api/categories')).map((c) => c.slug));

let added = 0;
for (const [title, series, category, concern, format, ingredients, icon] of RANGE) {
    if (existing.has(title.toLowerCase())) { console.log(`  already there: ${title}`); continue; }
    const made = ingredients.length ? ` made with ${ingredients.join(', ')}` : '';
    await call('POST', '/api/products', {
        title,
        price: 0,
        originalPrice: 0,
        stock: 0,
        category: categories.has(category) ? category : [...categories][0],
        description: `Ayurvedic ${format}${made}, from the Chikit ${title.split(/[ :]/)[0]} series.`,
        images: [icon],
        tags: [],
        features: [],
        badges: [],
        isNew: true,
        isPublished: false,
        ingredients: ing(...ingredients),
        concerns: [concern],
        series,
    }, token);
    added++;
    console.log(`  draft added: ${title}`);
}
console.log(`${added} draft products added (hidden). Add a price and photos in the admin, then switch each one on.`);
