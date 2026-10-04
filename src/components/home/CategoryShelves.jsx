import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategories } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const shelfId = (slug) => `shelf-${slug}`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Which shelf is currently under the sticky bar, so its chip can be highlighted. */
function useActiveShelf(slugs) {
    const [active, setActive] = useState(slugs[0] ?? '');
    const key = slugs.join('|');

    useEffect(() => {
        if (slugs.length === 0 || !('IntersectionObserver' in window)) return undefined;
        const visible = new Map();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => visible.set(entry.target.dataset.slug, entry.isIntersecting ? entry.boundingClientRect.top : null));
                // The first (top-most) shelf that is inside the reading band wins.
                const inBand = [...visible.entries()].filter(([, top]) => top !== null).sort((a, b) => a[1] - b[1]);
                if (inBand.length) setActive(inBand[0][0]);
            },
            { rootMargin: '-30% 0px -60% 0px' },
        );
        slugs.forEach((slug) => {
            const node = document.getElementById(shelfId(slug));
            if (node) observer.observe(node);
        });
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return [active, setActive];
}

function Shelf({ shelf }) {
    const scroller = useRef(null);
    const { category, subtitle, products } = shelf;

    const scrollBy = (direction) => {
        const node = scroller.current;
        if (node) node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    return (
        <section id={shelfId(category.slug)} data-slug={category.slug} aria-labelledby={`${shelfId(category.slug)}-title`} className="scroll-mt-36 py-8 first:pt-4 lg:scroll-mt-44 lg:py-10">
            <div className="container-page">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <h2 id={`${shelfId(category.slug)}-title`} className="text-h3">{category.label}</h2>
                        <p className="mt-1 text-small text-muted">{subtitle || `${products.length} ${products.length === 1 ? 'product' : 'products'} to explore`}</p>
                    </div>
                    <Link to={`/category/${category.slug}`} className="inline-flex shrink-0 items-center gap-1 text-small font-medium text-primary hover:underline">
                        View all <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </div>

                <div className="group/shelf relative">
                    <ul ref={scroller} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:scroll-pl-0 lg:px-0">
                        {products.map((product) => (
                            <li key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[calc(25%-0.75rem)]">
                                <ProductCard product={product} />
                            </li>
                        ))}
                        <li className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[calc(25%-0.75rem)]">
                            <Link to={`/category/${category.slug}`} className="grid aspect-[4/5] place-items-center rounded-lg border border-dashed border-line-strong bg-canvas-alt text-center transition-colors hover:border-primary hover:bg-primary-soft">
                                <span className="px-4">
                                    <span className="mx-auto mb-2 grid size-11 place-items-center rounded-full bg-surface text-primary shadow-xs"><ArrowRight size={18} aria-hidden="true" /></span>
                                    <span className="block text-small font-medium text-ink">See all {category.label}</span>
                                </span>
                            </Link>
                        </li>
                    </ul>
                    <button type="button" onClick={() => scrollBy(-1)} aria-label={`Scroll ${category.label} left`} className="absolute -left-4 top-[38%] hidden size-10 place-items-center rounded-full bg-surface shadow-md transition-opacity hover:bg-canvas-alt lg:grid lg:opacity-0 lg:group-hover/shelf:opacity-100 focus-visible:opacity-100">
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" onClick={() => scrollBy(1)} aria-label={`Scroll ${category.label} right`} className="absolute -right-4 top-[38%] hidden size-10 place-items-center rounded-full bg-surface shadow-md transition-opacity hover:bg-canvas-alt lg:grid lg:opacity-0 lg:group-hover/shelf:opacity-100 focus-visible:opacity-100">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </section>
    );
}

/**
 * Products grouped by category, front and centre on the homepage: a sticky bar of category chips (tap to jump to
 * that shelf; the chip for the shelf on screen is highlighted) over one swipeable shelf per category.
 * Which categories show, their order and each shelf's subtitle come from the admin (Content → Homepage); with
 * nothing configured, every category that has products is shown.
 */
export default function CategoryShelves({ products, loading }) {
    const { content } = useSiteContent();
    const { categories } = useCategories();
    const { mode, limit, items } = content.extras.shelves;
    const chipBar = useRef(null);

    const shelves = useMemo(() => {
        const plan = mode === 'custom' && items.length > 0
            ? items.map((item) => ({ slug: item.categorySlug, subtitle: item.subtitle }))
            : categories.map((c) => ({ slug: c.slug, subtitle: '' }));
        return plan
            .map(({ slug, subtitle }) => {
                const category = categories.find((c) => c.slug === slug);
                const inCategory = products.filter((p) => p.category === slug);
                return category && inCategory.length > 0 ? { category, subtitle, products: inCategory.slice(0, limit) } : null;
            })
            .filter(Boolean);
    }, [categories, products, mode, items, limit]);

    const slugs = shelves.map((s) => s.category.slug);
    const [active, setActive] = useActiveShelf(slugs);

    // Keep the active chip visible inside the horizontally scrolling bar without moving the page.
    useEffect(() => {
        const bar = chipBar.current;
        const chip = bar?.querySelector(`[data-chip="${active}"]`);
        if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, [active]);

    if (loading) {
        return (
            <section className="container-page py-10" aria-hidden="true">
                <Skeleton className="mb-6 h-10 w-2/3" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-lg" />)}</div>
            </section>
        );
    }
    if (shelves.length === 0) return null;

    const jump = (slug) => {
        setActive(slug);
        document.getElementById(shelfId(slug))?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };

    return (
        <div className="bg-canvas">
            <nav aria-label="Shop by category" className="sticky top-[65px] z-30 border-b border-line bg-canvas/95 backdrop-blur lg:top-[81px]">
                <div className="container-page">
                    <ul ref={chipBar} className="scrollbar-none flex gap-2 overflow-x-auto py-3">
                        {shelves.map(({ category }) => {
                            const selected = category.slug === active;
                            return (
                                <li key={category.slug} className="shrink-0">
                                    <button
                                        type="button"
                                        data-chip={category.slug}
                                        onClick={() => jump(category.slug)}
                                        aria-current={selected ? 'true' : undefined}
                                        className={cn(
                                            'inline-flex h-11 items-center gap-2 rounded-full border pr-4 text-small font-medium transition-colors',
                                            category.image ? 'pl-1.5' : 'pl-4',
                                            selected ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface text-ink hover:border-primary hover:text-primary',
                                        )}
                                    >
                                        {category.image && <img src={imageUrl(category.image, 80)} alt="" width="32" height="32" loading="lazy" className="size-8 rounded-full bg-canvas-alt object-cover" />}
                                        {category.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>
            {shelves.map((shelf) => <Shelf key={shelf.category.slug} shelf={shelf} />)}
        </div>
    );
}
