import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ChevronDown, Crown, Heart, LogOut, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import SearchOverlay from '@/components/layout/SearchOverlay';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { activeConcerns } from '@/utils/concerns';
import { CONCERN_ICONS } from '@/utils/concernIcons';
import { ribbonItems } from '@/utils/ribbonMenu';
import { loginUrl } from '@/utils/authRedirect';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const navLink = 'relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-small font-semibold text-primary-deep transition-colors hover:bg-primary/10';
const iconBtn = 'relative grid size-11 place-items-center rounded-full text-primary-deep transition-colors hover:bg-primary/10';

/** A Health Need as a round picture (the client's line icon) with its name beneath. */
export function NeedTile({ concern, onClick, className }) {
    const Icon = CONCERN_ICONS[concern.icon] ?? CONCERN_ICONS.leaf;
    return (
        <Link to={`/concern/${concern.slug}`} onClick={onClick} className={cn('group flex flex-col items-center gap-2.5 text-center', className)}>
            <span className="grid aspect-square w-full max-w-[5.5rem] place-items-center overflow-hidden rounded-full bg-accent ring-1 ring-primary/10 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/40">
                {concern.image
                    ? <img src={imageUrl(concern.image, 220)} alt="" width="88" height="88" loading="lazy" className="size-full object-cover" />
                    : <Icon size={30} strokeWidth={1.5} className="text-primary" aria-hidden="true" />}
            </span>
            <span className="text-caption font-semibold leading-tight text-ink group-hover:text-primary sm:text-small">{concern.label}</span>
        </Link>
    );
}

function MegaPanel({ open, onClose, concerns, plan }) {
    if (open !== 'shop' && open !== 'needs') return null;
    return (
        <div className="absolute inset-x-0 top-full z-40 hidden animate-fade-in border-t border-primary/10 bg-canvas shadow-lg lg:block" onMouseLeave={onClose}>
            <div className="container-page max-h-[calc(100dvh-8rem)] overflow-y-auto py-8">
                {open === 'needs' ? (
                    <>
                        <div className="mb-5 flex items-end justify-between">
                            <div>
                                <p className="eyebrow">Shop by health need</p>
                                <p className="mt-1 text-small text-muted">Start from what you want to feel better at.</p>
                            </div>
                            <Link to="/shop" onClick={onClose} className="text-small font-semibold text-primary hover:underline">All products</Link>
                        </div>
                        <ul className="grid grid-cols-6 gap-x-4 gap-y-6 xl:grid-cols-9">
                            {concerns.map((c) => <li key={c.slug}><NeedTile concern={c} onClick={onClose} /></li>)}
                        </ul>
                    </>
                ) : (
                    <div className="grid grid-cols-12 gap-10">
                        <div className="col-span-5">
                            <p className="eyebrow mb-4">Shop by category</p>
                            <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                                {plan.map((c) => (
                                    <li key={c.slug}><Link to={`/category/${c.slug}`} onClick={onClose} className="flex min-h-11 items-center rounded-xl px-3 text-small font-semibold text-ink transition-colors hover:bg-accent hover:text-primary-deep">{c.label}</Link></li>
                                ))}
                                <li><Link to="/shop" onClick={onClose} className="flex min-h-11 items-center rounded-xl px-3 text-small font-bold text-primary hover:bg-accent">Shop all</Link></li>
                            </ul>
                        </div>
                        <div className="col-span-7 grid grid-cols-3 gap-4">
                            <Link to="/offers" onClick={onClose} className="group flex flex-col justify-end rounded-[1.25rem] bg-primary p-5 text-white transition-transform hover:-translate-y-0.5"><span className="text-caption font-bold uppercase tracking-[0.14em] text-peach">Offers</span><span className="mt-1 font-display text-h4 leading-tight">Any 3 for one price</span></Link>
                            <Link to="/new-launches" onClick={onClose} className="group flex flex-col justify-end rounded-[1.25rem] bg-accent p-5 text-primary-deep transition-transform hover:-translate-y-0.5"><span className="text-caption font-bold uppercase tracking-[0.14em] text-accent-ink">Just in</span><span className="mt-1 font-display text-h4 leading-tight">New launches</span></Link>
                            <Link to="/club" onClick={onClose} className="group flex flex-col justify-end rounded-[1.25rem] bg-primary-night p-5 text-white transition-transform hover:-translate-y-0.5"><span className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.14em] text-gold-soft"><Crown size={13} aria-hidden="true" /> Club</span><span className="mt-1 font-display text-h4 leading-tight">Member prices, free</span></Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AccountMenu({ onClose }) {
    const { user, isAuthenticated, signOut } = useCustomerSession();
    const location = useLocation();
    const { isMember } = useCart();
    const ref = useRef(null);
    useEffect(() => {
        const away = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', away);
        return () => document.removeEventListener('mousedown', away);
    }, [onClose]);
    const row = 'flex min-h-11 items-center gap-3 rounded-xl px-3 text-small font-semibold text-ink transition-colors hover:bg-accent-tint';
    return (
        <div ref={ref} className="absolute right-0 top-full z-50 mt-2 w-64 animate-fade-in rounded-2xl bg-surface p-2 shadow-lg ring-1 ring-line">
            {isAuthenticated ? (
                <>
                    <div className="px-3 pb-2 pt-1.5">
                        <p className="truncate text-small font-bold text-ink">{user?.name || 'Welcome'}</p>
                        <p className="truncate text-caption text-muted">{user?.email}</p>
                        {isMember && <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-primary-deep"><Crown size={11} aria-hidden="true" /> Club member</p>}
                    </div>
                    <Link to="/account" onClick={onClose} className={row}><User size={17} aria-hidden="true" /> My account</Link>
                    <Link to="/orders" onClick={onClose} className={row}><Package size={17} aria-hidden="true" /> My orders</Link>
                    <Link to="/wishlist" onClick={onClose} className={row}><Heart size={17} aria-hidden="true" /> Wishlist</Link>
                    <Link to="/club" onClick={onClose} className={row}><Crown size={17} className="text-gold" aria-hidden="true" /> {isMember ? 'My Club card' : 'Join the Club'}</Link>
                    <button type="button" onClick={() => { onClose(); signOut(); }} className={cn(row, 'w-full text-muted')}><LogOut size={17} aria-hidden="true" /> Sign out</button>
                </>
            ) : (
                <>
                    <p className="px-3 pb-2 pt-1.5 text-small text-muted">Sign in to see your orders and Club prices.</p>
                    <Link to={loginUrl(location.pathname)} onClick={onClose} className="mx-1 flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-small font-semibold text-white hover:bg-primary-hover">Sign in or create account</Link>
                    <Link to="/track-order" onClick={onClose} className={cn(row, 'mt-1')}><Package size={17} aria-hidden="true" /> Track an order</Link>
                </>
            )}
        </div>
    );
}

function MenuDrawer({ open, onClose, items, concerns, plan }) {
    const panelRef = useDialog(open, onClose);
    const { mounted, closing } = usePresence(open);
    const { getWhatsAppUrl } = useWhatsApp();
    const { isMember } = useCart();
    if (!mounted) return null;
    const row = 'flex min-h-12 items-center justify-between rounded-xl px-3 text-body font-semibold text-ink hover:bg-accent-tint';
    return createPortal(
        <div className={cn('fixed inset-0 z-[110] lg:hidden', closing && 'pointer-events-none')}>
            <div className={cn('absolute inset-0 bg-primary-night/55', closing ? 'animate-fade-out' : 'animate-fade-in')} onClick={onClose} aria-hidden="true" />
            <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1} className={cn('absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-canvas shadow-lg focus:outline-none', closing ? 'animate-slide-out-left' : 'animate-slide-in-left')}>
                <div className="flex items-center justify-between bg-accent px-4 py-3">
                    <Logo size="md" />
                    <button type="button" onClick={onClose} aria-label="Close menu" className="grid size-11 place-items-center rounded-full text-primary-deep hover:bg-primary/10"><X size={22} aria-hidden="true" /></button>
                </div>
                <nav className="flex-1 overflow-y-auto p-3" aria-label="Menu">
                    <Link to="/club" onClick={onClose} className="mb-3 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-white">
                        <span className="grid size-10 place-items-center rounded-full bg-gold-soft text-gold"><Crown size={20} aria-hidden="true" /></span>
                        <span><span className="block text-body font-bold">{isMember ? 'My Club card' : 'Join the Chikit Club'}</span><span className="block text-caption text-white/80">{isMember ? 'Member prices are on' : 'Free. Member prices on most products'}</span></span>
                    </Link>
                    <Link to="/shop" onClick={onClose} className={row}>Shop all</Link>
                    {items.some((i) => i.key === 'new') && <Link to="/new-launches" onClick={onClose} className={row}>{items.find((i) => i.key === 'new').label}</Link>}
                    {items.some((i) => i.key === 'offers') && <Link to="/offers" onClick={onClose} className={row}>{items.find((i) => i.key === 'offers').label}</Link>}
                    <p className="eyebrow mb-3 mt-5 px-3">Health needs</p>
                    <ul className="grid grid-cols-3 gap-x-2 gap-y-5 px-1 pb-4">
                        {concerns.map((c) => <li key={c.slug}><NeedTile concern={c} onClick={onClose} /></li>)}
                    </ul>
                    <p className="eyebrow mb-1 mt-2 px-3">Categories</p>
                    {plan.map((c) => <Link key={c.slug} to={`/category/${c.slug}`} onClick={onClose} className={row}>{c.label}</Link>)}
                    <div className="mt-4 border-t border-line pt-3">
                        <Link to="/track-order" onClick={onClose} className={row}>Track your order</Link>
                        {items.some((i) => i.key === 'help') && <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className={cn(row, 'justify-start gap-3')}><WhatsAppIcon size={20} className="text-[#1FA855]" /> {items.find((i) => i.key === 'help').label}</a>}
                    </div>
                </nav>
            </div>
        </div>,
        document.body,
    );
}

/**
 * The header: always on the brand beige (the logo's own background). Desktop: logo, a Shop mega menu, Health Needs mega menu, New
 * Launches, Offers, WhatsApp help, a search pill, the Club button (a gold-crowned chip once you are a member), account and bag.
 * Phone: logo, search and bag here; Home / Shop / Club / Bag / Account live in the tab bar at the bottom.
 */
export default function Header() {
    const { content } = useSiteContent();
    const { itemCount, openCartDrawer, isMember } = useCart();
    const { items: wishlist } = useWishlist();
    const { getWhatsAppUrl } = useWhatsApp();
    const { plan } = useCategoryPlan();
    const [mega, setMega] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const closeTimer = useRef(null);

    const items = useMemo(() => ribbonItems(content.extras), [content.extras]);
    const concerns = useMemo(() => activeConcerns(content.extras), [content.extras]);
    const has = (key) => items.find((i) => i.key === key);
    const clubOn = content.extras?.club?.enabled !== false && has('club');

    useEffect(() => { setMega(null); setMenuOpen(false); setAccountOpen(false); }, [location.pathname]);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const openMega = (key) => { clearTimeout(closeTimer.current); setMega(key); };
    const leaveMega = () => { closeTimer.current = setTimeout(() => setMega(null), 140); };
    const closeSearch = useCallback(() => setSearchOpen(false), []);
    const closeAccount = useCallback(() => setAccountOpen(false), []);

    const megaTrigger = (key, label) => (
        <button
            type="button"
            onMouseEnter={() => openMega(key)}
            onClick={() => setMega((m) => (m === key ? null : key))}
            aria-expanded={mega === key}
            className={cn(navLink, mega === key && 'bg-primary/10')}
        >
            {label} <ChevronDown size={15} className={cn('transition-transform duration-200', mega === key && 'rotate-180')} aria-hidden="true" />
        </button>
    );

    return (
        <header className={cn('sticky top-0 z-50 bg-accent transition-shadow duration-300', scrolled ? 'shadow-md' : 'shadow-none')} onMouseLeave={leaveMega} onMouseEnter={() => clearTimeout(closeTimer.current)}>
            <div className="container-page relative flex h-16 items-center gap-2 lg:h-[4.75rem]">
                <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className={cn(iconBtn, '-ml-2 lg:hidden')}><Menu size={24} aria-hidden="true" /></button>
                <Logo size="header" linkToHome priority />

                <nav aria-label="Main navigation" className="ml-4 hidden items-center gap-0 lg:flex">
                    {megaTrigger('shop', 'Shop')}
                    {has('concern') && megaTrigger('needs', has('concern').label)}
                    {has('new') && <NavLink to="/new-launches" className={({ isActive }) => cn(navLink, isActive && 'bg-primary/10')}>{has('new').label}</NavLink>}
                    {has('offers') && <NavLink to="/offers" className={({ isActive }) => cn(navLink, isActive && 'bg-primary/10')}>{has('offers').label}</NavLink>}
                    {has('help') && <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className={navLink}><WhatsAppIcon size={16} className="text-[#1FA855]" /> <span className="hidden xl:inline">{has('help').label}</span><span className="xl:hidden">Help</span></a>}
                </nav>

                <div className="ml-auto flex items-center gap-1 lg:gap-1.5">
                    <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className="hidden h-11 w-44 shrink-0 items-center gap-2.5 rounded-full bg-surface/80 px-4 text-left text-small text-muted ring-1 ring-primary/10 transition-colors hover:bg-surface 2xl:flex">
                        <Search size={17} className="text-primary" aria-hidden="true" /> Search products
                    </button>
                    <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className={cn(iconBtn, '2xl:hidden')}><Search size={21} aria-hidden="true" /></button>

                    {clubOn && (isMember ? (
                        <Link to="/club" className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3.5 py-2 text-small font-bold text-white shadow-xs lg:inline-flex"><Crown size={15} className="text-gold-soft" aria-hidden="true" /> Club</Link>
                    ) : (
                        <Link to="/club" className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2.5 text-small font-bold text-white shadow-sm transition-colors hover:bg-primary-hover lg:inline-flex"><Crown size={15} className="text-gold-soft" aria-hidden="true" /> Join Club</Link>
                    ))}

                    <Link to="/wishlist" aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} saved` : ''}`} className={cn(iconBtn, 'hidden md:grid')}>
                        <Heart size={21} aria-hidden="true" />
                        {wishlist.length > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-accent" />}
                    </Link>
                    <div className="relative hidden lg:block">
                        <button type="button" onClick={() => setAccountOpen((o) => !o)} aria-label="Account" aria-expanded={accountOpen} className={iconBtn}><User size={21} aria-hidden="true" /></button>
                        {accountOpen && <AccountMenu onClose={closeAccount} />}
                    </div>
                    <button type="button" onClick={openCartDrawer} aria-label={`Bag${itemCount ? `, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : ''}`} className={iconBtn}>
                        <ShoppingBag size={21} aria-hidden="true" />
                        {itemCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-accent">{itemCount}</span>}
                    </button>
                </div>
            </div>

            <MegaPanel open={mega} onClose={() => setMega(null)} concerns={concerns} plan={plan} />
            <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} items={items} concerns={concerns} plan={plan} />
            <SearchOverlay open={searchOpen} onClose={closeSearch} />
        </header>
    );
}
