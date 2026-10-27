import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const MIN_VISIBLE_MS = 300;
const GIVE_UP_MS = 10000;

/**
 * Thin brand-coloured bar at the very top. It starts the instant the app changes page (any link, the back button, or
 * a redirect after sign-in: they all go through history.pushState / popstate) and completes when the new page has
 * rendered. While it runs the OLD page stays on screen, so a slow page chunk never shows a blank loading screen.
 * Transform + opacity only.
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
        const originalPush = window.history.pushState;
        const originalReplace = window.history.replaceState;
        const wrap = (original) => function changeHistory(state, title, url) {
            try {
                if (url != null && new URL(url, window.location.href).pathname !== window.location.pathname) start();
            } catch { /* malformed URL: the router will deal with it */ }
            return original.apply(this, arguments);
        };
        window.history.pushState = wrap(originalPush);
        window.history.replaceState = wrap(originalReplace);
        const onPopState = () => start();
        window.addEventListener('popstate', onPopState);
        return () => {
            window.history.pushState = originalPush;
            window.history.replaceState = originalReplace;
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
