import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, LogOut, Package, User } from 'lucide-react';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { loginUrl } from '@/utils/authRedirect';
import UserAvatar from '@/components/ui/UserAvatar';

const itemClass = 'flex items-center gap-3 px-4 py-2.5 text-small text-ink hover:bg-primary-soft';

export default function AccountMenu({ iconButtonClass }) {
    const { user, isAuthenticated, signOut, isSigningOut } = useCustomerSession();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const { pathname } = useLocation();

    useEffect(() => setOpen(false), [pathname]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!isAuthenticated) {
        return (
            <Link to={loginUrl()} className={iconButtonClass} aria-label="Sign in">
                <User size={20} />
            </Link>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={iconButtonClass}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <UserAvatar user={user} size="md" signedIn />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 animate-fade-in overflow-hidden rounded-lg border border-line bg-surface shadow-md">
                    <div className="border-b border-line px-4 py-3">
                        <p className="truncate text-small font-medium text-ink">{user?.name || 'Account'}</p>
                        <p className="truncate text-caption text-muted">{user?.email}</p>
                    </div>
                    <Link to="/account" role="menuitem" className={itemClass}><User size={16} /> My account</Link>
                    <Link to="/orders" role="menuitem" className={itemClass}><Package size={16} /> My orders</Link>
                    <Link to="/wishlist" role="menuitem" className={itemClass}><Heart size={16} /> Wishlist</Link>
                    <button type="button" role="menuitem" onClick={signOut} disabled={isSigningOut} className={`${itemClass} w-full border-t border-line text-danger`}>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
