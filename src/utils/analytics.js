import { ADMIN_PATH } from '@/contexts/AuthContext';
import { PREVIEW_PATH } from '@/utils/productPreview';

/**
 * First-party visitor tracking for the admin "Analytics" page. No cookies, no third parties and no personal details:
 *  - a random id kept in this browser tells one visitor from another (it is NOT linked to a person until they sign in),
 *  - a "visit" lasts until 30 minutes pass with no activity,
 *  - small events (page, product, bag, checkout, search) are batched and sent to our own server.
 * Tracking never throws and never blocks the page. Visiting any page with ?notrack=1 switches it off for that browser
 * (?notrack=0 turns it back on) — handy for the team's own phones and laptops.
 */

const VISITOR_KEY = 'chikit.vid';
const SESSION_KEY = 'chikit.sid';
const OPT_OUT_KEY = 'chikit.notrack';
const ADMIN_TOKEN_KEY = 'chikit-admin-token';
const CUSTOMER_TOKEN_KEY = 'chikit-auth-token';
const IDLE_MS = 30 * 60 * 1000;
const FLUSH_MS = 1200;
const API_BASE = import.meta.env.VITE_API_URL || '';

const memory = {};
const read = (key) => {
    try { return localStorage.getItem(key); } catch { return memory[key] ?? null; }
};
const write = (key, value) => {
    try { localStorage.setItem(key, value); } catch { memory[key] = value; }
};

const makeId = () => {
    try { return crypto.randomUUID(); } catch { /* very old browser */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
};

let queue = [];
let timer = null;
let ctxSentFor = '';
let lastPage = { path: '', at: 0 };

export function pageTypeOf(path) {
    if (path === '/' || path === '') return 'home';
    if (path === '/shop') return 'shop';
    if (path.startsWith('/category/')) return 'category';
    if (path.startsWith('/product/')) return 'product';
    if (path === '/cart') return 'cart';
    if (path === '/checkout') return 'checkout';
    if (path === '/wishlist') return 'wishlist';
    if (path === '/account') return 'account';
    if (path === '/orders' || path.startsWith('/orders/')) return 'orders';
    if (/^\/(login|forgot-password|reset-password|verify-email|verify-email-pending)$/.test(path)) return 'login';
    if (/^\/(about|contact|faq|privacy|terms|shipping-policy|refund-policy|reviews)$/.test(path)) return 'info';
    if (path === '/track-order') return 'track';
    return 'other';
}

function applyOptOutFlag() {
    try {
        const flag = new URLSearchParams(window.location.search).get('notrack');
        if (flag === '1') write(OPT_OUT_KEY, '1');
        if (flag === '0') localStorage.removeItem(OPT_OUT_KEY);
    } catch { /* ignore */ }
}

function disabled() {
    if (typeof window === 'undefined') return true;
    applyOptOutFlag();
    if (navigator.doNotTrack === '1' || read(OPT_OUT_KEY) === '1') return true;
    // The team browsing their own store while signed in as admin is not a shopper.
    if (read(ADMIN_TOKEN_KEY)) return true;
    const path = window.location.pathname;
    return path.startsWith(ADMIN_PATH) || path.startsWith(PREVIEW_PATH);
}

function deviceKind() {
    const width = window.innerWidth;
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (width < 768) return 'phone';
    if (width < 1100 && touch) return 'tablet';
    return 'desktop';
}

function sessionContext(isNewVisitor) {
    const params = new URLSearchParams(window.location.search);
    let referrerHost = '';
    try {
        const url = document.referrer ? new URL(document.referrer) : null;
        if (url && url.host !== window.location.host) referrerHost = url.hostname;
    } catch { /* ignore */ }
    return {
        referrerHost,
        utmSource: params.get('utm_source') || '',
        campaign: params.get('utm_campaign') || params.get('utm_medium') || '',
        device: deviceKind(),
        isNew: isNewVisitor,
    };
}

/** Current visitor + visit, creating them (or starting a fresh visit after 30 idle minutes) as needed. */
function identity() {
    const now = Date.now();
    let visitorId = read(VISITOR_KEY);
    let isNewVisitor = false;
    if (!visitorId) {
        visitorId = makeId();
        write(VISITOR_KEY, visitorId);
        isNewVisitor = true;
    }

    let session = null;
    try { session = JSON.parse(read(SESSION_KEY) || 'null'); } catch { /* start fresh */ }
    let fresh = false;
    if (!session?.id || now - (session.last || 0) > IDLE_MS) {
        session = { id: makeId(), isNew: isNewVisitor };
        fresh = true;
    }
    session.last = now;
    write(SESSION_KEY, JSON.stringify(session));
    return { visitorId, sessionId: session.id, fresh, isNewVisitor: session.isNew };
}

function flush() {
    timer = null;
    if (queue.length === 0) return;
    const events = queue.splice(0, 25);
    try {
        const { visitorId, sessionId, isNewVisitor } = identity();
        const body = { visitorId, sessionId, events };
        if (ctxSentFor !== sessionId) {
            body.ctx = sessionContext(isNewVisitor);
            ctxSentFor = sessionId;
        }
        const headers = { 'Content-Type': 'application/json' };
        const token = read(CUSTOMER_TOKEN_KEY);
        if (token) headers.Authorization = `Bearer ${token}`;
        fetch(`${API_BASE}/api/track`, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true }).catch(() => {});
    } catch { /* tracking must never break the shop */ }
    if (queue.length > 0) schedule();
}

function schedule() {
    if (timer === null) timer = setTimeout(flush, FLUSH_MS);
}

/** Records one step. `fields`: path, pageType, productId, value, qty, label. */
export function trackEvent(type, fields = {}) {
    try {
        if (disabled()) return;
        identity(); // keeps the visit alive and starts a new one after a long pause
        queue.push({ type, ...fields });
        schedule();
    } catch { /* ignore */ }
}

export function trackPageView(rawPath) {
    const path = (rawPath || '/').replace(/\/+$/, '') || '/';
    const now = Date.now();
    if (path === lastPage.path && now - lastPage.at < 800) return; // dev double-render / instant re-navigation
    lastPage = { path, at: now };
    trackEvent('page_view', { path, pageType: pageTypeOf(path) });
}

/** The ids the server needs to credit an order to the right visit (undefined when this browser is not tracked). */
export function getAnalyticsIds() {
    try {
        if (disabled()) return undefined;
        const { visitorId, sessionId } = identity();
        return { visitorId, sessionId };
    } catch {
        return undefined;
    }
}

// Send whatever is waiting when the visitor leaves or switches tabs.
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && queue.length > 0) {
            if (timer !== null) clearTimeout(timer);
            flush();
        }
    });
}
