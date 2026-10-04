import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { jumpToShelf, useShelfSpy } from '@/utils/shelfSpy';
import { cn } from '@/utils/formatPrice';

const pill = 'relative z-10 block whitespace-nowrap rounded-full px-4 py-2 text-small font-medium transition-colors duration-200';
const pillIdle = 'text-ink hover:text-primary';
const pillActive = 'text-primary-deep';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Behaviour shared by every category link (this strip and the mobile drawer): on the homepage the link scrolls to
 * that category's shelf; anywhere else it opens the category page. Also reports whether it is "current": the shelf
 * being read on the homepage, or the category page being viewed.
 */
export function useCategoryLink(slug) {
    const { pathname } = useLocation();
    const { slugs, active } = useShelfSpy();
    const onHome = pathname === '/';
    const hasShelf = onHome && slugs.includes(slug);
    const current = hasShelf ? active === slug : pathname === `/category/${slug}`;

    const onClick = (event) => {
        if (!hasShelf || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        jumpToShelf(slug);
    };
    return { to: `/category/${slug}`, current, onClick };
}

/** The category being read on the homepage, or the category page being viewed ('' when neither). */
function useCurrentSlug() {
    const { pathname } = useLocation();
    const { slugs, active } = useShelfSpy();
    if (pathname === '/') return slugs.length > 0 ? active : '';
    return pathname.startsWith('/category/') ? decodeURIComponent(pathname.split('/')[2] ?? '') : '';
}

function CategoryLink({ category, current, itemRef }) {
    const { to, onClick } = useCategoryLink(category.slug);
    return (
        <Link
            ref={itemRef}
            to={to}
            onClick={onClick}
            aria-current={current ? 'true' : undefined}
            className={cn(pill, current ? pillActive : pillIdle)}
        >
            {category.label}
        </Link>
    );
}

/**
 * The category strip used in the header. "Shop" is pinned first; the categories sit in a row that slides sideways,
 * and as the visitor scrolls the homepage it moves on its own to keep the category being read in view while a
 * rounded highlight glides under it. Used twice: inline in the header on desktop, and as the second row of the
 * header on phones. `variant` only changes sizing.
 */
export default function CategoryNav({ variant = 'desktop' }) {
    const { content } = useSiteContent();
    const { plan } = useCategoryPlan();
    const { mode, showAll, shopLabel } = content.extras.nav;
    const { pathname } = useLocation();
    const currentSlug = useCurrentSlug();
    const phone = variant === 'phone';

    const scrollerRef = useRef(null);
    const listRef = useRef(null);
    const itemRefs = useRef({});
    const [indicator, setIndicator] = useState(null);
    const [glide, setGlide] = useState(false); // animate only after the first placement, so it doesn't fly in from the edge
    const [edges, setEdges] = useState({ left: false, right: false });

    const activeKey = plan.some((c) => c.slug === currentSlug) ? currentSlug : '';
    const shopActive = showAll && pathname.startsWith('/shop');

    const updateEdges = useCallback(() => {
        const node = scrollerRef.current;
        if (!node) return;
        setEdges({ left: node.scrollLeft > 4, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 4 });
    }, []);

    // Glide the highlight under the active category, and slide the strip so that category is in view.
    useLayoutEffect(() => {
        const list = listRef.current;
        const scroller = scrollerRef.current;
        const node = activeKey ? itemRefs.current[activeKey] : null;
        if (!list || !scroller || !node) {
            setIndicator(null);
            return undefined;
        }
        setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
        const target = node.offsetLeft - (scroller.clientWidth - node.offsetWidth) / 2;
        scroller.scrollTo({ left: Math.max(0, target), behavior: glide && !reducedMotion() ? 'smooth' : 'auto' });
        const frame = requestAnimationFrame(() => setGlide(true));
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKey, plan]);

    useEffect(() => {
        updateEdges();
        const scroller = scrollerRef.current;
        if (!scroller) return undefined;
        const observer = new ResizeObserver(updateEdges);
        observer.observe(scroller);
        document.fonts?.ready.then(updateEdges);
        return () => observer.disconnect();
    }, [updateEdges, plan]);

    if (mode === 'links') {
        if (phone) return null;
        return (
            <nav aria-label="Main navigation" className="ml-8 hidden lg:block">
                <ul className="flex items-center gap-1">
                    {(content.navLinks ?? []).map((link) => (
                        <li key={link.href}>
                            <NavLink to={link.href} end={link.href === '/'} className={({ isActive }) => cn(pill, isActive ? 'bg-primary-tint text-primary-deep' : pillIdle)}>{link.label}</NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        );
    }

    if (plan.length === 0 && !showAll) return null;

    const slide = (direction) => {
        const scroller = scrollerRef.current;
        if (scroller) scroller.scrollBy({ left: direction * scroller.clientWidth * 0.7, behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    return (
        <nav
            aria-label={phone ? 'Categories' : 'Main navigation'}
            className={cn('flex min-w-0 items-center gap-2', phone ? 'container-page py-2 lg:hidden' : 'ml-6 hidden flex-1 lg:flex')}
        >
            {showAll && (
                <NavLink
                    to="/shop"
                    className={cn(
                        'inline-flex shrink-0 items-center rounded-full bg-primary px-5 text-small font-semibold text-white transition-colors hover:bg-primary-hover',
                        phone ? 'h-9' : 'h-10',
                        shopActive && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-canvas',
                    )}
                >
                    {shopLabel}
                </NavLink>
            )}

            <div className="relative min-w-0 flex-1">
                {edges.left && !phone && (
                    <button type="button" onClick={() => slide(-1)} aria-label="Scroll categories left" className="absolute left-0 top-1/2 z-20 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface shadow-md hover:bg-canvas-alt">
                        <ChevronLeft size={16} />
                    </button>
                )}
                {edges.right && !phone && (
                    <button type="button" onClick={() => slide(1)} aria-label="Scroll categories right" className="absolute right-0 top-1/2 z-20 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface shadow-md hover:bg-canvas-alt">
                        <ChevronRight size={16} />
                    </button>
                )}
                {/* soft fade where the row continues */}
                <span aria-hidden="true" className={cn('pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-canvas to-transparent transition-opacity', edges.left ? 'opacity-100' : 'opacity-0')} />
                <span aria-hidden="true" className={cn('pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-canvas to-transparent transition-opacity', edges.right ? 'opacity-100' : 'opacity-0')} />

                <div ref={scrollerRef} onScroll={updateEdges} className="scrollbar-none overflow-x-auto overscroll-x-contain">
                    <ul ref={listRef} className="relative flex w-max items-center gap-0.5">
                        <li
                            aria-hidden="true"
                            className={cn('absolute inset-y-0 rounded-full bg-primary-tint', glide && 'transition-[left,width,opacity] duration-500 ease-out', indicator ? 'opacity-100' : 'opacity-0')}
                            style={{ left: indicator?.left ?? 0, width: indicator?.width ?? 0 }}
                        />
                        {plan.map((category) => (
                            <li key={category.slug}>
                                <CategoryLink
                                    category={category}
                                    current={activeKey === category.slug}
                                    itemRef={(node) => { itemRefs.current[category.slug] = node; }}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </nav>
    );
}
