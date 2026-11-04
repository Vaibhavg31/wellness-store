import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname, hash } = useLocation();
    // Before paint: otherwise the new page shows for a frame at the old scroll position, then jumps.
    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);

    // A link like /club#join lands on that section once the page has drawn it (pages load their content a moment after arriving).
    useEffect(() => {
        const id = hash.slice(1);
        if (!id || id === 'reviews') return undefined; // the product page handles #reviews itself
        let tries = 0;
        const timer = setInterval(() => {
            const el = document.getElementById(id);
            tries += 1;
            if (el) { el.scrollIntoView({ block: 'start' }); clearInterval(timer); } else if (tries > 25) clearInterval(timer);
        }, 100);
        return () => clearInterval(timer);
    }, [pathname, hash]);
    return null;
}
