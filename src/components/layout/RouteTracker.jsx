import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/utils/analytics';

/** Reports each page the visitor opens to the (first-party) analytics. Renders nothing. */
export default function RouteTracker() {
    const { pathname } = useLocation();
    useEffect(() => {
        trackPageView(pathname);
    }, [pathname]);
    return null;
}
