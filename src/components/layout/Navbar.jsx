import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, ShoppingBag, Menu, X, User, Package, LogOut } from 'lucide-react';
import { useScrollPosition } from '@/hooks';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useSiteContent } from '@/contexts/SiteContentContext';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { loginUrl } from '@/utils/authRedirect';
import { hasInstagramUrl } from '@/utils/socialLinks';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import { formatPrice } from '@/utils/formatPrice';
import { FREE_DELIVERY_THRESHOLD } from '@/constants';

const SearchOverlay = lazy(() => import('@/components/search/SearchOverlay'));

export default function Navbar() {
    const { content } = useSiteContent();
    const { social, navLinks } = content;
    const freeDeliveryThreshold = content.delivery?.freeThreshold ?? FREE_DELIVERY_THRESHOLD;
    const instagramUrl = social.instagramUrl?.trim();
    const instagramLinked = hasInstagramUrl(instagramUrl);
    const isScrolled = useScrollPosition();
    const location = useLocation();
    const headerRef = useRef(null);
    const { itemCount: cartCount, cartPulse } = useCart();
    const { itemCount: wishlistCount } = useWishlist();
    const { user, isAuthenticated } = useAuth();
    const { signOut, isSigningOut } = useCustomerSession();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef(null);

    // Navbar always uses the same forest styling on every page, including
    // Home — it used to switch to a white bar at the top of Home only
    // (before scrolling), which looked inconsistent with every other page.
    const iconBtn = 'relative inline-flex items-center justify-center p-2 sm:p-2.5 rounded-full text-cream/75 hover:text-turmeric-light hover:bg-cream/10 transition-all duration-500';
    const linkClass = 'group relative type-nav text-cream/75 hover:text-turmeric-light transition-colors duration-500 py-2';

    useEffect(() => {
        setMobileOpen(false);
        setAccountOpen(false);
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

    return (<>
        <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
            {/* Announcement bar */}
            <div className="text-center py-2 px-4 transition-colors duration-500 bg-forest-deep">
                <p className="type-announce text-cream/90">
                    Free delivery above {formatPrice(freeDeliveryThreshold)}&nbsp;&middot;&nbsp;FSSAI Certified &amp; Lab-Tested Purity
                    {instagramLinked && (
                        <>
                            &nbsp;&middot;&nbsp;
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 underline-offset-2 hover:underline text-turmeric-light"
                            >
                                <InstagramIcon size={11} className="inline" filled />
                                @{social.instagramHandle}
                            </a>
                        </>
                    )}
                </p>
            </div>

            {/* Main nav — forest bar only, same on every page */}
            <header
                className={`transition-[background,box-shadow,padding,border-color] duration-500 ${
                    isScrolled
                        ? 'bg-forest/98 py-3 border-b border-cream/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]'
                        : 'bg-forest py-3.5 sm:py-4'
                }`}
            >
                <nav
                    className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between gap-4"
                    aria-label="Main navigation"
                >
                    <Logo size="md" linkToHome showHover variant="default" />

                    <Link
                        to="/shop"
                        className="hidden sm:flex lg:hidden flex-shrink-0 px-4 py-2 rounded-full type-eyebrow transition-all duration-500 border border-cream/25 text-cream hover:bg-cream/10"
                    >
                        Shop
                    </Link>

                    <ul className="hidden lg:flex items-center gap-10 xl:gap-12">
                        {navLinks.map((link) => {
                            const active = location.pathname === link.href;
                            return (
                                <li key={link.href}>
                                    <Link to={link.href} className={linkClass}>
                                        {link.label}
                                        <span className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-px transition-all duration-500 ease-out bg-turmeric-light ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 ml-auto flex-shrink-0">
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

                        <Link to="/cart" className={iconBtn} aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}>
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
                        </Link>

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
                            className="lg:hidden p-2 sm:p-2.5 rounded-full transition-all duration-500 text-cream hover:bg-cream/10"
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileOpen}
                        >
                            {mobileOpen ? <X size={20} strokeWidth={1.25} /> : <Menu size={20} strokeWidth={1.25} />}
                        </button>
                    </div>
                </nav>
            </header>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
            {mobileOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-forest-deep/70 backdrop-blur-sm lg:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-forest soft-shadow-lg lg:hidden flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-cream/10">
                            <Logo size="sm" showHover={false} />
                            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-full text-cream hover:bg-cream/10" aria-label="Close menu">
                                <X size={20} strokeWidth={1.25} />
                            </button>
                        </div>
                        <nav className="flex-1 px-8 py-10 overflow-y-auto">
                            <ul className="space-y-7">
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
                        <div className="px-8 pb-10 space-y-6">
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
