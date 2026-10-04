import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { jumpToShelf, useShelfSpy } from '@/utils/shelfSpy';
import { cn } from '@/utils/formatPrice';

const pill = 'relative whitespace-nowrap rounded-full px-4 py-2 text-small font-medium transition-colors';
const pillIdle = 'text-ink hover:bg-primary-soft hover:text-primary';
const pillActive = 'bg-primary-tint text-primary-deep';

/** How many category pills fit before the rest go under "More": fewer on a small laptop, up to the admin's limit on wide screens. */
function useVisibleCount(max) {
    const query = '(min-width: 1280px)';
    const [wide, setWide] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const onChange = () => setWide(media.matches);
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);
    return wide ? max : Math.min(max, 4);
}

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

function CategoryLink({ category, className, onNavigate }) {
    const link = useCategoryLink(category.slug);
    return (
        <Link
            to={link.to}
            onClick={(event) => { link.onClick(event); onNavigate?.(); }}
            aria-current={link.current ? 'true' : undefined}
            className={cn(className ?? pill, link.current ? pillActive : pillIdle)}
        >
            {category.label}
        </Link>
    );
}

function MoreMenu({ categories }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const { pathname } = useLocation();
    const { active } = useShelfSpy();
    const hasCurrent = categories.some((c) => (pathname === '/' ? active === c.slug : pathname === `/category/${c.slug}`));

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
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="true"
                aria-current={hasCurrent ? 'true' : undefined}
                className={cn(pill, 'inline-flex items-center gap-1', hasCurrent ? pillActive : pillIdle)}
            >
                More <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && (
                <ul className="absolute right-0 top-full z-50 mt-2 min-w-48 animate-fade-in rounded-lg border border-line bg-surface p-1.5 shadow-md">
                    {categories.map((category) => (
                        <li key={category.slug}>
                            <CategoryLink category={category} className="block rounded-md px-3 py-2 text-small font-medium transition-colors" onNavigate={() => setOpen(false)} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * The header's main navigation. By default it is the shop's categories (product-first) — "All products" then each
 * category, extra ones under "More" — and the one being read on the homepage is highlighted as the visitor scrolls.
 * The admin can switch it back to a custom link list (Content → Homepage → Top navigation).
 */
export default function CategoryNav() {
    const { content } = useSiteContent();
    const { plan } = useCategoryPlan();
    const { mode, showAll, maxVisible } = content.extras.nav;
    const visibleCount = useVisibleCount(maxVisible);

    if (mode === 'links') {
        return (
            <nav aria-label="Main navigation" className="ml-8 hidden lg:block">
                <ul className="flex items-center gap-1">
                    {(content.navLinks ?? []).map((link) => (
                        <li key={link.href}>
                            <NavLink to={link.href} end={link.href === '/'} className={({ isActive }) => cn(pill, isActive ? pillActive : pillIdle)}>{link.label}</NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        );
    }

    const shown = plan.slice(0, visibleCount);
    const more = plan.slice(visibleCount);

    return (
        <nav aria-label="Main navigation" className="ml-6 hidden min-w-0 lg:block">
            <ul className="flex items-center gap-0.5">
                {showAll && (
                    <li>
                        <NavLink to="/shop" className={({ isActive }) => cn(pill, isActive ? pillActive : pillIdle)}>All products</NavLink>
                    </li>
                )}
                {shown.map((category) => (
                    <li key={category.slug}><CategoryLink category={category} /></li>
                ))}
                {more.length > 0 && <li><MoreMenu categories={more} /></li>}
            </ul>
        </nav>
    );
}
