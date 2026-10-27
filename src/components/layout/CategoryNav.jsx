import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { cn } from '@/utils/formatPrice';

const pill = 'relative z-10 block whitespace-nowrap rounded-full px-4 py-2 text-small font-medium transition-colors duration-200';
const pillIdle = 'text-ink hover:text-primary';
const pillActive = 'text-primary-deep';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How many categories sit in the desktop bar; the rest go under "More" so the bar never overflows. */
const DESKTOP_VISIBLE = 4;

/** The rest of the categories, in a small menu. Sits outside the sliding row so the panel is not clipped. */
function MoreMenu({ categories, current }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const { pathname } = useLocation();

    useEffect(() => setOpen(false), [pathname]);
    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const active = categories.some((c) => c.slug === current);
    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="true"
                className={cn(pill, 'inline-flex items-center gap-1', active || open ? 'bg-primary-tint text-primary-deep' : pillIdle)}
            >
                More <ChevronDown size={16} className={cn('transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && (
                <ul className="absolute left-0 top-full z-30 mt-2 w-60 animate-fade-in rounded-lg bg-surface p-2 shadow-lg ring-1 ring-line">
                    {categories.map((category) => (
                        <li key={category.slug}>
                            <Link
                                to={`/category/${category.slug}`}
                                aria-current={current === category.slug ? 'true' : undefined}
                                className={cn('block rounded-md px-3 py-2.5 text-small font-medium transition-colors', current === category.slug ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft hover:text-primary')}
                            >
                                {category.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Shared by every category link (this strip and the mobile drawer): where it goes and whether it is the page being viewed. */
export function useCategoryLink(slug) {
    const { pathname } = useLocation();
    return { to: `/category/${slug}`, current: pathname === `/category/${slug}` };
}

/** The category page being viewed ('' when none). */
function useCurrentSlug() {
    const { pathname } = useLocation();
    return pathname.startsWith('/category/') ? decodeURIComponent(pathname.split('/')[2] ?? '') : '';
}

function CategoryLink({ category, current, itemRef }) {
    const { to } = useCategoryLink(category.slug);
    return (
        <Link
            ref={itemRef}
            to={to}
            aria-current={current ? 'true' : undefined}
            className={cn(pill, current ? pillActive : pillIdle)}
        >
            {category.label}
        </Link>
    );
}

/**
 * The category strip used in the header. "Shop" is pinned first; the categories sit in a row that slides sideways,
 * and a rounded highlight glides under the category page being viewed. Used twice: inline in the header on desktop, and as the second row of the
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

    const listed = phone ? plan : plan.slice(0, DESKTOP_VISIBLE);
    const overflow = phone ? [] : plan.slice(DESKTOP_VISIBLE);
    const activeKey = listed.some((c) => c.slug === currentSlug) ? currentSlug : '';
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

            <div className={cn('relative min-w-0', phone && 'flex-1')}>
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
                        {listed.map((category) => (
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

            {overflow.length > 0 && <MoreMenu categories={overflow} current={currentSlug} />}
        </nav>
    );
}
