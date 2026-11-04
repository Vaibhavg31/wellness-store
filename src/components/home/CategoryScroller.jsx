import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Sparkles } from 'lucide-react';
import CategoryRail, { Thumb } from '@/components/shop/CategoryRail';
import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One row of products that can be swiped (phone) or paged with the arrows (desktop). */
function ProductRail({ products, label }) {
    const scroller = useRef(null);
    // Up to four products fit one tidy grid (two across on a phone); more than that becomes a swipe row.
    if (products.length <= 4) {
        return (
            <ul aria-label={label} className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-6">
                {products.map((product) => <li key={product.id} className={cn('min-w-0', products.length === 1 && 'max-sm:col-span-2')}><ProductCard product={product} wide={products.length === 1} /></li>)}
            </ul>
        );
    }
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

    const goTo = useCallback((id) => {
        const node = document.getElementById(`range-${id}`);
        if (!node) return;
        setActiveId(id);
        clickLock.current = Date.now() + 900; // do not let the scroll-spy fight the glide
        // Going down, the menu steps away and only this bar remains; going up, the menu comes back above it. Leave room for what will be there.
        const bar = barRef.current?.getBoundingClientRect().height ?? 48;
        const menu = document.querySelector('header')?.offsetHeight ?? 0;
        const goingUp = node.getBoundingClientRect().top < 0;
        node.style.scrollMarginTop = `${Math.round(bar + 16 + (goingUp ? menu : 0))}px`;
        node.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }, []);

    if (!loading && products.length === 0) return null;

    return (
        <section aria-label="Shop the range" className="relative">
            <div
                ref={barRef}
                style={{ top: barTop }}
                className="sticky z-30 border-b border-line bg-canvas/95 shadow-xs backdrop-blur transition-[top] duration-300 ease-[var(--ease-out-soft)]"
            >
                <div className="container-page">
                    <CategoryRail variant="pill" label="Jump to a category" items={sections} activeId={activeId} onSelect={goTo} loading={loading} />
                </div>
            </div>

            <div className="container-page">
                {loading && sections.length === 0 && (
                    <div className="grid grid-cols-2 gap-4 py-10 lg:grid-cols-4" aria-hidden="true">
                        {Array.from({ length: 4 }, (_, i) => <div key={i}><Skeleton className="aspect-[4/5] rounded-lg" /><Skeleton className="mt-3 h-4 w-3/4" /></div>)}
                    </div>
                )}
                {sections.map((s) => (
                    <section key={s.id} id={`range-${s.id}`} aria-labelledby={`range-title-${s.id}`} style={{ scrollMarginTop: 64 }} className="py-6 lg:py-9">
                        <div className="mb-5 flex items-end justify-between gap-4 lg:mb-7">
                            <div className="flex min-w-0 items-center gap-3 lg:gap-4">
                                <Thumb item={s} size={56} className="size-12 ring-2 ring-line ring-offset-2 ring-offset-canvas lg:size-14" />
                                <div className="min-w-0">
                                    <h2 id={`range-title-${s.id}`} className="text-h3">{s.title}</h2>
                                    {s.subtitle && <p className="mt-1 text-small text-muted">{s.subtitle}</p>}
                                </div>
                            </div>
                            <Link to={s.href} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-small font-medium text-primary hover:underline">
                                View all <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        <ProductRail products={s.items} label={s.title} />
                    </section>
                ))}
            </div>
        </section>
    );
}
