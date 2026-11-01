import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One row of products that can be swiped (phone) or paged with the arrows (desktop). */
function ProductRail({ products, label, href }) {
    const scroller = useRef(null);
    const slide = (direction) => {
        const node = scroller.current;
        if (node) node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: reducedMotion() ? 'auto' : 'smooth' });
    };
    return (
        <div className="group/rail relative">
            <ul
                ref={scroller}
                aria-label={label}
                className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:gap-6 lg:scroll-pl-0 lg:px-0"
            >
                {products.map((product) => (
                    <li key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc(25%-1.125rem)]">
                        <ProductCard product={product} />
                    </li>
                ))}
                {products.length < 4 && (
                    // A short row would end in blank space: the rest of it says more is coming and leads on to the whole range.
                    <li className="flex min-w-[46%] flex-1 snap-start sm:min-w-[31%] lg:min-w-0">
                        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong/50 bg-canvas-alt/60 p-4 text-center sm:p-6">
                            <p className="font-display text-lead text-primary-deep sm:text-h4">More {label} on the way</p>
                            <p className="hidden max-w-xs text-small text-muted sm:block">We are adding new formulations here. Meanwhile, explore everything Chikit makes.</p>
                            <Link to={href} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-small font-semibold text-primary hover:underline">Browse all <ArrowRight size={16} aria-hidden="true" /></Link>
                        </div>
                    </li>
                )}
            </ul>
            {products.length > 4 && (
                <>
                    <button type="button" onClick={() => slide(-1)} aria-label="Scroll products left" className="absolute -left-5 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md transition-colors hover:border-primary hover:text-primary lg:grid">
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" onClick={() => slide(1)} aria-label="Scroll products right" className="absolute -right-5 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md transition-colors hover:border-primary hover:text-primary lg:grid">
                        <ChevronRight size={20} />
                    </button>
                </>
            )}
        </div>
    );
}

/**
 * The whole range on one straight page. A bar of buttons (New Launches, Bestsellers, then each category) sticks under
 * the header; the page below is one section per button, so scrolling is all it takes to see every category, and the
 * bar highlights the section on screen. Tapping a button glides to its section.
 */
export default function CategoryScroller({ products, loading }) {
    const { plan } = useCategoryPlan();
    const [activeId, setActiveId] = useState('');
    const [barTop, setBarTop] = useState(0);
    const barRef = useRef(null);
    const chipRefs = useRef({});
    const clickLock = useRef(0);

    const sections = useMemo(() => {
        const launches = [...products].sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0))).slice(0, 12);
        const best = products.filter((p) => p.isBestSeller);
        return [
            { id: 'new-launches', label: 'New Launches', title: 'New Launches', subtitle: 'Fresh from Chikit', items: launches, href: '/new-launches' },
            { id: 'bestsellers', label: 'Bestsellers', title: 'Bestsellers', subtitle: 'Most loved by our customers', items: best, href: '/shop?sort=popularity' },
            ...plan.map((c) => ({
                id: `cat-${c.slug}`, label: c.label, title: c.label, subtitle: c.subtitle || '', image: c.image, items: products.filter((p) => p.category === c.slug), href: `/category/${c.slug}`,
            })),
        ].filter((s) => s.items.length > 0);
    }, [products, plan]);

    // The sticky bar sits under the header; the header's visible height changes on phones (its strip slides away on the way down).
    useEffect(() => {
        const read = () => {
            const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')) || 0;
            setBarTop(offset);
        };
        read();
        const observer = new MutationObserver(read);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
        return () => observer.disconnect();
    }, []);

    // Which section is on screen: the last one whose top has passed just under the bar.
    useEffect(() => {
        if (sections.length === 0) return undefined;
        let frame = 0;
        const update = () => {
            frame = 0;
            if (Date.now() < clickLock.current) return;
            // A little below the bar, so a section that has just been scrolled to counts even while the phone header is still tucking away.
            const line = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 100;
            let current = '';
            for (const s of sections) {
                const node = document.getElementById(`range-${s.id}`);
                if (node && node.getBoundingClientRect().top <= line) current = s.id;
            }
            setActiveId(current);
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
    }, [sections]);

    // Keep the highlighted button in view inside the bar.
    useEffect(() => {
        const chip = chipRefs.current[activeId];
        const bar = barRef.current?.querySelector('[data-chip-row]');
        if (!chip || !bar) return;
        const target = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
        bar.scrollTo({ left: Math.max(0, target), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, [activeId]);

    const goTo = useCallback((id) => {
        const node = document.getElementById(`range-${id}`);
        if (!node) return;
        setActiveId(id);
        clickLock.current = Date.now() + 900; // do not let the scroll-spy fight the glide
        node.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }, []);

    if (!loading && products.length === 0) return null;

    return (
        <section aria-label="Shop the range" className="relative">
            <div
                ref={barRef}
                style={{ top: barTop }}
                className="sticky z-30 border-b border-line bg-canvas/95 backdrop-blur transition-[top] duration-300 ease-[var(--ease-out-soft)]"
            >
                <div className="container-page">
                    <div data-chip-row role="tablist" aria-label="Jump to a category" className="-mx-4 flex gap-6 overflow-x-auto px-4 pr-10 scrollbar-none [mask-image:linear-gradient(to_right,#000_92%,transparent)] sm:mx-0 sm:gap-8 sm:px-0">
                        {sections.map((s) => {
                            const active = activeId === s.id;
                            return (
                                <button
                                    key={s.id}
                                    ref={(node) => { chipRefs.current[s.id] = node; }}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => goTo(s.id)}
                                    className={cn(
                                        // Text tabs with a plum underline under the section on screen, like the brand book's own menu.
                                        'relative min-h-12 shrink-0 whitespace-nowrap text-small font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
                                        active ? 'text-primary after:bg-primary' : 'text-muted after:bg-transparent hover:text-ink',
                                    )}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                        {loading && sections.length === 0 && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="my-3.5 h-5 w-24 shrink-0 rounded" />)}
                    </div>
                </div>
            </div>

            <div className="container-page">
                {loading && sections.length === 0 && (
                    <div className="grid grid-cols-2 gap-4 py-10 lg:grid-cols-4" aria-hidden="true">
                        {Array.from({ length: 4 }, (_, i) => <div key={i}><Skeleton className="aspect-[4/5] rounded-lg" /><Skeleton className="mt-3 h-4 w-3/4" /></div>)}
                    </div>
                )}
                {sections.map((s) => (
                    <section key={s.id} id={`range-${s.id}`} aria-labelledby={`range-title-${s.id}`} style={{ scrollMarginTop: barTop + 64 }} className="py-6 lg:py-9">
                        <div className="mb-5 flex items-end justify-between gap-4 lg:mb-7">
                            <div>
                                <h2 id={`range-title-${s.id}`} className="text-h3">{s.title}</h2>
                                <p className="mt-1 text-small text-muted">{s.subtitle || `${s.items.length} ${s.items.length === 1 ? 'product' : 'products'}`}</p>
                            </div>
                            <Link to={s.href} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-small font-medium text-primary hover:underline">
                                View all <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        <ProductRail products={s.items} label={s.title} href="/shop" />
                    </section>
                ))}
            </div>
        </section>
    );
}
