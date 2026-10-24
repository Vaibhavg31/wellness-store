/**
 * "Find your Prakriti" quiz — content and matching rules.
 * Three questions score Vata / Pitta / Kapha; a fourth picks the wellness goal.
 * Products are matched by category slug (see recommendProducts), so the
 * quiz keeps working whatever the admin sells.
 */

export const DOSHAS = {
    vata: {
        label: 'Vata',
        element: 'Air & Space',
        tagline: 'Creative, quick and always moving',
        summary: 'Your energy comes in bursts and your body runs light and dry. Warmth, routine and nourishment keep you steady.',
        rituals: [
            'Eat warm, cooked meals at regular times',
            'Start the day with a little warm sesame or coconut oil massage',
            'Wind down early; a steady bedtime calms a busy mind',
        ],
        affinity: ['immunity', 'vitamins', 'superfoods', 'digestive-health', 'herbal'],
    },
    pitta: {
        label: 'Pitta',
        element: 'Fire & Water',
        tagline: 'Focused, driven and full of fire',
        summary: 'You run warm with a sharp appetite and a sharper mind. Cooling, soothing habits stop that fire from burning out.',
        rituals: [
            'Favour cooling foods: cucumber, mint, coconut water, sweet fruit',
            'Go easy on very spicy, fried and sour food',
            'Make time outdoors in the cool of morning or evening',
        ],
        affinity: ['digestive-health', 'personal-care', 'superfoods', 'herbal'],
    },
    kapha: {
        label: 'Kapha',
        element: 'Earth & Water',
        tagline: 'Calm, strong and steady',
        summary: 'You have natural stamina and a grounded nature. Light food and regular movement keep you energised, not sluggish.',
        rituals: [
            'Choose light, warm and spiced meals; skip heavy late dinners',
            'Move daily: a brisk morning walk beats a long lie-in',
            'Sip warm ginger or herbal water through the day',
        ],
        affinity: ['weight-management', 'protein', 'digestive-health', 'immunity'],
    },
};

export const QUESTIONS = [
    {
        id: 'energy',
        title: 'How would you describe your body and energy?',
        options: [
            { label: 'Light and lean, energy comes in quick bursts', dosha: 'vata' },
            { label: 'Medium build, strong and driven, runs warm', dosha: 'pitta' },
            { label: 'Sturdy build, steady stamina, slow to get going', dosha: 'kapha' },
        ],
    },
    {
        id: 'digestion',
        title: 'How is your digestion and appetite?',
        options: [
            { label: 'Irregular: sometimes hungry, sometimes not, often bloated', dosha: 'vata' },
            { label: 'Strong hunger, get irritable or acidic if I skip a meal', dosha: 'pitta' },
            { label: 'Slow and steady, feel heavy after meals', dosha: 'kapha' },
        ],
    },
    {
        id: 'stress',
        title: 'When life gets stressful, you tend to…',
        options: [
            { label: 'Worry and overthink, sleep gets light', dosha: 'vata' },
            { label: 'Get impatient or short-tempered', dosha: 'pitta' },
            { label: 'Go quiet, withdraw or reach for comfort food', dosha: 'kapha' },
        ],
    },
];

export const GOAL_QUESTION = {
    id: 'goal',
    title: 'What would you most like help with?',
    options: [
        { label: 'Stronger immunity', value: 'immunity', categories: ['immunity'] },
        { label: 'Better digestion', value: 'digestion', categories: ['digestive-health'] },
        { label: 'Healthy weight', value: 'weight', categories: ['weight-management'] },
        { label: 'Hair and skin glow', value: 'glow', categories: ['personal-care'] },
        { label: 'Daily energy and fitness', value: 'energy', categories: ['protein', 'vitamins', 'superfoods'] },
    ],
};

/** Ties go to the first dosha in the list, so the result is deterministic. */
export function scoreDosha(answers) {
    const tally = { vata: 0, pitta: 0, kapha: 0 };
    QUESTIONS.forEach((question, i) => {
        const picked = question.options[answers[i]];
        if (picked) tally[picked.dosha] += 1;
    });
    return Object.keys(tally).reduce((best, key) => (tally[key] > tally[best] ? key : best), 'vata');
}

/** Goal match outranks dosha affinity; rating breaks ties. Out-of-stock items are skipped. */
export function recommendProducts(products, doshaKey, goalValue, limit = 3) {
    const dosha = DOSHAS[doshaKey];
    const goal = GOAL_QUESTION.options.find((option) => option.value === goalValue);
    if (!dosha || !Array.isArray(products)) return [];

    return products
        .filter((product) => !(typeof product.stock === 'number' && product.stock <= 0))
        .map((product) => {
            const goalHit = goal?.categories.includes(product.category) ? 3 : 0;
            const doshaHit = dosha.affinity.includes(product.category) ? 1 : 0;
            return { product, score: goalHit + doshaHit + (Number(product.rating) || 0) / 10 };
        })
        .filter((entry) => entry.score >= 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.product);
}

/** Shop link for "see everything for you": the goal's first category, else the whole shop. */
export function shopPathFor(goalValue) {
    const goal = GOAL_QUESTION.options.find((option) => option.value === goalValue);
    return goal ? `/shop?category=${goal.categories[0]}` : '/shop';
}

const STORAGE_KEY = 'chikit:prakriti';

export function loadSavedResult() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        if (saved && DOSHAS[saved.dosha]) return saved;
    } catch { /* storage blocked or corrupt: just start the quiz fresh */ }
    return null;
}

export function saveResult(result) {
    try {
        if (result) localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        else localStorage.removeItem(STORAGE_KEY);
    } catch { /* private mode: result simply isn't remembered */ }
}
