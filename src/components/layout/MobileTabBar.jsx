import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Crown, Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { loginUrl } from '@/utils/authRedirect';
import { cn } from '@/utils/formatPrice';

const tab = 'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors';

/**
 * The phone's navigation lives at the bottom, the way shopping apps work: Home, Shop, the Chikit Club as a raised crown in the
 * middle, Bag and Account. It is on every page except checkout, where the shopper should see only the way to pay. Pages with a
 * bottom bar of their own (a product's buy bar, the Pick & Mix box) sit directly above it: this bar publishes its height as
 * --tabbar-h for them, and on those pages the crown stays level instead of rising, so it never pokes into the bar above.
 */
export default function MobileTabBar() {
    const { pathname } = useLocation();
    const { itemCount, openCartDrawer } = useCart();
    const { user, isAuthenticated } = useCustomerSession();
    const ref = useRef(null);
    const member = Boolean(isAuthenticated && user?.club?.member);
    const hidden = pathname.startsWith('/checkout');
    const stacked = pathname.startsWith('/product/') || pathname.startsWith('/offers/');

    useEffect(() => {
        const root = document.documentElement;
        const node = ref.current;
        if (hidden || !node) { root.style.setProperty('--tabbar-h', '0px'); return undefined; }
        const publish = () => root.style.setProperty('--tabbar-h', `${node.offsetHeight}px`);
        publish();
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null;
        observer?.observe(node);
        return () => { observer?.disconnect(); root.style.setProperty('--tabbar-h', '0px'); };
    }, [hidden, stacked]);

    if (hidden) return null;

    const active = ({ isActive }) => cn(tab, isActive ? 'text-primary' : 'text-muted');
    return (
        <nav ref={ref} aria-label="Quick navigation" className="safe-area-pb fixed inset-x-0 bottom-0 z-40 transform-gpu border-t border-line bg-surface pb-1 shadow-[0_-8px_24px_rgb(43_15_43/0.08)] after:absolute after:inset-x-0 after:top-full after:h-40 after:bg-surface after:content-[''] lg:hidden">
            <div className="flex items-end px-2">
                <NavLink to="/" end className={active}><Home size={21} aria-hidden="true" />Home</NavLink>
                <NavLink to="/shop" className={active}><LayoutGrid size={21} aria-hidden="true" />Shop</NavLink>
                <Link to="/club" className={cn('relative flex flex-1 flex-col items-center gap-0.5 text-[11px] font-semibold text-primary-deep', stacked ? 'min-h-14 justify-center' : 'justify-end pb-1.5')} aria-label={member ? 'My Club card' : 'Join the Chikit Club'}>
                    <span className={cn('grid place-items-center rounded-full bg-primary text-accent', stacked ? 'size-[21px]' : '-mt-6 size-12 shadow-lg ring-4 ring-surface')}><Crown size={stacked ? 13 : 22} aria-hidden="true" /></span>
                    {member ? 'My Club' : 'Club'}
                </Link>
                <button type="button" onClick={openCartDrawer} className={cn(tab, 'text-muted')}>
                    <span className="relative"><ShoppingBag size={21} aria-hidden="true" />{itemCount > 0 && <span className="absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-white">{itemCount}</span>}</span>
                    Bag
                </button>
                <NavLink to={isAuthenticated ? '/account' : loginUrl('/account')} className={active}><User size={21} aria-hidden="true" />{isAuthenticated ? 'Account' : 'Sign in'}</NavLink>
            </div>
        </nav>
    );
}
