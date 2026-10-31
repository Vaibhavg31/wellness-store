import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Sparkles } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import { imageUrl } from '@/services/api';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One row of products that can be swiped (phone) or paged with the arrows (desktop). */
function ProductRail({ products, label }) {
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
                    <li key={product.id} className="w-[58%] shrink-0 snap-start sm:w-[34%] lg:w-[calc(25%-1.125rem)]">
                        <ProductCard product={product} />
                    </li>
                ))}
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
 * A category with only a few products: a picture tile of the category beside them (on a wide screen) so the row
 * reads as a deliberate section instead of one lonely card, and a plain two-up grid on a phone.
 */
function FewProducts({ section }) {
    const tile = section.image && section.href.startsWith('/category/');
    return (
        <div className="lg:grid lg:grid-cols-4 lg:gap-6">
            {tile && (
                <Link to={section.href} className="group relative mb-4 hidden aspect-[4/5] overflow-hidden rounded-lg bg-canvas-alt lg:mb-0 lg:block">
                    <img src={imageUrl(section.image, 600)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/70 to-transparent p-4 text-white">
                        <span className="font-display text-h4">Explore {section.title}</span>
                        <ArrowRight size={18} aria-hidden="true" />
                    </span>
                </Link>
            )}
            <ul aria-label={section.title} className={cn('grid grid-cols-2 gap-4 lg:gap-6', tile ? 'lg:col-span-3 lg:grid-cols-3' : 'lg:grid-cols-4')}>
                {section.items.map((product) => <li key={product.id}><ProductCard product={product} /></li>)}
            </ul>
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
            { id: 'new-launches', label: 'New Launches', icon: Sparkles, title: 'New Launches', subtitle: 'Fresh from Chikit', items: launches, href: '/new-launches' },
            { id: 'bestsellers', label: 'Bestsellers', icon: Flame, title: 'Bestsellers', subtitle: 'Most loved by our customers', items: best, href: '/shop?sort=popularity' },
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
            const line = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
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
                className="sticky z-30 border-y border-line bg-canvas/95 backdrop-blur transition-[top] duration-300 ease-[var(--ease-out-soft)]"
            >
                <div className="container-page">
                    <div data-chip-row role="tablist" aria-label="Jump to a category" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none sm:mx-0 sm:px-0">
                        {sections.map((s) => {
                            const Icon = s.icon;
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
                                        'inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-small font-medium transition-colors',
                                        active ? 'border-primary bg-primary-tint text-primary-deep shadow-xs' : 'border-line-strong bg-surface text-ink hover:border-primary hover:text-primary',
                                    )}
                                >
                                    {Icon && <Icon size={15} className={active ? 'text-primary' : 'text-accent-ink'} aria-hidden="true" />}
                                    {s.label}
                                </button>
                            );
                        })}
                        {loading && sections.length === 0 && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />)}
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
                    <section key={s.id} id={`range-${s.id}`} aria-labelledby={`range-title-${s.id}`} style={{ scrollMarginTop: barTop + 64 }} className="py-8 lg:py-12">
                        <div className="mb-5 flex items-end justify-between gap-4 lg:mb-7">
                            <div>
                                <h2 id={`range-title-${s.id}`} className="text-h3">{s.title}</h2>
                                {s.subtitle && <p className="mt-1 text-small text-muted">{s.subtitle}</p>}
                            </div>
                            <Link to={s.href} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-small font-medium text-primary hover:underline">
                                View all <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        {s.items.length > 3 ? <ProductRail products={s.items} label={s.title} /> : <FewProducts section={s} />}
                    </section>
                ))}
            </div>
        </section>
    );
}
