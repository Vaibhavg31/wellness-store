import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname, hash } = useLocation();
    // Before paint: otherwise the new page shows for a frame at the old scroll position, then jumps.
    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);

    // A link like /club#join lands on that section. Pages draw their content a moment after arriving (pictures, prices) and that pushes
    // the section down, so the scroll is kept on target for about three seconds, and stops the moment the visitor scrolls themselves.
    useEffect(() => {
        const id = hash.slice(1);
        if (!id || id === 'reviews') return undefined; // the product page handles #reviews itself
        let ticks = 0;
        const stop = () => clearInterval(timer);
        const timer = setInterval(() => {
            ticks += 1;
            const el = document.getElementById(id);
            if (el && Math.abs(el.getBoundingClientRect().top) > 6) el.scrollIntoView({ block: 'start', behavior: 'instant' });
            if (ticks > 25) stop();
        }, 120);
        const interrupt = () => stop();
        window.addEventListener('wheel', interrupt, { passive: true, once: true });
        window.addEventListener('touchstart', interrupt, { passive: true, once: true });
        window.addEventListener('keydown', interrupt, { once: true });
        return () => {
            stop();
            window.removeEventListener('wheel', interrupt);
            window.removeEventListener('touchstart', interrupt);
            window.removeEventListener('keydown', interrupt);
        };
    }, [pathname, hash]);
    return null;
}
