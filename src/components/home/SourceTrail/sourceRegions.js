/**
 * Real sourcing stops, in visiting order (north to south, roughly tracing a
 * route across India). Each `keyword` is matched against live product
 * titles — same "resolve from the real catalog, don't hardcode a product"
 * principle as wellnessRituals — so the "Shop products with this
 * ingredient" link never points at something that doesn't actually exist.
 *
 * `coord` is a percentage position (x, y) inside the stylized map's
 * viewBox, used to place the stop's dot and to build the connecting travel
 * line the DrawSVG animation traces.
 */
export const REGIONS = [
    {
        id: 'mp-ashwagandha',
        ingredient: 'Ashwagandha KSM-66',
        region: 'Madhya Pradesh, India',
        note: "Root harvested after a full season in India's ashwagandha belt, where the mineral-rich soil concentrates its actives.",
        keyword: 'ashwagandha',
        coord: { x: 48, y: 42 },
    },
    {
        id: 'up-amla',
        ingredient: 'Amla (Indian Gooseberry)',
        region: 'Pratapgarh, Uttar Pradesh',
        note: 'Hand-picked from orchards in one of the country’s oldest amla-growing belts, processed within days of harvest to protect its vitamin C.',
        keyword: 'amla',
        coord: { x: 56, y: 22 },
    },
    {
        id: 'rj-aloe',
        ingredient: 'Aloe Vera',
        region: 'Rajasthan, India',
        note: 'Grown in arid soil that concentrates its actives under stress, then cold-pressed to preserve them.',
        keyword: 'aloe',
        coord: { x: 26, y: 34 },
    },
    {
        id: 'tn-moringa',
        ingredient: 'Moringa Leaf',
        region: 'Tamil Nadu, India',
        note: 'Leaf picked young for peak nutrient density and shade-dried within hours, before heat can strip it.',
        keyword: 'moringa',
        coord: { x: 42, y: 88 },
    },
    {
        id: 'tn-spirulina',
        ingredient: 'Spirulina',
        region: 'Coastal Tamil Nadu, India',
        note: 'Cultivated in controlled open ponds along the coast, harvested and dried at low temperature to keep it raw.',
        keyword: 'spirulina',
        coord: { x: 52, y: 96 },
    },
];

/** Keyword match against live product titles — mirrors matchProducts' text
 *  check in wellnessRituals, kept separate since this matches on a single
 *  ingredient word rather than a goal's category/keyword set. */
export function productsForIngredient(products, keyword) {
    const kw = keyword.toLowerCase();
    return (products || []).filter((p) => (p.title || '').toLowerCase().includes(kw));
}
