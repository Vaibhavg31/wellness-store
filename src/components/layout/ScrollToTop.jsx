import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORE_KEY = 'chikit-scroll';
const readPositions = () => {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
};
const positions = typeof window === 'undefined' ? {} : readPositions();
const savePositions = () => {
    try {
        const keys = Object.keys(positions);
        if (keys.length > 60) keys.slice(0, keys.length - 60).forEach((k) => delete positions[k]);
        sessionStorage.setItem(STORE_KEY, JSON.stringify(positions));
    } catch { /* private mode: positions still work for this tab */ }
};

/**
 * Back/Forward: scroll to the saved position, retrying while the page's content loads (about 2.5 seconds at most), and
 * stopping the moment the visitor scrolls, taps or types. Lives outside React so a re-run of the effect cannot stop it.
 */
const restoring = {
    active: false,
    timer: 0,
    stopOnInput: null,
    cancel() {
        window.clearTimeout(this.timer);
        if (this.stopOnInput) {
            window.removeEventListener('wheel', this.stopOnInput);
            window.removeEventListener('touchstart', this.stopOnInput);
            window.removeEventListener('keydown', this.stopOnInput);
            this.stopOnInput = null;
        }
        this.active = false;
    },
    start(target) {
        this.cancel();
        this.active = true;
        this.stopOnInput = () => this.cancel();
        window.addEventListener('wheel', this.stopOnInput, { passive: true });
        window.addEventListener('touchstart', this.stopOnInput, { passive: true });
        window.addEventListener('keydown', this.stopOnInput);
        let ticks = 0;
        const attempt = () => {
            const reachable = document.documentElement.scrollHeight - window.innerHeight >= target - 2;
            window.scrollTo({ top: target, left: 0, behavior: 'instant' });
            ticks += 1;
            if ((reachable && Math.abs(window.scrollY - target) < 3) || ticks > 30) { this.cancel(); return; }
            this.timer = window.setTimeout(attempt, 80);
        };
        attempt();
    },
};

/**
 * A new page opens at the top. Going Back or Forward returns to where the visitor was on that page (the browser cannot do
 * this itself here, because the page's lists and pictures load after it arrives, so it is done by hand and retried
 * until the page is tall enough). A link with #section lands on that section.
 */
export default function ScrollToTop() {
    const location = useLocation();
    const { pathname, hash, key } = location;
    const navigationType = useNavigationType();

    useEffect(() => {
        if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    }, []);

    // Which history entry the scroll belongs to. Switched (below) in the same moment the page changes, so a scroll caused by
    // the page change itself is never written into the previous page's position. null until the first page is shown.
    const currentKey = useRef(null);
    const lastPath = useRef(null);
    const leaving = useRef(false);

    // Remember the position while the visitor scrolls (and when the tab is hidden or closed). Not while a Back/Forward
    // restore is still in progress: the page is not tall enough yet, and the half-way position must not replace the target.
    useEffect(() => {
        let frame = 0;
        const remember = () => {
            frame = 0;
            if (!restoring.active && !leaving.current && currentKey.current) positions[currentKey.current] = Math.round(window.scrollY);
        };
        // The moment a navigation starts (a link, Back/Forward, or any code that changes the address), note where the
        // visitor is and stop recording: while the next page loads the old one can get shorter, and the browser then pulls
        // the scroll up, which must not be taken as the visitor's position.
        const markLeaving = () => {
            if (leaving.current || !currentKey.current) return;
            positions[currentKey.current] = Math.round(window.scrollY);
            leaving.current = true;
            // Code that edits the address without changing the page (no new history entry) must not stop recording for good.
            window.setTimeout(() => { leaving.current = false; }, 3000);
        };
        const { pushState, replaceState } = window.history;
        window.history.pushState = function patchedPush(...args) { markLeaving(); return pushState.apply(this, args); };
        window.history.replaceState = function patchedReplace(...args) { markLeaving(); return replaceState.apply(this, args); };
        window.addEventListener('popstate', markLeaving, true);
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(remember); };
        const persist = () => { remember(); savePositions(); };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pagehide', persist);
        return () => {
            window.history.pushState = pushState;
            window.history.replaceState = replaceState;
            window.removeEventListener('popstate', markLeaving, true);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pagehide', persist);
            if (frame) cancelAnimationFrame(frame);
            savePositions();
        };
    }, []);

    // Before paint: otherwise the new page shows for a frame at the old scroll position, then jumps. Runs its work once per
    // history entry: React may re-run this effect for the same entry (a page still loading its code suspends and resumes),
    // and that must not restart or cut short what was started.
    useLayoutEffect(() => {
        if (currentKey.current === key) return;
        const firstPage = currentKey.current === null;
        currentKey.current = key;
        leaving.current = false;
        const pathChanged = !firstPage && lastPath.current !== pathname;
        lastPath.current = pathname;
        restoring.cancel();

        const target = navigationType === 'POP' ? positions[key] : undefined;
        if (!target) {
            // Only a new page goes to the top: a filter or search that only changes ?query keeps the visitor where they are.
            if (pathChanged) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            return;
        }
        restoring.start(target);
    }, [key, pathname, navigationType]);

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
