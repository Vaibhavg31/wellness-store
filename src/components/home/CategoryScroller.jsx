import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PER_SECTION = 8;

/**
 * The whole range on one straight page, the way Oziva does it: a bar of tabs (New Launches, Bestsellers, then every category) sticks under
 * the header and follows the scroll, and each section below is a grid of products with a "View all" link. Tapping a tab glides to it.
 */
export default function CategoryScroller({ products, loading }) {
    const { plan } = useCategoryPlan();
    const [activeId, setActiveId] = useState('');
    const [barTop, setBarTop] = useState(0);
    const barRef = useRef(null);
    const chipRefs = useRef({});
    const lock = useRef(0);

    const sections = useMemo(() => {
        const launches = [...products].sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0))).slice(0, 8);
        return [
            { id: 'new-launches', label: 'New Launches', title: 'New launches', subtitle: 'Fresh from Chikit', items: launches, href: '/new-launches' },
            { id: 'bestsellers', label: 'Bestsellers', title: 'Bestsellers', subtitle: 'Most loved by our customers', items: products.filter((p) => p.isBestSeller), href: '/shop?sort=popularity' },
            ...plan.map((c) => ({ id: `cat-${c.slug}`, label: c.label, title: c.label, subtitle: c.subtitle || '', items: products.filter((p) => p.category === c.slug), href: `/category/${c.slug}` })),
        ].filter((s) => s.items.length > 0);
    }, [products, plan]);

    // The sticky bar sits under the header, which is itself sticky: read its height so the two stack without a gap.
    useEffect(() => {
        const read = () => setBarTop(document.querySelector('header')?.getBoundingClientRect().height ?? 0);
        read();
        window.addEventListener('resize', read);
        return () => window.removeEventListener('resize', read);
    }, [sections.length]);

    useEffect(() => {
        if (sections.length === 0) return undefined;
        let frame = 0;
        const update = () => {
            frame = 0;
            if (Date.now() < lock.current) return;
            const line = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 120;
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

    useEffect(() => {
        const chip = chipRefs.current[activeId];
        const bar = barRef.current?.querySelector('[data-chip-row]');
        if (!chip || !bar) return;
        bar.scrollTo({ left: Math.max(0, chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, [activeId]);

    const goTo = useCallback((id) => {
        const node = document.getElementById(`range-${id}`);
        if (!node) return;
        setActiveId(id);
        lock.current = Date.now() + 900;
        node.style.scrollMarginTop = `${Math.round((barRef.current?.getBoundingClientRect().height ?? 56) + (document.querySelector('header')?.offsetHeight ?? 0) + 12)}px`;
        node.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }, []);

    if (!loading && products.length === 0) return null;

    return (
        <section aria-label="Shop the range" className="relative bg-canvas">
            <div ref={barRef} style={{ top: barTop }} className="sticky z-30 border-y border-line bg-canvas/95 backdrop-blur">
                <div className="container-page">
                    <div data-chip-row role="tablist" aria-label="Jump to a category" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2.5 pr-10 scrollbar-none [mask-image:linear-gradient(to_right,#000_92%,transparent)] sm:mx-0 sm:px-0">
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
                                    className={cn('min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-small font-bold transition-colors', active ? 'bg-primary text-white shadow-sm' : 'bg-accent-tint text-primary-deep ring-1 ring-line hover:bg-accent')}
                                >
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
                        {Array.from({ length: 4 }, (_, i) => <div key={i}><Skeleton className="aspect-[4/5] rounded-[1.25rem]" /><Skeleton className="mt-3 h-4 w-3/4" /></div>)}
                    </div>
                )}
                {sections.map((s) => (
                    <section key={s.id} id={`range-${s.id}`} aria-labelledby={`range-title-${s.id}`} className="py-9 lg:py-12">
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <div>
                                <h2 id={`range-title-${s.id}`} className="text-h3">{s.title}</h2>
                                {s.subtitle && <p className="mt-1 text-small text-muted">{s.subtitle}</p>}
                            </div>
                            <Link to={s.href} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-small font-bold text-primary hover:underline">View all <ArrowRight size={16} aria-hidden="true" /></Link>
                        </div>
                        <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
                            {s.items.slice(0, PER_SECTION).map((product, i) => <li key={product.id} className="min-w-0"><ProductCard product={product} priority={i < 2 && s.id === 'new-launches'} /></li>)}
                        </ul>
                    </section>
                ))}
            </div>
        </section>
    );
}
