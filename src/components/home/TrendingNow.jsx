import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useProducts } from '@/hooks/useApi';
import { normalize, searchProducts } from '@/utils/searchProducts';

// Words that name a kind of product rather than what it is for, so they make poor "trending" searches.
const FILLER = new Set(['and', 'with', 'for', 'the', 'of', 'daily', 'juice', 'gummies', 'tablets', 'capsules', 'powder', 'oil', 'wash', 'blend', 'isolate']);

/**
 * Search words built from the catalogue itself for when the admin has not written a list: ingredient names first
 * (the things people actually look for, such as "ashwagandha"), then the lead word or two of each product's name,
 * best sellers first. Each is kept only if searching it really returns products.
 */
function suggestKeywords(products, limit = 10) {
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

/** "Trending now": quick searches for what shoppers look for, shown right under the banner. */
export default function TrendingNow() {
    const { content } = useSiteContent();
    const { products } = useProducts();
    const { title, auto, keywords } = content.extras.trending;

    const chips = useMemo(() => {
        if (keywords.length > 0) return keywords;
        return auto ? suggestKeywords(products) : [];
    }, [keywords, auto, products]);

    if (chips.length === 0) return null;

    return (
        <section aria-labelledby="trending-title" className="container-page py-5 lg:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <h2 id="trending-title" className="flex shrink-0 items-center gap-2.5 font-sans text-caption font-semibold uppercase tracking-[0.16em] text-primary-deep">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-accent"><TrendingUp size={16} aria-hidden="true" /></span>
                    {title}
                </h2>
                <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 scrollbar-none [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-24px),transparent)] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
                    {chips.map((chip) => (
                        <li key={chip.query} className="shrink-0">
                            <Link
                                to={`/shop?search=${encodeURIComponent(chip.query)}`}
                                className="inline-flex min-h-11 items-center rounded-full bg-canvas-alt px-4 text-small font-medium capitalize text-primary-deep ring-1 ring-accent transition-colors duration-200 hover:bg-primary hover:text-white hover:ring-primary sm:min-h-10"
                            >
                                {chip.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
