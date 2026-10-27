import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Animates its own height when the content changes (tabs switching, an error appearing, a step finishing) so
 * surrounding layout glides instead of jumping. No animation on first paint, and none for "reduce motion"
 * (the global reduced-motion rule shortens the transition to nothing). The 4px padding/negative margin pair
 * keeps focus rings from being clipped by the overflow.
 */
export default function AutoHeight({ children, className }) {
    const inner = useRef(null);
    const [height, setHeight] = useState('auto');
    const [armed, setArmed] = useState(false);

    useLayoutEffect(() => {
        const node = inner.current;
        if (!node || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
        observer.observe(node);
        setHeight(node.offsetHeight);
        const frame = requestAnimationFrame(() => setArmed(true));
        return () => { observer.disconnect(); cancelAnimationFrame(frame); };
    }, []);

    return (
        <div
            className={`-m-1 overflow-hidden ${className ?? ''}`}
            style={{ height, transition: armed ? 'height 0.35s var(--ease-out-soft)' : 'none' }}
        >
            <div ref={inner} className="p-1">{children}</div>
        </div>
    );
}
