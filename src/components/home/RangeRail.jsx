import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_FILTERS = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'best', label: 'Bestsellers', test: (p) => p.isBestSeller },
    { id: 'new', label: 'New', test: (p) => p.isNew },
];

/**
 * The whole range in one place: filter chips (All, Bestsellers, New, then each category that has products) above a
 * single swipeable rail. Replaces separate "trending", "featured" and one-shelf-per-category rows, which repeated the
 * same few products and left most rows nearly empty.
 */
export default function RangeRail({ products, loading }) {
    const { content } = useSiteContent();
    const { plan } = useCategoryPlan();
    const { stylesTitle, collectionTitle, viewAllLabel, productCount } = content.featured;
    const [filterId, setFilterId] = useState('all');
    const scroller = useRef(null);

    const filters = useMemo(() => {
        const base = BASE_FILTERS.filter((f) => f.id === 'all' || products.some(f.test));
        const categories = plan
            .filter((c) => products.some((p) => p.category === c.slug))
            .map((c) => ({ id: c.slug, label: c.label, test: (p) => p.category === c.slug }));
        return [...base, ...categories];
    }, [products, plan]);

    const active = filters.find((f) => f.id === filterId) ?? filters[0];
    const shown = useMemo(() => (active ? products.filter(active.test) : []), [products, active]);
    const limit = Math.max(productCount || 0, 12);
    const rail = shown.slice(0, limit);

    const select = (id) => {
        setFilterId(id);
        scroller.current?.scrollTo({ left: 0 });
    };
    const slide = (direction) => {
        const node = scroller.current;
        if (node) node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    if (!loading && products.length === 0) return null;

    return (
        <section className="section bg-canvas-alt" aria-labelledby="range-title">
            <div className="container-page">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 lg:mb-8">
                    <div>
                        <p className="eyebrow mb-3">{stylesTitle}</p>
                        <h2 id="range-title">{collectionTitle}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/shop" className="mr-2 inline-flex min-h-11 items-center gap-1.5 text-small font-medium text-primary hover:underline">
                            {viewAllLabel} <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        <button type="button" onClick={() => slide(-1)} aria-label="Scroll products left" className="hidden size-11 place-items-center rounded-full border border-line-strong bg-surface text-ink transition-colors hover:border-primary hover:text-primary lg:grid">
                            <ChevronLeft size={20} />
                        </button>
                        <button type="button" onClick={() => slide(1)} aria-label="Scroll products right" className="hidden size-11 place-items-center rounded-full border border-line-strong bg-surface text-ink transition-colors hover:border-primary hover:text-primary lg:grid">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {filters.length > 1 && (
                    <div role="group" aria-label="Filter products" className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:mb-8">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => select(f.id)}
                                aria-pressed={active?.id === f.id}
                                className={cn(
                                    'min-h-10 shrink-0 whitespace-nowrap rounded-full border px-5 text-small font-medium transition-colors',
                                    active?.id === f.id ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface text-ink hover:border-primary hover:text-primary',
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
                        {Array.from({ length: 4 }, (_, i) => <div key={i}><Skeleton className="aspect-[4/5] rounded-lg" /><Skeleton className="mt-3 h-4 w-3/4" /></div>)}
                    </div>
                ) : (
                    <ul
                        ref={scroller}
                        key={active?.id}
                        className="scrollbar-none -mx-4 flex animate-fade-in snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:gap-6 lg:scroll-pl-0 lg:px-0"
                    >
                        {rail.map((product) => (
                            <li key={product.id} className="w-[58%] shrink-0 snap-start sm:w-[34%] lg:w-[calc(25%-1.125rem)]">
                                <ProductCard product={product} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
