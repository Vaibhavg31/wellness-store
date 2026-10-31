/**
 * Product search that behaves the way shoppers expect.
 *
 * The old search looked for the typed letters anywhere inside the title, description and category, so a half word such
 * as "ry" matched every product whose description contained "every" or "daily" and showed seemingly random products.
 * Here a word the shopper types must START a word in the product (so "prot" finds "Protein"), every word they type
 * must be found (so "face wash" needs both), small typos still work for longer words ("protien"), and results come
 * back best match first. The long description counts only for whole words, never for fragments.
 */

const WEIGHT = { title: 10, tag: 7, category: 6, ingredient: 5, feature: 3, description: 1.5 };

/** Lower-case, drop accents and punctuation: "Men’s Wellness!" → "mens wellness". */
export function normalize(text) {
    return String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’`]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

const words = (text) => normalize(text).split(' ').filter(Boolean);

/** Edit distance between two short words (swapping two neighbouring letters counts as one typo), or Infinity past `max`. */
function editDistance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return Infinity;
    let beforePrev = null;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
        const row = [i];
        let best = i;
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
            if (beforePrev && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], beforePrev[j - 2] + 1);
            if (row[j] < best) best = row[j];
        }
        if (best > max) return Infinity;
        beforePrev = prev;
        prev = row;
    }
    return prev[b.length];
}

/** How many typos a word of this length may contain and still count as a match. */
const typoBudget = (length) => (length >= 8 ? 2 : length >= 5 ? 1 : 0);

/** What is searchable about a product, split into weighted word lists (built once per product). */
const indexCache = new WeakMap();
function indexFor(product, categoryLabel) {
    const cached = indexCache.get(product);
    if (cached && cached.categoryLabel === categoryLabel) return cached.index;
    const fields = [
        { weight: WEIGHT.title, list: words(product.title) },
        { weight: WEIGHT.tag, list: (product.tags ?? []).flatMap(words) },
        { weight: WEIGHT.category, list: [...words(categoryLabel), ...words(product.category)] },
        { weight: WEIGHT.ingredient, list: (product.ingredients ?? []).flatMap((i) => words(i.name)) },
        { weight: WEIGHT.feature, list: (product.features ?? []).flatMap(words) },
        { weight: WEIGHT.description, list: words(product.description), wholeWordOnly: true },
    ];
    const joinedTitle = normalize(product.title).replace(/ /g, '');
    const index = { fields, joinedTitle, titleStart: words(product.title)[0] ?? '' };
    indexCache.set(product, { categoryLabel, index });
    return index;
}

/** The best score one typed word earns in a product, or 0 when it is not found there at all. */
function scoreToken(token, index) {
    let best = 0;
    for (const { weight, list, wholeWordOnly } of index.fields) {
        for (const word of list) {
            let score = 0;
            if (word === token) score = weight * 1.25;
            else if (!wholeWordOnly && token.length >= 2 && word.startsWith(token)) score = weight * (0.7 + 0.3 * (token.length / word.length));
            else if (!wholeWordOnly && token.length >= 4 && editDistance(token, word, typoBudget(token.length)) <= typoBudget(token.length)) score = weight * 0.5;
            if (score > best) best = score;
        }
    }
    // "aloevera" (no space) still finds "Aloe Vera …"
    if (!best && token.length >= 5 && index.joinedTitle.includes(token)) best = WEIGHT.title * 0.6;
    return best;
}

/**
 * Products that match every word of `query`, best match first. An empty query returns all products in the order given.
 * `categories` (optional) lets a category's display name ("Digestive Health") be searched too.
 */
export function searchProducts(products, query, { categories = [] } = {}) {
    const tokens = words(query);
    if (tokens.length === 0) return products;
    const labels = new Map(categories.map((c) => [c.slug, c.label]));

    const scored = [];
    products.forEach((product, position) => {
        const index = indexFor(product, labels.get(product.category) ?? '');
        let total = 0;
        for (const token of tokens) {
            const score = scoreToken(token, index);
            if (!score) return; // every typed word must be found
            total += score;
        }
        if (index.titleStart && tokens[0] && index.titleStart.startsWith(tokens[0])) total += 4; // a title that starts with it ranks first
        scored.push({ product, total, position });
    });
    return scored.sort((a, b) => b.total - a.total || a.position - b.position).map((s) => s.product);
}

/** True when `query` finds this product (used to apply a concern's keywords). */
export function productMatches(product, query, categories = []) {
    return searchProducts([product], query, { categories }).length > 0;
}
