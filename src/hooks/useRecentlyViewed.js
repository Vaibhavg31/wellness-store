const STORAGE_KEY = 'wellness-recently-viewed';
const MAX_ITEMS = 12;

function readIds() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        return Array.isArray(ids) ? ids : [];
    } catch {
        return [];
    }
}

function writeIds(ids) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // Private browsing / quota exceeded — recently-viewed is a nice-to-have,
        // never worth surfacing an error over.
    }
}

/**
 * Records `productId` as just-viewed: most-recent-first, deduped (re-viewing
 * a product moves it back to the front rather than creating a second entry),
 * capped at MAX_ITEMS so the list never grows unbounded in localStorage.
 * Call once per product-detail page view.
 */
export function recordProductView(productId) {
    if (!productId) return;
    const ids = readIds().filter((id) => id !== productId);
    ids.unshift(productId);
    writeIds(ids.slice(0, MAX_ITEMS));
}

/**
 * Returns the recently-viewed id list, most-recent-first. Deliberately a
 * plain function (not a hook/subscription) — the list only needs to be
 * fresh at mount/navigation time, not live-synced across open tabs, so
 * callers just read it once (see RecentlyViewed.jsx) rather than paying for
 * a storage-event listener no one needs.
 */
export function getRecentlyViewedIds() {
    return readIds();
}
