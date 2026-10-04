import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { imageUrl } from '@/services/api';
import { jumpToShelf, shelfId, shelfSpy, useShelfSpy } from '@/utils/shelfSpy';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Watches which shelf is in the reading band of the screen and publishes it, so the header's category bar (and the
 * phone chip bar) highlight it. Scrolling above the first shelf clears the highlight. Ignored briefly after a click
 * so the highlight goes straight to the chosen category instead of flickering through the ones in between.
 */
function useShelfScrollSpy(slugs) {
    const key = slugs.join('|');

    useEffect(() => {
        if (slugs.length === 0 || !('IntersectionObserver' in window)) return undefined;
        shelfSpy.set({ slugs });
        const inBand = new Set();

        const refresh = () => {
            if (Date.now() < shelfSpy.get().lockUntil) return;
            const ordered = slugs.filter((slug) => inBand.has(slug));
            if (ordered.length > 0) {
                shelfSpy.set({ active: ordered[0] });
                return;
            }
            const first = document.getElementById(shelfId(slugs[0]));
            if (first && first.getBoundingClientRect().top > window.innerHeight * 0.5) shelfSpy.set({ active: '' });
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => (entry.isIntersecting ? inBand.add(entry.target.dataset.slug) : inBand.delete(entry.target.dataset.slug)));
                refresh();
            },
            { rootMargin: '-25% 0px -65% 0px' },
        );
        slugs.forEach((slug) => {
            const node = document.getElementById(shelfId(slug));
            if (node) observer.observe(node);
        });
        // When a click-lock ends, settle on whatever is actually in view.
        const settle = () => refresh();
        window.addEventListener('scrollend', settle);

        return () => {
            observer.disconnect();
            window.removeEventListener('scrollend', settle);
            shelfSpy.reset();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
}

function Shelf({ shelf }) {
    const scroller = useRef(null);
    const { category, subtitle, products } = shelf;

    const scrollBy = (direction) => {
        const node = scroller.current;
        if (node) node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    return (
        <section id={shelfId(category.slug)} data-slug={category.slug} aria-labelledby={`${shelfId(category.slug)}-title`} className="scroll-mt-36 py-8 first:pt-4 lg:scroll-mt-28 lg:py-10">
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
                    <button type="button" onClick={() => scrollBy(-1)} aria-label={`Scroll ${category.label} left`} className="absolute -left-4 top-[38%] hidden size-10 place-items-center rounded-full bg-surface shadow-md transition-opacity hover:bg-canvas-alt focus-visible:opacity-100 lg:grid lg:opacity-0 lg:group-hover/shelf:opacity-100">
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" onClick={() => scrollBy(1)} aria-label={`Scroll ${category.label} right`} className="absolute -right-4 top-[38%] hidden size-10 place-items-center rounded-full bg-surface shadow-md transition-opacity hover:bg-canvas-alt focus-visible:opacity-100 lg:grid lg:opacity-0 lg:group-hover/shelf:opacity-100">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </section>
    );
}

/**
 * Products grouped by category, front and centre on the homepage: one swipeable shelf per category, in the order set
 * in the admin. A category with no products is never shown (the categories API leaves it out). The header's category
 * bar highlights the shelf being read; on phones, where that bar is in the menu, a sticky chip bar does the same job.
 */
export default function CategoryShelves({ products, loading }) {
    const { content } = useSiteContent();
    const { plan } = useCategoryPlan();
    const { limit } = content.extras.shelves;
    const chipBar = useRef(null);
    const { active } = useShelfSpy();

    const shelves = useMemo(() => plan
        .map((item) => {
            const inCategory = products.filter((p) => p.category === item.slug);
            return inCategory.length > 0 ? { category: item, subtitle: item.subtitle, products: inCategory.slice(0, limit) } : null;
        })
        .filter(Boolean), [plan, products, limit]);

    useShelfScrollSpy(shelves.map((s) => s.category.slug));

    // Keep the active chip visible inside the horizontally scrolling phone bar without moving the page.
    useEffect(() => {
        const bar = chipBar.current;
        const chip = active ? bar?.querySelector(`[data-chip="${active}"]`) : null;
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

    return (
        <div className="bg-canvas">
            <nav aria-label="Shop by category" className="sticky top-[65px] z-30 border-b border-line bg-canvas/95 backdrop-blur lg:hidden">
                <div className="container-page">
                    <ul ref={chipBar} className="scrollbar-none flex gap-2 overflow-x-auto py-3">
                        {shelves.map(({ category }) => {
                            const selected = category.slug === active;
                            return (
                                <li key={category.slug} className="shrink-0">
                                    <button
                                        type="button"
                                        data-chip={category.slug}
                                        onClick={() => jumpToShelf(category.slug)}
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
