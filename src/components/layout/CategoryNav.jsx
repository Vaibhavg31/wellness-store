import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { jumpToShelf, useShelfSpy } from '@/utils/shelfSpy';
import { cn } from '@/utils/formatPrice';

const pill = 'relative z-10 block whitespace-nowrap rounded-full px-4 py-2 text-small font-medium transition-colors duration-200';
const pillIdle = 'text-ink hover:text-primary';
const pillActive = 'text-primary-deep';
const GAP = 2; // px between pills (gap-0.5)

/**
 * Behaviour shared by every category link (desktop bar, "More" menu, mobile drawer): on the homepage the link
 * scrolls to that category's shelf; anywhere else it opens the category page. Also reports whether it is "current":
 * the shelf being read on the homepage, or the category page being viewed.
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

/** Same rule as useCategoryLink, for the bar as a whole (so it can slide one highlight between its items). */
function useCurrentSlug() {
    const { pathname } = useLocation();
    const { slugs, active } = useShelfSpy();
    if (pathname === '/') return slugs.length > 0 ? active : '';
    return pathname.startsWith('/category/') ? decodeURIComponent(pathname.split('/')[2] ?? '') : '';
}

function CategoryLink({ category, current, onNavigate, className, itemRef }) {
    const { to, onClick } = useCategoryLink(category.slug);
    return (
        <Link
            ref={itemRef}
            to={to}
            onClick={(event) => { onClick(event); onNavigate?.(); }}
            aria-current={current ? 'true' : undefined}
            className={cn(className ?? pill, current ? pillActive : pillIdle)}
        >
            {category.label}
        </Link>
    );
}

function MoreMenu({ categories, currentSlug, buttonRef, active }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const { pathname } = useLocation();

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => setOpen(false), [pathname]);

    return (
        <div ref={ref} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="true"
                aria-current={active ? 'true' : undefined}
                className={cn(pill, 'inline-flex items-center gap-1', active ? pillActive : pillIdle)}
            >
                More <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && (
                <ul className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] min-w-52 animate-fade-in overflow-y-auto rounded-lg border border-line bg-surface p-1.5 shadow-md">
                    {categories.map((category) => (
                        <li key={category.slug}>
                            <CategoryLink
                                category={category}
                                current={currentSlug === category.slug}
                                className="block rounded-md px-3 py-2 text-small font-medium transition-colors"
                                onNavigate={() => setOpen(false)}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Decides how many items fit. All items are laid out once in an invisible row to measure their real widths (names
 * differ a lot, and the browser may be zoomed), then the largest prefix that fits next to a "More" button is shown.
 * Re-measured whenever the bar resizes or the web fonts finish loading. `cap` is the admin's upper limit.
 */
function useFit(containerRef, measureRef, itemCount, cap) {
    const [fit, setFit] = useState(itemCount);

    const measure = useCallback(() => {
        const container = containerRef.current;
        const row = measureRef.current;
        if (!container || !row) return;
        const kids = [...row.children];
        const moreWidth = kids.at(-1)?.offsetWidth ?? 0;
        const widths = kids.slice(0, -1).map((k) => k.offsetWidth + GAP);
        const available = container.clientWidth;
        const total = widths.reduce((a, b) => a + b, 0);
        let count = 0;
        let used = 0;
        if (total <= available) {
            count = widths.length;
        } else {
            for (const w of widths) {
                if (used + w + moreWidth > available) break;
                used += w;
                count += 1;
            }
        }
        setFit(Math.max(1, Math.min(count, cap)));
    }, [containerRef, measureRef, cap]);

    useLayoutEffect(() => {
        measure();
        const container = containerRef.current;
        if (!container) return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        document.fonts?.ready.then(measure);
        return () => observer.disconnect();
    }, [measure, containerRef, itemCount]);

    return fit;
}

/**
 * The header's main navigation. By default it is the shop's categories (product-first): "All products" then each
 * category, whatever doesn't fit under "More". On the homepage a single rounded highlight glides along the bar to
 * the category being read as the visitor scrolls; elsewhere it marks the current category page. The admin can
 * switch it to a custom link list (Content → Homepage → Top navigation bar).
 */
export default function CategoryNav() {
    const { content } = useSiteContent();
    const { plan } = useCategoryPlan();
    const { mode, showAll, maxVisible } = content.extras.nav;
    const { pathname } = useLocation();
    const currentSlug = useCurrentSlug();

    const navRef = useRef(null);
    const measureRef = useRef(null);
    const listRef = useRef(null);
    const itemRefs = useRef({});
    const [indicator, setIndicator] = useState(null);
    const [glide, setGlide] = useState(false); // animate only after the first placement, so it doesn't fly in from the left edge

    const items = [...(showAll ? [{ key: '__all', label: 'All products' }] : []), ...plan.map((c) => ({ key: c.slug, label: c.label, category: c }))];
    const cap = maxVisible + (showAll ? 1 : 0);
    const fit = useFit(navRef, measureRef, items.length, cap);
    const shown = items.slice(0, fit);
    const more = items.slice(fit).map((i) => i.category);

    const allActive = showAll && pathname.startsWith('/shop');
    const activeKey = allActive ? '__all' : (shown.some((i) => i.key === currentSlug) ? currentSlug : (more.some((c) => c.slug === currentSlug) ? '__more' : ''));

    // Slide the highlight under the active item.
    useLayoutEffect(() => {
        const list = listRef.current;
        const node = activeKey ? itemRefs.current[activeKey] : null;
        if (!list || !node) {
            setIndicator(null);
            return undefined;
        }
        const listBox = list.getBoundingClientRect();
        const box = node.getBoundingClientRect();
        setIndicator({ left: box.left - listBox.left, width: box.width });
        const frame = requestAnimationFrame(() => setGlide(true));
        return () => cancelAnimationFrame(frame);
    }, [activeKey, fit, plan, showAll, mode]);

    if (mode === 'links') {
        return (
            <nav aria-label="Main navigation" className="ml-8 hidden lg:block">
                <ul className="flex items-center gap-1">
                    {(content.navLinks ?? []).map((link) => (
                        <li key={link.href}>
                            <NavLink to={link.href} end={link.href === '/'} className={({ isActive }) => cn(pill, 'bg-transparent', isActive ? 'bg-primary-tint text-primary-deep' : pillIdle)}>{link.label}</NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        );
    }

    const setRef = (key) => (node) => { itemRefs.current[key] = node; };

    return (
        <nav ref={navRef} aria-label="Main navigation" className="relative ml-6 hidden min-w-0 flex-1 lg:block">
            {/* invisible copy used only to measure each item's real width */}
            <ul ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 flex h-0 w-max items-center gap-0.5 overflow-hidden">
                {items.map((item) => <li key={item.key} className="shrink-0"><span className={cn(pill, 'px-4')}>{item.label}</span></li>)}
                <li className="shrink-0"><span className={cn(pill, 'inline-flex items-center gap-1')}>More <ChevronDown size={14} /></span></li>
            </ul>

            <ul ref={listRef} className="relative flex w-max max-w-full items-center gap-0.5">
                <li
                    aria-hidden="true"
                    className={cn('absolute inset-y-0 rounded-full bg-primary-tint', glide && 'transition-[left,width,opacity] duration-500 ease-out', indicator ? 'opacity-100' : 'opacity-0')}
                    style={{ left: indicator?.left ?? 0, width: indicator?.width ?? 0 }}
                />
                {shown.map((item) => (
                    <li key={item.key}>
                        {item.category ? (
                            <CategoryLink category={item.category} current={currentSlug === item.key} itemRef={setRef(item.key)} />
                        ) : (
                            <NavLink ref={setRef(item.key)} to="/shop" className={({ isActive }) => cn(pill, isActive ? pillActive : pillIdle)}>{item.label}</NavLink>
                        )}
                    </li>
                ))}
                {more.length > 0 && (
                    <li><MoreMenu categories={more} currentSlug={currentSlug} buttonRef={setRef('__more')} active={activeKey === '__more'} /></li>
                )}
            </ul>
        </nav>
    );
}
