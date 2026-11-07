import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import Skeleton from '@/components/ui/Skeleton';
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
    const { products, loading } = useProducts();
    const { title, auto, keywords } = content.extras.trending;

    const chips = useMemo(() => {
        if (keywords.length > 0) return keywords;
        return auto ? suggestKeywords(products) : [];
    }, [keywords, auto, products]);

    // Words built from the products: keep the row's height while they load, so nothing below jumps when they appear.
    const waiting = loading && keywords.length === 0 && auto;
    if (chips.length === 0 && !waiting) return null;

    return (
        <section aria-labelledby="trending-title" className="container-page py-6 lg:py-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <h2 id="trending-title" className="flex shrink-0 items-center gap-2 font-sans text-body font-semibold sm:text-lead">
                    <TrendingUp size={20} className="text-primary" aria-hidden="true" /> {title}
                </h2>
                <ul aria-busy={waiting || undefined} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                    {waiting && ['w-20', 'w-16', 'w-24', 'w-[4.5rem]', 'w-20', 'w-16'].map((width, i) => <li key={i} className="shrink-0"><Skeleton className={`h-11 rounded-full ${width}`} /></li>)}
                    {!waiting && chips.map((chip) => (
                        <li key={chip.query} className="shrink-0">
                            <Link
                                to={`/shop?search=${encodeURIComponent(chip.query)}`}
                                className="inline-flex min-h-11 items-center rounded-full border border-line-strong/50 px-4 text-small text-ink transition-colors hover:border-primary hover:text-primary"
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
