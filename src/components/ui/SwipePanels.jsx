import { Children, useLayoutEffect, useRef, useState } from 'react';

/**
 * Side-by-side panels on a track that slides: the old panel swipes out as the new one swipes in, and the box height
 * follows the active panel. Used for Sign in <-> Sign up. Panels stay solid (no fading); the hidden one is `inert`
 * so it cannot be tabbed into or read by screen readers. No animation on first paint; reduced motion shortens it
 * to nothing through the global rule.
 */
export default function SwipePanels({ index, children }) {
    const panels = Children.toArray(children);
    const count = panels.length;
    const refs = useRef([]);
    const [heights, setHeights] = useState([]);
    const [armed, setArmed] = useState(false);

    useLayoutEffect(() => {
        if (typeof ResizeObserver === 'undefined') return undefined;
        const measure = () => setHeights(refs.current.map((node) => node?.offsetHeight ?? 0));
        const observer = new ResizeObserver(measure);
        refs.current.forEach((node) => node && observer.observe(node));
        measure();
        const frame = requestAnimationFrame(() => setArmed(true));
        return () => { observer.disconnect(); cancelAnimationFrame(frame); };
    }, [count]);

    return (
        <div
            className="-mx-1 overflow-hidden"
            style={{ height: heights[index] || 'auto', transition: armed ? 'height 0.45s var(--ease-out-soft)' : 'none' }}
        >
            <div
                className="flex items-start"
                style={{
                    width: `${count * 100}%`,
                    transform: `translateX(-${(index * 100) / count}%)`,
                    transition: armed ? 'transform 0.5s var(--ease-out-soft)' : 'none',
                }}
            >
                {panels.map((panel, i) => (
                    <div
                        key={i}
                        ref={(node) => { refs.current[i] = node; }}
                        inert={i !== index}
                        aria-hidden={i !== index}
                        className="shrink-0 px-1"
                        style={{ width: `${100 / count}%` }}
                    >
                        {panel}
                    </div>
                ))}
            </div>
        </div>
    );
}
