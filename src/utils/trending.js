import { normalize, searchProducts } from '@/utils/searchProducts';

// Words that name a kind of product rather than what it is for, so they make poor "trending" searches.
const FILLER = new Set(['and', 'with', 'for', 'the', 'of', 'daily', 'juice', 'gummies', 'tablets', 'capsules', 'powder', 'oil', 'wash', 'blend', 'isolate']);

/**
 * Search words built from the catalogue itself for when the admin has not written a list: ingredient names first
 * (the things people actually look for, such as "ashwagandha"), then the lead word or two of each product's name,
 * best sellers first. Each is kept only if searching it really returns products.
 */
export function suggestKeywords(products, limit = 10) {
    const ranked = [...products].sort((a, b) => (Number(b.isBestSeller) - Number(a.isBestSeller)) || (Number(b.isNew) - Number(a.isNew)));
    const seen = new Set();
    const out = [];
    const add = (label) => {
        const key = normalize(label);
        const count = key.split(' ').length;
        if (!key || key.length < 3 || key.length > 18 || count > 2 || seen.has(key)) return;
        if (key.split(' ').every((w) => FILLER.has(w))) return;
        if (searchProducts(products, key).length === 0) return;
        seen.add(key);
        out.push({ label: key, query: key });
    };
    ranked.forEach((p) => (p.ingredients ?? []).forEach((i) => add(i.name)));
    ranked.forEach((p) => {
        const head = String(p.title).split(/[,&:(–—]|\s-\s/)[0];
        const lead = normalize(head).split(' ').filter((w) => !FILLER.has(w)).slice(0, 2).join(' ');
        add(lead);
    });
    return out.slice(0, limit);
}

