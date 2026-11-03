import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import AccountMenu from '@/components/layout/AccountMenu';
import MobileNav from '@/components/layout/MobileNav';
import ShopRibbon, { RibbonPanels } from '@/components/layout/ShopRibbon';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useScrollPosition } from '@/hooks';
import { cn } from '@/utils/formatPrice';

const SearchOverlay = lazy(() => import('@/components/layout/SearchOverlay'));

const iconButton =
    'relative grid size-10 min-[340px]:size-11 place-items-center rounded-full text-ink transition-colors hover:bg-primary-soft hover:text-primary active:bg-primary-tint';

function CountBadge({ count }) {
    if (!count) return null;
    return (
        <span key={count} className="absolute right-0.5 top-0.5 grid min-w-5 animate-pop place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-5 text-white" aria-hidden="true">
            {count > 99 ? '99+' : count}
        </span>
    );
}

export default function Header() {
    const { content } = useSiteContent();
    const { itemCount: cartCount, openCartDrawer } = useCart();
    const { itemCount: wishlistCount } = useWishlist();
    const scrolled = useScrollPosition();
    const direction = useScrollDirection();
    const { pathname } = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState(null); // 'concern' | 'offers' | null: the ribbon panel that is showing
    const headerRef = useRef(null);
    const mainRowRef = useRef(null);
    const leaveTimer = useRef(0);
    const links = content.navLinks ?? [];
    // On the homepage the category bar sticks to the page while you read down, so the menu above it steps out of the way
    // (and returns on the way up): the same words are never stacked twice in the corner of the screen.
    const tuckAway = pathname === '/' && direction === 'down';

    useEffect(() => { setMenuOpen(false); setOpenMenu(null); }, [pathname]);

    // Publish how much of the header is on screen (the phone strip slides away while reading down), so a sticky bar
    // further down the page (the homepage category buttons) can sit exactly under it.
    useLayoutEffect(() => {
        const root = document.documentElement;
        const publish = () => {
            const main = tuckAway ? 0 : (mainRowRef.current?.getBoundingClientRect().height ?? 0);
            root.style.setProperty('--header-offset', `${Math.round(main)}px`);
        };
        publish();
        const observer = new ResizeObserver(publish);
        if (mainRowRef.current) observer.observe(mainRowRef.current);
        return () => { observer.disconnect(); root.style.removeProperty('--header-offset'); };
    }, [tuckAway]);

    // A panel opens on click, and on hover for a mouse (hovering on the same pill again keeps it, leaving closes it).
    const toggleMenu = useCallback((key, hover = false) => {
        clearTimeout(leaveTimer.current);
        if (hover && !window.matchMedia('(hover: hover)').matches) return;
        setOpenMenu((current) => (hover ? key : (current === key ? null : key)));
    }, []);
    const closeMenu = useCallback(() => setOpenMenu(null), []);
    const scheduleClose = () => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        clearTimeout(leaveTimer.current);
        leaveTimer.current = setTimeout(closeMenu, 180);
    };
    useEffect(() => () => clearTimeout(leaveTimer.current), []);

    // Click or tap outside, or Escape, closes the panel; so does reading on down the page.
    useEffect(() => {
        if (!openMenu) return undefined;
        const onPointer = (e) => { if (!headerRef.current?.contains(e.target)) closeMenu(); };
        const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
    }, [openMenu, closeMenu]);
    useEffect(() => { if (direction === 'down') closeMenu(); }, [direction, closeMenu]);

    // Press "/" anywhere (outside a text field) to open search, like most large stores.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
            const el = document.activeElement;
            if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return;
            e.preventDefault();
            setSearchOpen(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        // The strip below is hidden with a transform, never by changing its height: a height change moves the page under
        // the finger, which flips the scroll direction again and made the header flicker on phones. The header box keeps
        // its height; its transparent gap lets taps through (pointer-events), only the two rows take them.
        <header ref={headerRef} onMouseLeave={scheduleClose} onMouseEnter={() => clearTimeout(leaveTimer.current)} className={cn('pointer-events-none sticky top-0 z-50 transition-transform duration-300 ease-[var(--ease-out-soft)] lg:pointer-events-auto', tuckAway && '-translate-y-full lg:pointer-events-none')} inert={tuckAway ? true : undefined}>
            <div ref={mainRowRef} className={cn('pointer-events-auto relative z-10 border-b bg-accent transition-shadow duration-300', scrolled ? 'border-line shadow-sm' : 'border-transparent')}>
            <div className="container-page flex h-16 items-center gap-2 min-[340px]:gap-4 lg:h-20">
                <button type="button" className={cn(iconButton, 'lg:hidden -ml-2')} onClick={() => setMenuOpen(true)} aria-label="Open menu">
                    <Menu size={22} />
                </button>

                <Logo size="header" linkToHome priority shine="hover" />

                <ShopRibbon variant="desktop" openMenu={openMenu} onToggle={toggleMenu} />

                <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
                    <button type="button" className={iconButton} onClick={() => setSearchOpen(true)} aria-label="Search">
                        <Search size={20} />
                    </button>
                    <NavLink to="/wishlist" className={iconButton} aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'}` : ''}`}>
                        <Heart size={20} />
                        <CountBadge count={wishlistCount} />
                    </NavLink>
                    <div className="hidden lg:block"><AccountMenu iconButtonClass={iconButton} /></div>
                    <button type="button" className={iconButton} onClick={openCartDrawer} aria-label={`Bag${cartCount ? `, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : ''}`}>
                        <ShoppingBag size={20} />
                        <CountBadge count={cartCount} />
                    </button>
                </div>
            </div>
            </div>

            <RibbonPanels openMenu={openMenu} onClose={closeMenu} />

            <MobileNav isOpen={menuOpen} onClose={() => setMenuOpen(false)} links={links} />
            {searchOpen && (
                <Suspense fallback={null}>
                    <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
                </Suspense>
            )}
        </header>
    );
}
