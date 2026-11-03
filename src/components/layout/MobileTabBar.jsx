import { Link, NavLink, useLocation } from 'react-router-dom';
import { Crown, Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { loginUrl } from '@/utils/authRedirect';
import { cn } from '@/utils/formatPrice';

const tab = 'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors';

/**
 * The phone's bottom tab bar (the way shopping apps work): Home, Shop, Club in the middle as a raised crown, Bag and Account.
 * It steps aside on pages that bring their own bottom bar (a product's buy bar, the offer box, checkout).
 */
export default function MobileTabBar() {
    const { pathname } = useLocation();
    const { itemCount, openCartDrawer, isMember } = useCart();
    const { isAuthenticated } = useAuth();
    if (pathname.startsWith('/product/') || pathname.startsWith('/offers/') || pathname.startsWith('/checkout')) return null;

    const active = ({ isActive }) => cn(tab, isActive ? 'text-primary' : 'text-muted');
    return (
        <nav aria-label="Quick navigation" className="safe-area-pb fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/96 pb-1 shadow-[0_-8px_24px_rgb(56_18_58/0.08)] backdrop-blur lg:hidden">
            <div className="flex items-end px-2">
                <NavLink to="/" end className={active}><Home size={21} aria-hidden="true" />Home</NavLink>
                <NavLink to="/shop" className={active}><LayoutGrid size={21} aria-hidden="true" />Shop</NavLink>
                <Link to="/club" className="relative flex flex-1 flex-col items-center justify-end gap-0.5 pb-1.5 text-[11px] font-bold text-primary-deep" aria-label={isMember ? 'My Club card' : 'Join the Club'}>
                    <span className="-mt-6 grid size-12 place-items-center rounded-full bg-primary text-gold-soft shadow-lg ring-4 ring-surface"><Crown size={22} aria-hidden="true" /></span>
                    {isMember ? 'My Club' : 'Club'}
                </Link>
                <button type="button" onClick={openCartDrawer} className={cn(tab, 'text-muted')}>
                    <span className="relative"><ShoppingBag size={21} aria-hidden="true" />{itemCount > 0 && <span className="absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">{itemCount}</span>}</span>
                    Bag
                </button>
                <NavLink to={isAuthenticated ? '/account' : loginUrl('/account')} className={active}><User size={21} aria-hidden="true" />{isAuthenticated ? 'Account' : 'Sign in'}</NavLink>
            </div>
        </nav>
    );
}
