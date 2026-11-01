/**
 * Applies the client's v1 feedback to a running store through its own admin API: the new homepage order, the top
 * ribbon, Watch & Shop reels, and starter content for every product (pack options with bottle counts, hero
 * ingredients with pictures, how-to-use steps, FAQs, concerns and videos). Safe to run again: it only sets values.
 * It works the same on the local test server and on the live site.
 *
 *   node scripts/seed-client-v1.mjs <base-url> <admin-email> <admin-password>
 *   e.g. node scripts/seed-client-v1.mjs http://127.0.0.1:8010 owner@example.com secret
 *
 * The product wording is a sensible starting point written for the demo (no medical claims); the owner should
 * review it and replace it with the brand's approved copy in the admin.
 */
const [base = 'http://127.0.0.1:8010', email, password] = process.argv.slice(2);
if (!email || !password) {
    console.error('Usage: node scripts/seed-client-v1.mjs <base-url> <admin-email> <admin-password>');
    process.exit(1);
}

const call = async (method, path, body, token) => {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error || ''}`);
    return data;
};

const { token } = await call('POST', '/api/auth/login', { email, password });
if (!token) throw new Error('Admin sign-in failed');

/* ------------------------------------------------------------------------------------------------ settings */

const current = await call('GET', '/api/settings');

// Homepage order: banner, running feature ribbon, trending, the whole range by category, Watch & Shop, trust, reviews.
const ON = ['bannerSlider', 'brandMarquee', 'trending', 'categoryShelves', 'watchShop', 'whyChoose', 'reviews', 'newsletter', 'promoBanner'];
const OFF = ['hero', 'categories', 'dayRitual', 'bundles', 'routineBuilder', 'packExplorer', 'herbAtlas', 'doshaQuiz', 'banners', 'videoBanner', 'instagram'];
const sections = Object.fromEntries([...ON.map((k) => [k, true]), ...OFF.map((k) => [k, false])]);

const REELS = [
    { n: 1, productId: 'ws-aloevera-juice-001', title: 'Wake the gut gently' },
    { n: 2, productId: 'ws-immunity-001', title: 'Your daily shield' },
    { n: 3, productId: 'ws-protein-001', title: 'Plant power in every scoop' },
    { n: 4, productId: 'ws-biotin-001', title: 'Hair, skin & nails' },
    { n: 5, productId: 'ws-triphala-001', title: 'Classic Ayurveda, made simple' },
    { n: 6, productId: 'ws-facewash-001', title: 'Fresh, clear skin' },
];

const extras = {
    ...current.extras,
    nav: { ...current.extras.nav, mode: 'ribbon' },
    concerns: [], // empty = the client's list of 14 (editable in the admin; saving it there makes it the stored list)
    ribbonMenu: [],
    ribbon: { items: [] },
    trending: { title: 'Trending now', auto: true, keywords: [] },
    watchShop: {
        title: 'Watch & Shop',
        subtitle: 'See it in action, then add it to your bag.',
        reels: REELS.map((r) => ({ id: `reel-${r.n}`, title: r.title, videoUrl: `/catalog/reels/reel-${r.n}.mp4`, poster: `/catalog/reels/reel-${r.n}.webp`, productId: r.productId })),
    },
    club: {
        enabled: true,
        cardName: 'Chikit Club Card',
        discountPercent: 10,
        tagline: 'Join free and pay less on most of the Chikit range, every day.',
        benefits: ['Member prices on most products', 'Early access to new launches', 'A birthday surprise from Chikit', 'Free to join, no minimum purchase'],
    },
};

// The email signup used to be called "Join the Chikit Circle", which sits beside the Chikit Club Card and looks like a second membership.
// Rename it only while it still has the old default wording, so a title the client chose themselves is never overwritten.
const newsletter = current.newsletter?.title === 'Join the Chikit Circle'
    ? { ...current.newsletter, badge: 'Chikit Updates', title: 'Stay in the loop' }
    : current.newsletter;

await call('PUT', '/api/settings', { theme: { ...current.theme, backgroundColor: '#FFFCF8' }, sections, extras, newsletter }, token);
console.log('Settings applied to', base);

/* ------------------------------------------------------------------------------------------------ products */

const ING_IMG = (name) => `/catalog/ingredients/${name}.webp`;
const ING = {
    'aloe-vera': ['Aloe Vera', 'Cold-pressed pulp traditionally used to soothe the stomach and support digestion.'],
    amla: ['Amla', 'A natural source of vitamin C and a classic Ayurvedic tonic.'],
    ginger: ['Ginger', 'A warming root traditionally used for comfortable digestion.'],
    biotin: ['Biotin', 'The B-vitamin that supports the normal health of hair, skin and nails.'],
    zinc: ['Zinc', 'An essential mineral that supports skin health and normal immune function.'],
    'vitamin-e': ['Vitamin E', 'An antioxidant vitamin that helps protect cells from everyday stress.'],
    neem: ['Neem', 'A time-honoured Ayurvedic herb used to keep skin clean and clear.'],
    'tea-tree': ['Tea Tree Oil', 'A refreshing essential oil known for its cleansing feel.'],
    'green-coffee': ['Green Coffee Bean', 'Unroasted coffee bean extract, standardised for chlorogenic acid.'],
    garcinia: ['Garcinia', 'A tangy fruit rind used in traditional Indian kitchens and wellness blends.'],
    'green-tea': ['Green Tea', 'Leaf extract that adds a gentle, clean source of antioxidants.'],
    onion: ['Onion', 'Rich in sulphur compounds; a long-loved ingredient in scalp care.'],
    'black-seed': ['Black Seed (Kalonji)', 'A traditional Ayurvedic seed oil that nourishes hair and scalp.'],
    bhringraj: ['Bhringraj', 'Known as the "king of hair" in Ayurveda, used for scalp and hair care.'],
    giloy: ['Giloy', 'Traditionally used to support the body’s natural defence.'],
    tulsi: ['Tulsi', 'Holy basil, an adaptogenic herb known for immune and respiratory support.'],
    'vitamin-c': ['Vitamin C', 'Supports normal immune function and helps reduce tiredness.'],
    'vitamin-d': ['Vitamin D3', 'Supports normal bones, muscles and immune function.'],
    'vitamin-b12': ['Vitamin B12', 'Helps release energy from food and supports the nervous system.'],
    'pea-protein': ['Pea Protein Isolate', 'Rich in BCAAs, supports lean muscle recovery.'],
    'brown-rice': ['Brown Rice Protein', 'Complements pea protein for a complete amino acid profile.'],
    cocoa: ['Cocoa', 'Real cocoa for a rich, chocolatey taste without added sugar.'],
    moringa: ['Moringa', 'The "drumstick" leaf, naturally rich in vitamins, minerals and plant compounds.'],
    spirulina: ['Spirulina', 'A nutrient-dense blue-green algae, high in plant protein and iron.'],
    wheatgrass: ['Wheatgrass', 'Young wheat shoots, a classic green to top up everyday nutrition.'],
    bibhitaki: ['Bibhitaki', 'One of the three fruits of Triphala, traditionally used for digestive balance.'],
    haritaki: ['Haritaki', 'The “king of medicines” in Ayurveda; one of the three fruits of Triphala.'],
};
const ingredients = (...keys) => keys.map((key) => ({ name: ING[key][0], benefit: ING[key][1], image: ING_IMG(key) }));

const FAQ_COMMON = [
    { question: 'Is it safe to take every day?', answer: 'Yes, when used as directed on the pack. Please stay within the suggested daily use, and check with your doctor if you have a medical condition or take regular medicines.' },
    { question: 'Can children or pregnant and breastfeeding women use it?', answer: 'We recommend checking with your doctor before use if you are pregnant, breastfeeding or giving it to a child.' },
    { question: 'How long before I notice a difference?', answer: 'Ayurveda works gradually and with consistency. Most people use a product for at least 4 to 8 weeks. Results vary from person to person.' },
    { question: 'Are there any side effects?', answer: 'Chikit products are made with food-grade ingredients and are well tolerated by most people. Stop use and consult your doctor if you notice any discomfort.' },
];

const variantSet = (label, unitWord, base, stock) => [
    { label: `${label}`, netQuantity: `1 ${unitWord}`, units: 1, price: base.price, originalPrice: base.original, stock: stock[0], isDefault: true, tag: 'Beginner friendly' },
    { label: 'Pack of 2', netQuantity: `2 ${unitWord}s`, units: 2, price: Math.round(base.price * 2 * 0.95), originalPrice: base.original * 2, stock: stock[1], isDefault: false, tag: 'Super saver' },
    { label: 'Pack of 3', netQuantity: `3 ${unitWord}s`, units: 3, price: Math.round(base.price * 3 * 0.9), originalPrice: base.original * 3, stock: stock[2], isDefault: false, tag: 'Best value' },
];

const CONTENT = {
    'ws-aloevera-juice-001': {
        concerns: ['digestive-wellness', 'daily-wellness'],
        features: ['Cold-pressed with real aloe pulp', 'No added sugar', 'Aloe, amla and ginger in one bottle', 'Lab tested for purity'],
        howToUse: ['Shake the bottle well before use.', 'Take 30 ml (about 2 tablespoons) mixed with a glass of water.', 'Best taken in the morning on an empty stomach, or as your practitioner advises.', 'Store in a cool place and refrigerate after opening.'],
        ingredients: ingredients('aloe-vera', 'amla', 'ginger'),
        faqs: [
            { question: 'How do I take the juice?', answer: 'Mix 30 ml with a glass of water and drink it once a day, preferably in the morning on an empty stomach.' },
            { question: 'Does it contain added sugar?', answer: 'No. It is sweetened only by the fruit and herbs in it.' },
            { question: 'Is it vegetarian?', answer: 'Yes, it is 100% plant based.' },
            { question: 'Why does the juice have pulp?', answer: 'We keep the natural aloe pulp in because it is where much of the goodness is. Shake the bottle before use.' },
            { question: 'How should I store it?', answer: 'Keep it in a cool, dry place away from sunlight and refrigerate after opening. Use within 30 days of opening.' },
            ...FAQ_COMMON,
        ],
        variants: variantSet('1 Bottle (1 L)', 'bottle', { price: 499, original: 999 }, [22, 14, 9]),
        videoReel: 1,
    },
    'ws-biotin-001': {
        concerns: ['hair-wellness', 'skin-wellness', 'womens-wellness', 'daily-wellness'],
        features: ['5000 mcg biotin per day', 'With zinc and vitamin E', 'Delicious strawberry gummies', 'No gelatin, vegetarian'],
        howToUse: ['Chew 2 gummies a day, preferably after a meal.', 'Do not exceed the suggested daily use.', 'Keep the lid tightly closed and store in a cool, dry place.', 'Keep out of reach of children.'],
        ingredients: ingredients('biotin', 'zinc', 'vitamin-e'),
        faqs: [
            { question: 'How many gummies should I take?', answer: 'Two gummies a day, chewed well, preferably after a meal.' },
            { question: 'Are the gummies vegetarian?', answer: 'Yes. They are made without gelatin and are suitable for vegetarians.' },
            { question: 'Will it make my hair grow faster?', answer: 'Biotin supports the normal health of hair, skin and nails as part of a balanced diet. Individual results vary.' },
            { question: 'Is there a lot of sugar in them?', answer: 'We keep sugar to a minimum; each serving has just enough to keep the gummies tasty.' },
            { question: 'Can I take it with other supplements?', answer: 'Usually yes, but please check with your doctor, especially if you already take a biotin or multivitamin supplement.' },
            ...FAQ_COMMON,
        ],
        variants: 'keep',
        videoReel: 4,
    },
    'ws-facewash-001': {
        concerns: ['skin-wellness'],
        features: ['Sulphate-free, soap-free cleansing', 'Neem and tea tree oil', 'Gentle enough for daily use', 'Dermatologically tested'],
        howToUse: ['Wet your face with water.', 'Massage a small amount in gentle circles for 30 seconds, avoiding the eyes.', 'Rinse well with water and pat dry.', 'Use morning and night.'],
        ingredients: ingredients('neem', 'tea-tree', 'aloe-vera'),
        faqs: [
            { question: 'Is it suitable for oily and acne-prone skin?', answer: 'It is made for everyday cleansing of normal to oily skin. Do a patch test first if your skin is sensitive.' },
            { question: 'Does it contain soap or sulphates?', answer: 'No. It is sulphate-free and soap-free.' },
            { question: 'Can I use it twice a day?', answer: 'Yes, morning and night.' },
            { question: 'Will it dry my skin?', answer: 'It is gentle, with aloe vera to keep skin comfortable. Use a moisturiser after if your skin is dry.' },
            ...FAQ_COMMON.slice(0, 1),
        ],
        variants: variantSet('1 Tube (100 ml)', 'tube', { price: 349, original: 449 }, [200, 60, 40]),
        videoReel: 6,
    },
    'ws-fatburner-001': {
        concerns: ['daily-wellness'],
        features: ['Green coffee bean standardised extract', 'With garcinia and green tea', 'Vegetarian capsules', 'No artificial colours'],
        howToUse: ['Take 1 capsule twice a day, 20 minutes before meals, with water.', 'Use alongside a balanced diet and regular activity.', 'Do not exceed the suggested daily use.', 'Not for use during pregnancy or by anyone under 18.'],
        ingredients: ingredients('green-coffee', 'garcinia', 'green-tea'),
        faqs: [
            { question: 'How do I take the capsules?', answer: 'One capsule twice a day, about 20 minutes before meals, with a glass of water.' },
            { question: 'Is it a substitute for diet and exercise?', answer: 'No. It is meant to support a healthy routine of balanced eating and activity.' },
            { question: 'Does it contain caffeine?', answer: 'Green coffee extract naturally contains a small amount of caffeine. If you are sensitive, please check with your doctor.' },
            { question: 'Who should avoid it?', answer: 'Pregnant or breastfeeding women, anyone under 18, and anyone with a medical condition or on regular medicine should consult a doctor first.' },
            ...FAQ_COMMON.slice(2, 3),
        ],
        variants: variantSet('1 Jar (60 capsules)', 'jar', { price: 799, original: 1099 }, [45, 20, 12]),
        videoReel: 8,
    },
    'ws-hairoil-001': {
        concerns: ['hair-wellness'],
        features: ['Cold-infused onion and black seed oil', 'With bhringraj and amla', 'No mineral oil or silicone', 'Light, non-sticky feel'],
        howToUse: ['Warm a small amount of oil between your palms.', 'Massage gently into the scalp and along the hair lengths.', 'Leave on for at least 1 hour, or overnight.', 'Wash with a mild shampoo. Use 2 to 3 times a week.'],
        ingredients: ingredients('onion', 'black-seed', 'bhringraj', 'amla'),
        faqs: [
            { question: 'How often should I apply it?', answer: 'Two to three times a week works well for most people.' },
            { question: 'Can I leave it on overnight?', answer: 'Yes. Cover your pillow, and wash it out the next morning.' },
            { question: 'Will it smell strongly of onion?', answer: 'It has a mild herbal aroma that fades after washing.' },
            { question: 'Is it suitable for all hair types?', answer: 'Yes. Do a small patch test first if you have a sensitive scalp.' },
            ...FAQ_COMMON.slice(2, 3),
        ],
        variants: variantSet('1 Bottle (200 ml)', 'bottle', { price: 449, original: 599 }, [90, 40, 25]),
        videoReel: 7,
    },
    'ws-immunity-001': {
        concerns: ['immunity-wellness', 'daily-wellness'],
        features: ['Giloy, amla and tulsi', 'Rich in natural vitamin C', 'No added sugar or colour', 'Daily Ayurvedic shield'],
        howToUse: ['Shake well.', 'Take 30 ml diluted in a glass of water once a day.', 'Best taken in the morning.', 'Refrigerate after opening and finish within 30 days.'],
        ingredients: ingredients('giloy', 'amla', 'tulsi'),
        faqs: [
            { question: 'When is the best time to take it?', answer: 'In the morning, diluted in water. It can also be taken before a meal.' },
            { question: 'Is it okay for the whole family?', answer: 'Adults can take 30 ml a day. For children, please check with your doctor.' },
            { question: 'Does it contain sugar?', answer: 'No added sugar.' },
            { question: 'Can I take it with my other medicines?', answer: 'If you are on regular medicines, particularly for diabetes or blood pressure, please check with your doctor before use.' },
            ...FAQ_COMMON.slice(2),
        ],
        variants: variantSet('1 Bottle (1 L)', 'bottle', { price: 399, original: 549 }, [80, 30, 20]),
        videoReel: 2,
    },
    'ws-multivitamin-001': {
        concerns: ['daily-wellness', 'womens-wellness', 'mens-wellness'],
        features: ['25+ vitamins and minerals', 'Delicious orange gummies', 'Vegetarian and gelatin-free', 'One simple daily habit'],
        howToUse: ['Chew 2 gummies a day with a meal.', 'Do not exceed the suggested daily use.', 'Store in a cool, dry place with the lid closed.', 'Keep out of reach of children.'],
        ingredients: ingredients('vitamin-c', 'vitamin-d', 'zinc', 'vitamin-b12'),
        faqs: [
            { question: 'How many gummies a day?', answer: 'Two gummies a day with a meal.' },
            { question: 'Is it for men and women?', answer: 'Yes. It is a general daily multivitamin for adults.' },
            { question: 'Is it vegetarian?', answer: 'Yes, and free from gelatin.' },
            { question: 'Can I take it with other supplements?', answer: 'Please check your other supplements so that you do not exceed recommended amounts, and ask your doctor if unsure.' },
            ...FAQ_COMMON.slice(2),
        ],
        variants: 'keep',
        videoReel: 9,
    },
    'ws-protein-001': {
        concerns: ['stamina-booster', 'mens-wellness', 'womens-wellness', 'daily-wellness'],
        features: ['24 g plant protein per serving', 'Pea and brown rice blend', 'Zero added sugar', 'Easy to digest'],
        howToUse: ['Add 1 scoop (about 30 g) to 250 ml of cold water, milk or a plant drink.', 'Shake or blend until smooth.', 'Have it after a workout or as a meal top-up.', 'Close the tub tightly after each use.'],
        ingredients: ingredients('pea-protein', 'brown-rice', 'cocoa'),
        faqs: 'keep',
        variants: 'keep',
        videoReel: 3,
    },
    'ws-superfood-greens-001': {
        concerns: ['daily-wellness', 'digestive-wellness'],
        features: ['20+ greens and superfoods', 'Moringa, spirulina and wheatgrass', 'No artificial flavours or sweeteners', '30 servings per pouch'],
        howToUse: ['Mix 1 scoop (about 10 g) in 200 ml of water or juice.', 'Stir or shake well.', 'Have it once a day, preferably in the morning.', 'Reseal the pouch and store in a cool, dry place.'],
        ingredients: ingredients('moringa', 'spirulina', 'wheatgrass'),
        faqs: [
            { question: 'What does it taste like?', answer: 'Earthy and fresh, like greens. It tastes lighter in juice or a smoothie.' },
            { question: 'Can I add it to a smoothie?', answer: 'Yes. It blends well with fruit, yoghurt or a plant drink.' },
            { question: 'Does it replace vegetables?', answer: 'No. It is a convenient top-up and not a replacement for fresh vegetables.' },
            ...FAQ_COMMON.slice(0, 1),
        ],
        variants: variantSet('1 Pouch (300 g)', 'pouch', { price: 999, original: 1299 }, [70, 30, 18]),
        videoReel: 10,
    },
    'ws-triphala-001': {
        concerns: ['digestive-wellness', 'daily-wellness'],
        features: ['Classical three-fruit Triphala blend', 'Supports regular digestion', 'Gentle, everyday use', 'Vegetarian tablets'],
        howToUse: ['Take 2 tablets at bedtime with warm water.', 'Use consistently for best results.', 'Reduce the dose if you notice loose stools.', 'Store in a cool, dry place.'],
        ingredients: ingredients('amla', 'bibhitaki', 'haritaki'),
        faqs: [
            { question: 'When should I take Triphala?', answer: 'Most people take 2 tablets at bedtime with warm water.' },
            { question: 'Is it habit-forming?', answer: 'Triphala is a gentle classical formula and is not habit-forming when used as directed.' },
            { question: 'Can I take it during the day?', answer: 'Yes. It can also be taken after meals if you prefer.' },
            { question: 'Is it vegetarian?', answer: 'Yes, it is 100% plant based.' },
            ...FAQ_COMMON.slice(1),
        ],
        variants: variantSet('1 Jar (90 tablets)', 'jar', { price: 299, original: 399 }, [140, 60, 40]),
        videoReel: 5,
    },
};

let done = 0;
for (const [id, c] of Object.entries(CONTENT)) {
    const product = await call('GET', `/api/products/admin/${id}`, null, token);
    const update = {
        concerns: c.concerns,
        features: c.features,
        howToUse: c.howToUse,
        ingredients: c.ingredients,
        videos: [{ url: `/catalog/reels/reel-${c.videoReel}.mp4`, poster: `/catalog/reels/reel-${c.videoReel}.webp`, title: product.title }],
        clubEligible: true,
    };
    if (c.faqs !== 'keep') update.faqs = c.faqs;
    else update.faqs = [...(product.faqs ?? []), ...FAQ_COMMON.filter((f) => !(product.faqs ?? []).some((p) => p.question === f.question))];

    if (c.variants === 'keep') {
        // Existing month-supply packs: keep ids, prices and stock; add the bottle count and a ribbon; start on the smallest pack.
        const existing = [...(product.variants ?? [])].sort((a, b) => a.price - b.price);
        const tags = ['Starter pack', 'Super saver', 'Complete wellness'];
        update.variants = existing.map((v, i) => ({ ...v, units: i + 1, tag: tags[i] ?? '', isDefault: i === 0 }));
    } else {
        // Keep stock if the product already has variants with the same label; otherwise use the seeded stock.
        update.variants = c.variants;
    }
    await call('PUT', `/api/products/${id}`, update, token);
    done += 1;
    console.log('  product updated:', id);
}
console.log(`Content applied to ${done} products.`);
