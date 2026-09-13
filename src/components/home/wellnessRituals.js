import { Zap, ShieldCheck, Dumbbell, Sprout, Sparkles, Moon, HeartPulse, Bone } from 'lucide-react';

/**
 * Shared domain model for the goal-driven homepage sections
 * (RitualBuilder's quiz, WellnessJourney's scrollytelling, and BodyMap's
 * zone callouts). Keeping the goal → catalog mapping in one place means
 * every section stays truthful to the same story instead of drifting apart
 * with their own hardcoded picks.
 */
export const GOALS = [
    {
        id: 'energy',
        label: 'Energy & Focus',
        blurb: 'Beat the 4pm slump, stay sharp for longer.',
        icon: Zap,
        categories: ['herbal', 'protein'],
        keywords: ['ashwagandha'],
    },
    {
        id: 'immunity',
        label: 'Immunity',
        blurb: 'A daily baseline of defence, not a fire-fighting fix.',
        icon: ShieldCheck,
        categories: ['vitamins', 'herbal'],
        keywords: ['vitamin d', 'multivitamin', 'turmeric'],
    },
    {
        id: 'strength',
        label: 'Strength & Fitness',
        blurb: 'Fuel the effort, don\'t let recovery lag behind it.',
        icon: Dumbbell,
        categories: ['protein'],
        keywords: [],
    },
    {
        id: 'gut',
        label: 'Gut Health',
        blurb: 'Digestion that supports you instead of slowing you down.',
        icon: Sprout,
        categories: ['superfoods'],
        keywords: ['moringa', 'chia', 'flax'],
    },
    {
        id: 'skin-hair',
        label: 'Skin & Hair',
        blurb: 'Nourishment that shows up on the outside, eventually.',
        icon: Sparkles,
        categories: ['superfoods', 'vitamins'],
        keywords: ['moringa', 'multivitamin'],
    },
    {
        id: 'sleep',
        label: 'Sleep & Calm',
        blurb: 'Wind down for real, so repair can actually happen.',
        icon: Moon,
        categories: ['herbal'],
        keywords: ['ashwagandha'],
    },
    {
        id: 'heart',
        label: 'Heart Health',
        blurb: 'Circulation is the delivery system for everything else.',
        icon: HeartPulse,
        categories: ['vitamins', 'superfoods'],
        keywords: ['multivitamin', 'omega', 'spirulina'],
    },
    {
        id: 'joints',
        label: 'Joint Mobility',
        blurb: "Cartilage doesn't repair itself overnight — consistency here is what keeps movement easy later.",
        icon: Bone,
        categories: ['ayurveda'],
        keywords: ['ashwagandha', 'turmeric', 'collagen'],
    },
];

export const GOAL_MAP = Object.fromEntries(GOALS.map((g) => [g.id, g]));

/**
 * How many of a product's fields line up with a goal: category membership is
 * a full point, a keyword hit in the title is a full point — a product can
 * match a goal on both and score higher, which is what pushes it to the top
 * of that goal's candidate list.
 */
function goalScoreForProduct(goal, product) {
    let score = 0;
    if (goal.categories.includes(product.category)) score += 1;
    const title = (product.title || '').toLowerCase();
    if (goal.keywords.some((kw) => title.includes(kw))) score += 1;
    return score;
}

/**
 * Ranks products against a set of selected goals. Returns each matched
 * product once, annotated with which goal ids it serves and a combined
 * score, sorted best-match-first (ties broken by rating).
 */
export function matchProducts(products, goalIds, { limit } = {}) {
    const goals = goalIds.map((id) => GOAL_MAP[id]).filter(Boolean);
    if (!goals.length || !products?.length) return [];

    const scored = products
        .map((product) => {
            const matchedGoals = goals.filter((goal) => goalScoreForProduct(goal, product) > 0);
            const score = matchedGoals.reduce((sum, goal) => sum + goalScoreForProduct(goal, product), 0);
            return { product, matchedGoals: matchedGoals.map((g) => g.id), score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || (b.product.rating ?? 0) - (a.product.rating ?? 0));

    return typeof limit === 'number' ? scored.slice(0, limit) : scored;
}

/** Share of the selected goals that the current catalog can actually serve. */
export function coverageScore(products, goalIds) {
    if (!goalIds.length) return 0;
    const covered = goalIds.filter((id) => matchProducts(products, [id]).length > 0);
    return Math.round((covered.length / goalIds.length) * 100);
}

/** The single best-matching product for one goal — used by the day journey. */
export function bestMatchForGoal(products, goalId) {
    return matchProducts(products, [goalId], { limit: 1 })[0]?.product ?? null;
}
