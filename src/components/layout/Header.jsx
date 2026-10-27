import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import AccountMenu from '@/components/layout/AccountMenu';
import MobileNav from '@/components/layout/MobileNav';
import CategoryNav from '@/components/layout/CategoryNav';
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
    const links = content.navLinks ?? [];
    const stripHidden = direction === 'down';

    useEffect(() => setMenuOpen(false), [pathname]);

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
        <header className="pointer-events-none sticky top-0 z-50 lg:pointer-events-auto">
            <div className={cn('pointer-events-auto relative z-10 border-b bg-canvas transition-shadow duration-300', scrolled && stripHidden ? 'border-line shadow-sm' : 'border-transparent', scrolled ? 'lg:border-line lg:shadow-sm' : 'lg:border-transparent', !stripHidden && 'shadow-none')}>
            <div className="container-page flex h-16 items-center gap-2 min-[340px]:gap-4 lg:h-20">
                <button type="button" className={cn(iconButton, 'lg:hidden -ml-2')} onClick={() => setMenuOpen(true)} aria-label="Open menu">
                    <Menu size={22} />
                </button>

                <Logo size="header" linkToHome priority shine="hover" />

                <CategoryNav variant="desktop" />

                <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
                    <button type="button" className={iconButton} onClick={() => setSearchOpen(true)} aria-label="Search">
                        <Search size={20} />
                    </button>
                    <NavLink to="/wishlist" className={cn(iconButton, 'hidden sm:grid')} aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`}>
                        <Heart size={20} />
                        <CountBadge count={wishlistCount} />
                    </NavLink>
                    <AccountMenu iconButtonClass={iconButton} />
                    <button type="button" className={iconButton} onClick={openCartDrawer} aria-label={`Bag${cartCount ? `, ${cartCount} items` : ''}`}>
                        <ShoppingBag size={20} />
                        <CountBadge count={cartCount} />
                    </button>
                </div>
            </div>
            </div>

            {/* On phones the category strip slides up under the main row while reading down and returns on the way up. */}
            <div
                className={cn(
                    'pointer-events-auto relative z-0 border-b bg-canvas transition-[transform,opacity] duration-300 ease-[var(--ease-out-soft)] will-change-transform lg:hidden',
                    stripHidden ? 'pointer-events-none -translate-y-full border-transparent opacity-0' : cn('translate-y-0 opacity-100', scrolled ? 'border-line shadow-sm' : 'border-transparent'),
                )}
                aria-hidden={stripHidden ? 'true' : undefined}
                inert={stripHidden ? true : undefined}
            >
                <CategoryNav variant="phone" />
            </div>

            <MobileNav isOpen={menuOpen} onClose={() => setMenuOpen(false)} links={links} />
            {searchOpen && (
                <Suspense fallback={null}>
                    <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
                </Suspense>
            )}
        </header>
    );
}
