import { useLocation } from 'react-router-dom';
import { ADMIN_PATH } from '@/contexts/AuthContext';

const AUTH_PREFIXES = ['/login', '/forgot-password', '/reset-password', '/verify-email'];

/**
 * The store, the sign-in screens and the admin are separate layouts. Moving between them swaps the whole screen, so
 * the new layout fades in from the page colour (opacity only: a transform here would break fixed-position children).
 * Moving between pages of the SAME layout keeps this wrapper, and PageTransition handles that case.
 */
export default function RouteGroup({ children }) {
    const { pathname } = useLocation();
    const group = pathname.startsWith(ADMIN_PATH) ? 'admin' : AUTH_PREFIXES.some((p) => pathname.startsWith(p)) ? 'auth' : 'store';
    return <div key={group} className="animate-fade-in">{children}</div>;
}
