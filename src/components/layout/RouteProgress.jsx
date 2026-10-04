import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const MIN_VISIBLE_MS = 380;
const GIVE_UP_MS = 10000;

/** Same-origin link click that would change the page (not a new tab, download, hash jump or modified click). */
function isPageNavigation(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return false;
    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}

/**
 * Thin brand-coloured bar at the very top: starts the instant an in-app link is clicked (so a slow page chunk
 * feels responsive) and completes when the new route has rendered. Transform + opacity only.
 */
export default function RouteProgress() {
    const { pathname } = useLocation();
    const [phase, setPhase] = useState('idle'); // idle → running → done → idle
    const startedAt = useRef(0);
    const timers = useRef([]);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };

    const start = () => {
        clearTimers();
        startedAt.current = performance.now();
        setPhase('running');
        timers.current.push(setTimeout(() => setPhase('idle'), GIVE_UP_MS)); // navigation never landed
    };

    useEffect(() => {
        // Capture phase sees the click before the router does. The router then calls preventDefault() to take the
        // navigation over in-app; by the next tick, a prevented click on a page link means a route change is under way.
        const onClick = (event) => {
            if (isPageNavigation(event)) setTimeout(() => { if (event.defaultPrevented) start(); }, 0);
        };
        const onPopState = () => start();
        document.addEventListener('click', onClick, true);
        window.addEventListener('popstate', onPopState);
        return () => {
            document.removeEventListener('click', onClick, true);
            window.removeEventListener('popstate', onPopState);
            clearTimers();
        };
    }, []);

    // The route changed: let the bar be seen for a moment, then finish it.
    useEffect(() => {
        if (startedAt.current === 0) return undefined;
        clearTimers();
        const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt.current));
        timers.current.push(setTimeout(() => {
            setPhase('done');
            timers.current.push(setTimeout(() => { setPhase('idle'); startedAt.current = 0; }, 450));
        }, wait));
        return clearTimers;
    }, [pathname]);

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-[3px]">
            <div
                className="h-full origin-left bg-primary"
                style={{
                    transform: `scaleX(${phase === 'running' ? 0.78 : phase === 'done' ? 1 : 0})`,
                    opacity: phase === 'running' ? 1 : 0,
                    transition: phase === 'running'
                        ? 'transform 7s cubic-bezier(0.1, 0.7, 0.2, 1), opacity 0.15s'
                        : phase === 'done'
                            ? 'transform 0.25s ease-out, opacity 0.35s ease-out 0.2s'
                            : 'none',
                }}
            />
        </div>
    );
}
