import { useEffect, useState } from 'react';

/**
 * 'down' once the visitor has scrolled past `offset` and is moving down, 'up' when moving up (or near the top).
 * Small jitters are ignored. rAF-throttled and passive, so it costs nothing while scrolling.
 */
export function useScrollDirection({ offset = 140, tolerance = 10 } = {}) {
    const [direction, setDirection] = useState('up');
    useEffect(() => {
        let last = window.scrollY;
        let frame = 0;
        const update = () => {
            frame = 0;
            // Clamp to the real scroll range: the elastic bounce past the top/bottom on phones is not a direction change.
            const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const y = Math.min(Math.max(window.scrollY, 0), max);
            if (y < offset) setDirection('up');
            else if (y > last + tolerance) setDirection('down');
            else if (y < last - tolerance) setDirection('up');
            if (Math.abs(y - last) > tolerance) last = y;
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
    }, [offset, tolerance]);
    return direction;
}
