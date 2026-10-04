import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, ShoppingBag, Menu, X, User, Package, LogOut, ChevronDown, ArrowRight } from 'lucide-react';
import { useScrollPosition } from '@/hooks';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategories } from '@/hooks/useApi';
import InstagramIcon from '@/components/ui/InstagramIcon';
import Marquee from '@/components/ui/Marquee';
import { loginUrl } from '@/utils/authRedirect';
import { hasInstagramUrl } from '@/utils/socialLinks';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { FREE_DELIVERY_THRESHOLD, CATEGORIES } from '@/constants';
import { GOALS } from '@/components/home/wellnessRituals';

const SearchOverlay = lazy(() => import('@/components/search/SearchOverlay'));

export default function Navbar() {
    const { content } = useSiteContent();
    const { social, navLinks } = content;
    const { categories } = useCategories();
    const freeDeliveryThreshold = content.delivery?.freeThreshold ?? FREE_DELIVERY_THRESHOLD;
    const instagramUrl = social.instagramUrl?.trim();
    const instagramLinked = hasInstagramUrl(instagramUrl);
    const isScrolled = useScrollPosition();
    const location = useLocation();
    const headerRef = useRef(null);
    const { itemCount: cartCount, cartPulse, openCartDrawer } = useCart();
    const { itemCount: wishlistCount } = useWishlist();
    const { user, isAuthenticated } = useAuth();
    const { signOut, isSigningOut } = useCustomerSession();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [megaOpen, setMegaOpen] = useState(false);
    const [hoveredHref, setHoveredHref] = useState(null);
    const accountRef = useRef(null);
    const megaCloseTimer = useRef(null);

    const iconBtn = 'relative inline-flex items-center justify-center p-2 sm:p-2.5 rounded-full text-cream/75 hover:text-turmeric-light hover:bg-cream/10 active:scale-90 transition-[color,background-color,transform] duration-300';
    const linkClass = 'relative z-10 inline-flex items-center gap-1 type-nav text-cream/80 hover:text-cream transition-colors duration-300 py-2 px-1';

    const categoryTiles = categories.length > 0
        ? categories.slice(0, 4).map((c) => ({ slug: c.slug, label: c.label, image: c.image }))
        : CATEGORIES.slice(0, 4).map((c) => ({ slug: c.id, label: c.label, image: c.image }));

    useEffect(() => {
        setMobileOpen(false);
        setAccountOpen(false);
        setMegaOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleClick = (e) => {
            if (accountRef.current && !accountRef.current.contains(e.target)) {
                setAccountOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileOpen || searchOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen, searchOpen]);

    useEffect(() => () => clearTimeout(megaCloseTimer.current), []);

    /* Measure full fixed header height → prevents content overlap */
    useEffect(() => {
        const el = headerRef.current;
        if (!el) return undefined;

        const syncHeight = () => {
            document.documentElement.style.setProperty('--site-header-h', `${el.offsetHeight}px`);
        };

        syncHeight();
        const ro = new ResizeObserver(syncHeight);
        ro.observe(el);
        window.addEventListener('resize', syncHeight);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', syncHeight);
        };
    }, [isScrolled]);

    const openMega = () => {
        clearTimeout(megaCloseTimer.current);
        setMegaOpen(true);
    };
    const closeMegaDelayed = () => {
        megaCloseTimer.current = setTimeout(() => setMegaOpen(false), 140);
    };

    return (<>
        {/* `top` follows PromoBanner's live height (see PromoBanner.jsx) —
            that bar sits in normal flow with a higher z-index, so without
            this offset it silently paints over this fixed header's own
            top strip instead of stacking above it. */}
        <div ref={headerRef} className="fixed left-0 right-0 z-50" style={{ top: 'var(--promo-banner-h, 0px)' }}>
            {/* Trust ticker — a running strip instead of one static centered
                line: the motion itself signals "not the same template bar". */}
            <div className="bg-forest-deep overflow-hidden">
                <Marquee
                    speed={26}
                    className="py-2"
                    items={[
                        `Free delivery above ${formatPrice(freeDeliveryThreshold)}`,
                        'FSSAI Certified & Lab-Tested Purity',
                        '7-Day Easy Returns',
                        'No Added Preservatives',
                        ...(instagramLinked ? [
                            <a
                                key="ig"
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 underline-offset-2 hover:underline text-turmeric-light"
                            >
                                <InstagramIcon size={11} className="inline" filled />
                                @{social.instagramHandle}
                            </a>,
                        ] : []),
                    ]}
                    itemClassName="type-announce text-cream/90"
                />
            </div>

            {/* Floating glass pill at the top of the page — translucent and
                blurred, meant to sit over the hero. Docks flat AND switches
                to a fully opaque solid fill once scrolled: the translucent
                version looked fine over the hero's own controlled imagery,
                but once the page has scrolled past it, that same see-through
                pill sits over whatever's directly beneath it — a product
                photo, a colorful section — and picks up all of that through
                the blur, reading as broken rather than "glassy". Solid once
                scrolled removes that dependency on what's underneath. */}
            <div className={`transition-[padding] duration-500 ${isScrolled ? 'pt-0' : 'pt-2 sm:pt-3'}`}>
                <header
                    className={`mx-auto transition-[background-color,box-shadow,border-radius,max-width,padding,backdrop-filter] duration-500 ${
                        isScrolled
                            ? 'max-w-none rounded-none py-2.5 border-b border-cream/10 shadow-[0_4px_24px_rgba(0,0,0,0.25)] bg-forest-deep'
                            : 'max-w-[min(96%,90rem)] rounded-2xl sm:rounded-full py-3 sm:py-3.5 border border-cream/10 shadow-[0_8px_32px_rgba(0,0,0,0.18)] glass-navbar'
                    }`}
                >
                    <nav
                        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4"
                        aria-label="Main navigation"
                    >
                        <Logo size="sm" linkToHome showHover variant="default" withWordmark className="text-cream" />

                        <Link
                            to="/shop"
                            className="hidden sm:flex lg:hidden flex-shrink-0 px-4 py-2 rounded-full type-eyebrow transition-all duration-300 border border-cream/25 text-cream hover:bg-cream/10"
                        >
                            Shop
                        </Link>

                        <ul
                            className="hidden lg:flex items-center gap-2 xl:gap-3 relative"
                            onMouseLeave={() => { setHoveredHref(null); closeMegaDelayed(); }}
                        >
                            {navLinks.map((link) => {
                                const active = location.pathname === link.href;
                                const isShop = link.href === '/shop';
                                return (
                                    <li
                                        key={link.href}
                                        className="relative"
                                        onMouseEnter={() => { setHoveredHref(link.href); if (isShop) openMega(); }}
                                    >
                                        <Link to={link.href} className={linkClass}>
                                            {(hoveredHref === link.href || (!hoveredHref && active)) && (
                                                <motion.span
                                                    layoutId="navPillHighlight"
                                                    className="absolute inset-0 -z-10 rounded-full bg-cream/12"
                                                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                                />
                                            )}
                                            <span className="px-3 py-1.5">{link.label}</span>
                                            {isShop && <ChevronDown size={13} className={`transition-transform duration-300 mr-2 ${megaOpen ? 'rotate-180' : ''}`} />}
                                        </Link>

                                        {isShop && (
                                            <AnimatePresence>
                                                {megaOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                                        onMouseEnter={openMega}
                                                        onMouseLeave={closeMegaDelayed}
                                                        className="absolute left-1/2 -translate-x-1/2 top-full mt-4 w-[min(92vw,44rem)] bg-cream rounded-3xl soft-shadow-lg border border-border/40 p-6 grid grid-cols-2 gap-8 z-50"
                                                    >
                                                        <div>
                                                            <p className="type-eyebrow text-forest mb-4">Shop by Goal</p>
                                                            <ul className="space-y-1">
                                                                {GOALS.slice(0, 5).map((goal) => {
                                                                    const Icon = goal.icon;
                                                                    return (
                                                                        <li key={goal.id}>
                                                                            <Link
                                                                                to={`/shop?goal=${goal.id}`}
                                                                                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sand/60 transition-colors group"
                                                                            >
                                                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-forest/8 text-forest flex-shrink-0 group-hover:bg-forest group-hover:text-cream transition-colors">
                                                                                    <Icon size={14} strokeWidth={1.75} />
                                                                                </span>
                                                                                <span className="text-sm text-ink">{goal.label}</span>
                                                                            </Link>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <p className="type-eyebrow text-forest mb-4">Shop by Category</p>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {categoryTiles.map((cat) => (
                                                                    <Link
                                                                        key={cat.slug}
                                                                        to={`/category/${cat.slug}`}
                                                                        className="relative aspect-[4/3] rounded-xl overflow-hidden group ring-1 ring-border/50 hover:ring-forest/40 transition-all"
                                                                    >
                                                                        <img src={imageUrl(cat.image)} alt={cat.label} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/5 to-transparent" />
                                                                        <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-cream leading-tight">{cat.label}</span>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 pt-4 border-t border-border/40 flex items-center justify-between">
                                                            <span className="type-eyebrow-sm text-slate">Free delivery above {formatPrice(freeDeliveryThreshold)}</span>
                                                            <Link to="/shop" className="inline-flex items-center gap-1.5 type-eyebrow-sm text-forest hover:text-forest-light font-semibold">
                                                                View all products <ArrowRight size={13} />
                                                            </Link>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="flex items-center gap-0.5 sm:gap-1 rounded-full sm:bg-cream/[0.06] sm:px-1.5 sm:py-1 ml-auto flex-shrink-0">
                            {instagramLinked && (
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${iconBtn} hidden sm:flex`}
                                aria-label={`Follow @${social.instagramHandle} on Instagram`}
                                title={`@${social.instagramHandle} on Instagram`}
                            >
                                <InstagramIcon size={18} filled />
                            </a>
                            )}

                            <button onClick={() => setSearchOpen(true)} className={iconBtn} aria-label="Search">
                                <Search size={18} strokeWidth={1.25} />
                            </button>

                            <Link to="/wishlist" className={iconBtn} aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ''}`}>
                                <Heart size={18} strokeWidth={1.25} />
                                {wishlistCount > 0 && (
                                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-turmeric-light text-forest text-[8px] font-semibold flex items-center justify-center rounded-full">
                                        {wishlistCount}
                                    </span>
                                )}
                            </Link>

                            <button
                                type="button"
                                onClick={openCartDrawer}
                                className={iconBtn}
                                aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
                            >
                                <motion.span
                                    key={cartPulse}
                                    animate={cartPulse > 0 ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="inline-flex"
                                >
                                    <ShoppingBag size={18} strokeWidth={1.25} />
                                </motion.span>
                                <AnimatePresence>
                                    {cartCount > 0 && (
                                        <motion.span
                                            key={cartCount}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 bg-turmeric-light text-forest text-[8px] font-semibold flex items-center justify-center rounded-full"
                                        >
                                            {cartCount}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>

                            <div className="relative hidden sm:block" ref={accountRef}>
                                {isAuthenticated ? (
                                    <button
                                        type="button"
                                        onClick={() => setAccountOpen(!accountOpen)}
                                        className={iconBtn}
                                        aria-label="Account menu"
                                        aria-expanded={accountOpen}
                                    >
                                        <UserAvatar user={user} size="xs" signedIn />
                                    </button>
                                ) : (
                                    <Link to={loginUrl()} className={iconBtn} aria-label="Sign in">
                                        <span className="inline-flex size-[18px] items-center justify-center">
                                            <User size={18} strokeWidth={1.25} className="block" />
                                        </span>
                                    </Link>
                                )}

                                <AnimatePresence>
                                    {accountOpen && isAuthenticated && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                            className="absolute right-0 top-full mt-2 w-52 bg-cream rounded-xl soft-shadow border border-border/40 py-2 z-50"
                                        >
                                            <div className="px-4 py-2 border-b border-border/40 flex items-center gap-3">
                                                <UserAvatar user={user} size="md" signedIn />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-ink truncate">{user?.name || 'Account'}</p>
                                                    <p className="text-xs text-slate truncate">{user?.email}</p>
                                                </div>
                                            </div>
                                            <Link to="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-sand/60">
                                                <User size={16} /> My Account
                                            </Link>
                                            <Link to="/orders" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-sand/60">
                                                <Package size={16} /> My Orders
                                            </Link>
                                            <Link to="/wishlist" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-sand/60">
                                                <Heart size={16} /> Wishlist
                                            </Link>
                                            <button
                                                type="button"
                                                disabled={isSigningOut}
                                                onClick={() => { setAccountOpen(false); signOut(); }}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left disabled:opacity-50"
                                            >
                                                <LogOut size={16} /> Sign Out
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={() => setMobileOpen(!mobileOpen)}
                                className="lg:hidden p-2 sm:p-2.5 rounded-full transition-all duration-300 text-cream hover:bg-cream/10 active:scale-90"
                                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={mobileOpen}
                            >
                                {mobileOpen ? <X size={20} strokeWidth={1.25} /> : <Menu size={20} strokeWidth={1.25} />}
                            </button>
                        </div>
                    </nav>
                </header>
            </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
            {mobileOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] bg-forest-deep/70 backdrop-blur-sm lg:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        // Above PromoBanner's z-[60] — a full-screen drawer must cover
                        // the dismissible discount bar, not float uselessly beneath it
                        // (previously z-50, same as the header, so the promo bar's
                        // z-60 painted right over the drawer's own logo/close button
                        // whenever it was opened near the top of the page).
                        className="fixed top-0 right-0 bottom-0 z-[71] w-full max-w-sm bg-forest soft-shadow-lg lg:hidden flex flex-col"
                    >
                        <div className="flex items-center justify-between p-5 border-b border-cream/10">
                            <Logo size="sm" showHover={false} withWordmark className="text-cream" />
                            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-full text-cream hover:bg-cream/10" aria-label="Close menu">
                                <X size={20} strokeWidth={1.25} />
                            </button>
                        </div>
                        {/* min-h-0 overrides the flex item's default min-height:auto —
                            without it, a flex-1 child with overflow-y-auto still
                            refuses to shrink below its content size (a well-known
                            flexbox gotcha) and never actually scrolls. The tighter
                            spacing below (was space-y-6/py-8) is the other half of
                            the fix: on a standard 390x844 phone the untrimmed content
                            was ~55px taller than the available space, so "Sign In"
                            sat just past the scroll fold — clipped mid-line right
                            where the Instagram card starts, reading as a broken
                            overlap even though nothing was actually mispositioned.
                            The fade mask below is a safety net for anything shorter
                            still (small phones, larger system font sizes). */}
                        <div className="relative flex-1 min-h-0">
                            <nav className="h-full px-8 py-5 overflow-y-auto">
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-5 -mx-1 px-1">
                                {categoryTiles.map((cat) => (
                                    <Link
                                        key={cat.slug}
                                        to={`/category/${cat.slug}`}
                                        onClick={() => setMobileOpen(false)}
                                        className="relative flex-shrink-0 w-24 aspect-[4/3] rounded-xl overflow-hidden ring-1 ring-cream/15"
                                    >
                                        <img src={imageUrl(cat.image)} alt={cat.label} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                                        <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-semibold text-cream leading-tight">{cat.label}</span>
                                    </Link>
                                ))}
                            </div>
                            <ul className="space-y-4">
                                {navLinks.map((link, i) => (
                                    <motion.li key={link.href} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.06 }}>
                                        <Link
                                            to={link.href}
                                            onClick={() => setMobileOpen(false)}
                                            className="block font-display text-2xl font-light text-cream/80 hover:text-turmeric-light transition-colors py-1"
                                        >
                                            {link.label}
                                        </Link>
                                    </motion.li>
                                ))}
                                <motion.li initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                                    <button
                                        type="button"
                                        onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
                                        className="block font-display text-2xl font-light text-cream/80 hover:text-turmeric-light transition-colors py-1 w-full text-left"
                                    >
                                        Search
                                    </button>
                                </motion.li>
                                <motion.li initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                                    <Link
                                        to={isAuthenticated ? '/account' : loginUrl()}
                                        onClick={() => setMobileOpen(false)}
                                        className="block font-display text-2xl font-light text-cream/80 hover:text-turmeric-light transition-colors py-1"
                                    >
                                        {isAuthenticated ? 'My Account' : 'Sign In'}
                                    </Link>
                                </motion.li>
                            </ul>
                            </nav>
                            {/* Fade-to-forest mask hinting "scroll for more" instead of
                                a hard clip — only matters on the shortest viewports
                                where the trimmed content above still doesn't fully fit. */}
                            <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-forest to-transparent pointer-events-none" />
                        </div>
                        <div className="px-8 pb-8 space-y-5">
                            {instagramLinked && (
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-cream/10 border border-cream/15 hover:bg-cream/15 transition-colors"
                            >
                                <span className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] p-[2px] flex-shrink-0">
                                    <span className="w-full h-full rounded-full bg-forest flex items-center justify-center">
                                        <InstagramIcon size={20} className="text-cream" filled />
                                    </span>
                                </span>
                                <span>
                                    <span className="block type-eyebrow text-turmeric-light/80 mb-0.5">Instagram</span>
                                    <span className="block font-display text-lg text-cream">@{social.instagramHandle}</span>
                                </span>
                            </a>
                            )}
                            <p className="type-eyebrow text-cream/35">
                                {content.brandTagline}
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        {searchOpen && (
            <Suspense fallback={null}>
                <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            </Suspense>
        )}
    </>);
}
