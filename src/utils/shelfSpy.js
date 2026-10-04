import { useSyncExternalStore } from 'react';

/**
 * Tiny shared store linking the homepage category shelves to the header: which shelves are on the page, which one
 * the visitor is currently reading, and a short lock while the page scrolls to a clicked shelf (so the highlight
 * doesn't flicker through every shelf it passes on the way).
 */
let state = { slugs: [], active: '', lockUntil: 0 };
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

export const shelfSpy = {
    get: () => state,
    set(patch) {
        const next = { ...state, ...patch };
        if (next.active === state.active && next.slugs.join('|') === state.slugs.join('|') && next.lockUntil === state.lockUntil) return;
        state = next;
        emit();
    },
    reset() {
        state = { slugs: [], active: '', lockUntil: 0 };
        emit();
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};

export const useShelfSpy = () => useSyncExternalStore(shelfSpy.subscribe, shelfSpy.get);

export const shelfId = (slug) => `shelf-${slug}`;

const LOCK_MS = 900;

/** Scrolls the homepage to a category's shelf and highlights it straight away. */
export function jumpToShelf(slug) {
    const node = document.getElementById(shelfId(slug));
    if (!node) return false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    shelfSpy.set({ active: slug, lockUntil: Date.now() + (reduced ? 0 : LOCK_MS) });
    node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    return true;
}
