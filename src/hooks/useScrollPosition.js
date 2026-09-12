import { useState, useEffect } from 'react';
export function useScrollPosition(threshold = 30) {
    const [isScrolled, setIsScrolled] = useState(false);
    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (ticking)
                return;
            ticking = true;
            requestAnimationFrame(() => {
                setIsScrolled(window.scrollY > threshold);
                ticking = false;
            });
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);
    return isScrolled;
}
