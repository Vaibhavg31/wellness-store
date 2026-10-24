import { useLocation } from 'react-router-dom';
import { ADMIN_PATH } from '@/contexts/AuthContext';

const AUTH_PREFIXES = ['/login', '/forgot-password', '/reset-password', '/verify-email'];

/**
 * The store, the sign-in screens and the admin are separate layouts. Moving between them swaps the whole screen
 * cleanly (no fading through a blank frame): each layout brings its own entrance (sign-in cards swipe in, store and
 * admin pages rise in). The key just makes React treat each layout as a fresh tree.
 */
export default function RouteGroup({ children }) {
    const { pathname } = useLocation();
    const group = pathname.startsWith(ADMIN_PATH) ? 'admin' : AUTH_PREFIXES.some((p) => pathname.startsWith(p)) ? 'auth' : 'store';
    return <div key={group}>{children}</div>;
}
