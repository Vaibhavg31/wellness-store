import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useProducts } from '@/hooks/useApi';
import { suggestKeywords } from '@/utils/trending';

/** "Trending now": quick searches for what shoppers look for. The admin's own words, or ones built from the catalogue. */
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
                <h2 id="trending-title" className="flex shrink-0 items-center gap-2.5 font-sans text-caption font-bold uppercase tracking-[0.16em] text-primary-deep">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-accent"><TrendingUp size={16} aria-hidden="true" /></span>
                    {title}
                </h2>
                <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 scrollbar-none [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-24px),transparent)] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
                    {chips.map((chip) => (
                        <li key={chip.query} className="shrink-0">
                            <Link to={`/shop?search=${encodeURIComponent(chip.query)}`} className="inline-flex min-h-11 items-center rounded-full bg-accent-tint px-4 text-small font-semibold capitalize text-primary-deep ring-1 ring-line transition-colors hover:bg-primary hover:text-white hover:ring-primary sm:min-h-10">{chip.label}</Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
