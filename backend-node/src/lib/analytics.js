import { getPool } from './db.js';

/**
 * First-party visitor analytics. No third-party scripts, no IP addresses stored: a browser gets a random visitor id,
 * each visit is a "session" (a new one after 30 idle minutes), and every step that matters becomes one small event.
 * When a visitor signs in, their earlier anonymous visits are attached to that customer.
 *
 * All timestamps are stored in UTC (like the rest of the database) and reported in India time.
 */

const IST_OFFSET_MIN = 330;
const SESSION_IDLE_MINUTES = 30;
const RETENTION_DAYS = 180;

// What the browser may report. `purchase` and `purchase_item` are recorded by the server when an order really exists.
const CLIENT_EVENTS = new Set([
    'page_view', 'product_view', 'add_to_cart', 'remove_from_cart', 'cart_open', 'wishlist_add', 'search', 'checkout_start', 'checkout_form',
]);
const PAGE_TYPES = new Set([
    'home', 'shop', 'category', 'product', 'cart', 'checkout', 'wishlist', 'account', 'orders', 'login', 'info', 'track', 'other',
]);
const DEVICES = new Set(['phone', 'tablet', 'desktop']);
const ID_PATTERN = /^[A-Za-z0-9_-]{8,48}$/;
const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const pad = (n) => String(n).padStart(2, '0');
export const toDbTime = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;

// ── Schema ────────────────────────────────────────────────────────────────────
// Created on first use, so a live database that was set up before analytics existed needs no manual migration.
let schemaReady = null;
export function ensureAnalyticsSchema() {
    if (!schemaReady) {
        const pool = getPool();
        schemaReady = (async () => {
            await pool.query(`CREATE TABLE IF NOT EXISTS analytics_sessions (
                session_id varchar(48) NOT NULL,
                visitor_id varchar(48) NOT NULL,
                user_id varchar(64) DEFAULT NULL,
                started_at datetime NOT NULL,
                last_seen_at datetime NOT NULL,
                landing_path varchar(255) DEFAULT NULL,
                landing_type varchar(24) DEFAULT NULL,
                exit_path varchar(255) DEFAULT NULL,
                exit_type varchar(24) DEFAULT NULL,
                source varchar(40) NOT NULL DEFAULT 'direct',
                referrer_host varchar(120) DEFAULT NULL,
                campaign varchar(80) DEFAULT NULL,
                device varchar(12) NOT NULL DEFAULT 'desktop',
                is_new tinyint(1) NOT NULL DEFAULT 0,
                page_views int unsigned NOT NULL DEFAULT 0,
                product_views int unsigned NOT NULL DEFAULT 0,
                carted tinyint(1) NOT NULL DEFAULT 0,
                checkout tinyint(1) NOT NULL DEFAULT 0,
                checkout_form tinyint(1) NOT NULL DEFAULT 0,
                purchased tinyint(1) NOT NULL DEFAULT 0,
                cart_value decimal(12,2) NOT NULL DEFAULT 0,
                order_value decimal(12,2) NOT NULL DEFAULT 0,
                PRIMARY KEY (session_id),
                KEY idx_analytics_sessions_started (started_at),
                KEY idx_analytics_sessions_visitor (visitor_id),
                KEY idx_analytics_sessions_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One row per website visit (anonymous until the visitor signs in)'`);
            await pool.query(`CREATE TABLE IF NOT EXISTS analytics_events (
                id bigint unsigned NOT NULL AUTO_INCREMENT,
                created_at datetime NOT NULL,
                session_id varchar(48) NOT NULL,
                visitor_id varchar(48) NOT NULL,
                event_type varchar(24) NOT NULL,
                page_type varchar(24) DEFAULT NULL,
                path varchar(255) DEFAULT NULL,
                product_id varchar(64) DEFAULT NULL,
                value decimal(12,2) DEFAULT NULL,
                qty int DEFAULT NULL,
                label varchar(160) DEFAULT NULL,
                PRIMARY KEY (id),
                KEY idx_analytics_events_created (created_at),
                KEY idx_analytics_events_session (session_id, id),
                KEY idx_analytics_events_type (event_type, created_at),
                KEY idx_analytics_events_product (product_id, event_type, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Funnel steps: page views, product views, bag adds, checkout, purchases'`);
        })().catch((err) => {
            schemaReady = null; // try again on the next request
            throw err;
        });
    }
    return schemaReady;
}

// ── Where did the visitor come from? ─────────────────────────────────────────
const SOURCE_RULES = [
    [/google\./i, 'google'],
    [/bing\.|duckduckgo|yahoo\.|ecosia|startpage|brave\.com|yandex/i, 'other-search'],
    [/instagram|(^|\.)ig(\.|$)|l\.instagram/i, 'instagram'],
    [/facebook|(^|\.)fb(\.|$)|fb\.me|meta\.com/i, 'facebook'],
    [/whatsapp|(^|\.)wa(\.|$)|wa\.me/i, 'whatsapp'],
    [/youtube|youtu\.be/i, 'youtube'],
    [/twitter|(^|\.)t\.co$|(^|\.)x\.com$/i, 'x'],
    [/linkedin|lnkd\.in/i, 'linkedin'],
    [/mail|newsletter|brevo|sendinblue|mailchimp/i, 'email'],
];

export function classifySource({ utmSource = '', referrerHost = '', siteHost = '' }) {
    const utm = utmSource.toLowerCase();
    if (utm) {
        const rule = SOURCE_RULES.find(([pattern]) => pattern.test(utm));
        return rule ? rule[1] : 'campaign';
    }
    const host = referrerHost.toLowerCase().replace(/^www\./, '');
    if (!host) return 'direct';
    if (siteHost && host === siteHost.toLowerCase().replace(/^www\./, '')) return 'direct';
    const rule = SOURCE_RULES.find(([pattern]) => pattern.test(host));
    return rule ? rule[1] : 'other';
}

// ── Recording ────────────────────────────────────────────────────────────────
function cleanEvent(raw) {
    if (!raw || typeof raw !== 'object' || !CLIENT_EVENTS.has(raw.type)) return null;
    const pageType = PAGE_TYPES.has(raw.pageType) ? raw.pageType : null;
    const productId = typeof raw.productId === 'string' && PRODUCT_ID_PATTERN.test(raw.productId) ? raw.productId : null;
    return {
        type: raw.type,
        pageType,
        path: text(raw.path, 255) || null,
        productId,
        value: raw.value === undefined ? null : Math.max(0, Math.min(10_000_000, num(raw.value))),
        qty: raw.qty === undefined ? null : Math.max(0, Math.min(100_000, Math.round(num(raw.qty)))),
        label: text(raw.label, 160) || null,
    };
}

/**
 * Stores one browser's batch of events and keeps its session row up to date.
 * `userId` (when the visitor is signed in) also claims every earlier anonymous visit from the same browser.
 */
export async function recordEvents({ visitorId, sessionId, userId = null, ctx = {}, events = [], siteHost = '' }) {
    if (!ID_PATTERN.test(visitorId || '') || !ID_PATTERN.test(sessionId || '')) return 0;
    const clean = (Array.isArray(events) ? events.slice(0, 25) : []).map(cleanEvent).filter(Boolean);
    if (clean.length === 0 && !userId) return 0;

    await ensureAnalyticsSchema();
    const pool = getPool();
    const now = toDbTime(new Date());

    if (clean.length > 0) {
        await pool.query(
            'INSERT INTO analytics_events (created_at, session_id, visitor_id, event_type, page_type, path, product_id, value, qty, label) VALUES ?',
            [clean.map((e) => [now, sessionId, visitorId, e.type, e.pageType, e.path, e.productId, e.value, e.qty, e.label])],
        );

        const views = clean.filter((e) => e.type === 'page_view');
        const firstPage = views[0] ?? clean.find((e) => e.path) ?? {};
        const lastPage = views.at(-1);
        const referrerHost = text(ctx.referrerHost, 120).toLowerCase();
        const utmSource = text(ctx.utmSource, 60);
        const device = DEVICES.has(ctx.device) ? ctx.device : 'desktop';
        const source = classifySource({ utmSource, referrerHost, siteHost });
        const cartAdds = clean.filter((e) => e.type === 'add_to_cart');

        await pool.query(
            `INSERT INTO analytics_sessions
                (session_id, visitor_id, user_id, started_at, last_seen_at, landing_path, landing_type, exit_path, exit_type, source, referrer_host, campaign, device, is_new,
                 page_views, product_views, carted, checkout, checkout_form, cart_value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                last_seen_at = VALUES(last_seen_at),
                user_id = COALESCE(user_id, VALUES(user_id)),
                exit_path = COALESCE(VALUES(exit_path), exit_path),
                exit_type = COALESCE(VALUES(exit_type), exit_type),
                page_views = page_views + VALUES(page_views),
                product_views = product_views + VALUES(product_views),
                carted = GREATEST(carted, VALUES(carted)),
                checkout = GREATEST(checkout, VALUES(checkout)),
                checkout_form = GREATEST(checkout_form, VALUES(checkout_form)),
                cart_value = cart_value + VALUES(cart_value)`,
            [
                sessionId, visitorId, userId, now, now,
                firstPage.path ?? null, firstPage.pageType ?? null, lastPage?.path ?? null, lastPage?.pageType ?? null,
                source, referrerHost || null, text(ctx.campaign, 80) || null, device, ctx.isNew ? 1 : 0,
                views.length,
                clean.filter((e) => e.type === 'product_view').length,
                cartAdds.length > 0 ? 1 : 0,
                clean.some((e) => e.type === 'checkout_start' || e.type === 'checkout_form') ? 1 : 0,
                clean.some((e) => e.type === 'checkout_form') ? 1 : 0,
                cartAdds.reduce((sum, e) => sum + (e.value ?? 0), 0),
            ],
        );
    }

    if (userId) {
        await pool.query('UPDATE analytics_sessions SET user_id = ? WHERE visitor_id = ? AND user_id IS NULL', [userId, visitorId]);
    }

    if (Math.random() < 0.002) await pruneOldAnalytics();
    return clean.length;
}

/** Called when an order really exists, so the funnel's last step cannot be faked or lost to an ad blocker. */
export async function recordPurchase({ visitorId, sessionId, userId = null, order }) {
    if (!ID_PATTERN.test(visitorId || '') || !ID_PATTERN.test(sessionId || '') || !order?.id) return false;
    await ensureAnalyticsSchema();
    const pool = getPool();

    const [existing] = await pool.query("SELECT 1 FROM analytics_events WHERE event_type = 'purchase' AND label = ? LIMIT 1", [String(order.id)]);
    if (existing.length > 0) return false;

    const now = toDbTime(new Date());
    const total = Math.max(0, num(order.total));
    const items = Array.isArray(order.items) ? order.items : [];
    const rows = [[now, sessionId, visitorId, 'purchase', 'checkout', '/checkout', null, total, items.reduce((s, i) => s + num(i.quantity, 1), 0), String(order.id)]];
    for (const item of items) {
        const productId = typeof item.productId === 'string' && PRODUCT_ID_PATTERN.test(item.productId) ? item.productId : null;
        if (!productId) continue;
        rows.push([now, sessionId, visitorId, 'purchase_item', 'checkout', '/checkout', productId, Math.max(0, num(item.price) * num(item.quantity, 1)), num(item.quantity, 1), String(order.id)]);
    }
    await pool.query('INSERT INTO analytics_events (created_at, session_id, visitor_id, event_type, page_type, path, product_id, value, qty, label) VALUES ?', [rows]);

    await pool.query(
        `INSERT INTO analytics_sessions (session_id, visitor_id, user_id, started_at, last_seen_at, purchased, order_value)
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE purchased = 1, order_value = order_value + VALUES(order_value), last_seen_at = VALUES(last_seen_at), user_id = COALESCE(user_id, VALUES(user_id))`,
        [sessionId, visitorId, userId, now, now, total],
    );
    if (userId) await pool.query('UPDATE analytics_sessions SET user_id = ? WHERE visitor_id = ? AND user_id IS NULL', [userId, visitorId]);
    return true;
}

async function pruneOldAnalytics() {
    try {
        const pool = getPool();
        const cutoff = toDbTime(new Date(Date.now() - RETENTION_DAYS * 86_400_000));
        await pool.query('DELETE FROM analytics_events WHERE created_at < ?', [cutoff]);
        await pool.query('DELETE FROM analytics_sessions WHERE last_seen_at < ?', [cutoff]);
    } catch {
        // housekeeping only
    }
}

/** Wipes everything, or — with `testOnly` — just the visits whose visitor id starts with "qa-" (used by our own test scripts). */
export async function clearAnalytics({ testOnly = false } = {}) {
    await ensureAnalyticsSchema();
    const pool = getPool();
    if (testOnly) {
        await pool.query("DELETE FROM analytics_events WHERE visitor_id LIKE 'qa-%'");
        await pool.query("DELETE FROM analytics_sessions WHERE visitor_id LIKE 'qa-%'");
        return;
    }
    await pool.query('TRUNCATE TABLE analytics_events');
    await pool.query('TRUNCATE TABLE analytics_sessions');
}

// ── Reporting ────────────────────────────────────────────────────────────────
const RANGE_DAYS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };

/** India-time midnight of the day `daysAgo` days back, as a UTC Date. */
function istMidnightUtc(daysAgo) {
    const shifted = new Date(Date.now() + IST_OFFSET_MIN * 60_000);
    const dayStart = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
    return new Date(dayStart - IST_OFFSET_MIN * 60_000 - daysAgo * 86_400_000);
}

export function resolveRange(key) {
    const days = RANGE_DAYS[key] ?? 7;
    const start = istMidnightUtc(days - 1);
    const end = new Date(Date.now() + 60_000);
    const previousStart = new Date(start.getTime() - days * 86_400_000);
    return { key: RANGE_DAYS[key] ? key : '7d', days, start, end, previousStart };
}

const IST = `INTERVAL ${IST_OFFSET_MIN} MINUTE`;
const n = (value) => Number(value) || 0;

async function kpis(pool, from, to) {
    const [[s]] = await pool.query(
        `SELECT COUNT(DISTINCT visitor_id) visitors, COUNT(*) sessions,
                COUNT(DISTINCT CASE WHEN is_new = 1 THEN visitor_id END) newVisitors,
                COALESCE(SUM(page_views), 0) pageViews,
                COALESCE(SUM(page_views <= 1), 0) bounced,
                COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN visitor_id END) known,
                COUNT(DISTINCT CASE WHEN purchased = 1 THEN visitor_id END) buyers
           FROM analytics_sessions WHERE started_at >= ? AND started_at < ?`,
        [from, to],
    );
    const [[o]] = await pool.query(
        "SELECT COUNT(*) orders, COALESCE(SUM(value), 0) revenue FROM analytics_events WHERE event_type = 'purchase' AND created_at >= ? AND created_at < ?",
        [from, to],
    );
    return {
        visitors: n(s.visitors), sessions: n(s.sessions), newVisitors: n(s.newVisitors), returningVisitors: Math.max(0, n(s.visitors) - n(s.newVisitors)),
        pageViews: n(s.pageViews), bounced: n(s.bounced), known: n(s.known), buyers: n(s.buyers),
        orders: n(o.orders), revenue: n(o.revenue),
    };
}

export async function buildOverview(rangeKey) {
    await ensureAnalyticsSchema();
    const pool = getPool();
    const range = resolveRange(rangeKey);
    const from = toDbTime(range.start);
    const to = toDbTime(range.end);
    const prevFrom = toDbTime(range.previousStart);
    const liveSince = toDbTime(new Date(Date.now() - 5 * 60_000));

    const [
        current, previous, [[funnel]], [dailyRows], [hourRows], [pageViewRows], [pageExitRows], [productRows], [productExitRows],
        [sourceRows], [deviceRows], [campaignRows], [searchRows], [sessionRows], [[abandoned]], [[live]], [liveRows], [[tracking]],
    ] = await Promise.all([
        kpis(pool, from, to),
        kpis(pool, prevFrom, from),
        pool.query(
            `SELECT COUNT(*) visited,
                    COALESCE(SUM(pv OR c OR cs OR cf OR p), 0) looked,
                    COALESCE(SUM(c OR cs OR cf OR p), 0) carted,
                    COALESCE(SUM(cs OR cf OR p), 0) checkout,
                    COALESCE(SUM(cf OR p), 0) form,
                    COALESCE(SUM(p), 0) bought
               FROM (SELECT visitor_id, MAX(product_views > 0) pv, MAX(carted) c, MAX(checkout) cs, MAX(checkout_form) cf, MAX(purchased) p
                       FROM analytics_sessions WHERE started_at >= ? AND started_at < ? GROUP BY visitor_id) t`,
            [from, to],
        ),
        pool.query(
            `SELECT DATE(DATE_ADD(started_at, ${IST})) d, COUNT(DISTINCT visitor_id) visitors, COUNT(*) sessions, SUM(carted) carts, SUM(purchased) orders
               FROM analytics_sessions WHERE started_at >= ? AND started_at < ? GROUP BY d ORDER BY d`,
            [from, to],
        ),
        pool.query(
            `SELECT HOUR(DATE_ADD(started_at, ${IST})) h, COUNT(*) sessions FROM analytics_sessions WHERE started_at >= ? AND started_at < ? GROUP BY h`,
            [from, to],
        ),
        pool.query(
            `SELECT CASE WHEN page_type = 'product' THEN '/product/*' ELSE path END p, MIN(page_type) pt, COUNT(*) views, COUNT(DISTINCT visitor_id) visitors
               FROM analytics_events WHERE event_type = 'page_view' AND path IS NOT NULL AND created_at >= ? AND created_at < ? GROUP BY p`,
            [from, to],
        ),
        pool.query(
            `SELECT CASE WHEN exit_type = 'product' THEN '/product/*' ELSE exit_path END p,
                    COUNT(*) exits, SUM(purchased = 0) lost, SUM(page_views <= 1) bounces
               FROM analytics_sessions WHERE exit_path IS NOT NULL AND started_at >= ? AND started_at < ? GROUP BY p`,
            [from, to],
        ),
        pool.query(
            `SELECT product_id id,
                    SUM(event_type = 'product_view') views,
                    COUNT(DISTINCT CASE WHEN event_type = 'product_view' THEN visitor_id END) viewers,
                    SUM(event_type = 'add_to_cart') adds,
                    COUNT(DISTINCT CASE WHEN event_type = 'add_to_cart' THEN visitor_id END) adders,
                    SUM(event_type = 'wishlist_add') wishes,
                    SUM(event_type = 'purchase_item') orders,
                    COALESCE(SUM(CASE WHEN event_type = 'purchase_item' THEN qty END), 0) units,
                    COALESCE(SUM(CASE WHEN event_type = 'purchase_item' THEN value END), 0) revenue
               FROM analytics_events WHERE product_id IS NOT NULL AND created_at >= ? AND created_at < ?
              GROUP BY product_id ORDER BY views DESC, adds DESC LIMIT 40`,
            [from, to],
        ),
        pool.query(
            `SELECT SUBSTRING_INDEX(exit_path, '/', -1) id, COUNT(*) exits
               FROM analytics_sessions WHERE exit_type = 'product' AND purchased = 0 AND started_at >= ? AND started_at < ? GROUP BY id`,
            [from, to],
        ),
        pool.query(
            `SELECT source k, COUNT(DISTINCT visitor_id) visitors, COUNT(*) sessions, SUM(carted) carts, SUM(checkout OR checkout_form) checkouts, SUM(purchased) orders
               FROM analytics_sessions WHERE started_at >= ? AND started_at < ? GROUP BY source ORDER BY visitors DESC`,
            [from, to],
        ),
        pool.query(
            `SELECT device k, COUNT(DISTINCT visitor_id) visitors, COUNT(*) sessions, SUM(carted) carts, SUM(checkout OR checkout_form) checkouts, SUM(purchased) orders
               FROM analytics_sessions WHERE started_at >= ? AND started_at < ? GROUP BY device ORDER BY visitors DESC`,
            [from, to],
        ),
        pool.query(
            `SELECT campaign k, COUNT(DISTINCT visitor_id) visitors, SUM(carted) carts, SUM(purchased) orders
               FROM analytics_sessions WHERE campaign IS NOT NULL AND started_at >= ? AND started_at < ? GROUP BY campaign ORDER BY visitors DESC LIMIT 10`,
            [from, to],
        ),
        pool.query(
            `SELECT LOWER(label) term, COUNT(*) searches, COUNT(DISTINCT visitor_id) visitors, SUM(qty = 0) empty
               FROM analytics_events WHERE event_type = 'search' AND label IS NOT NULL AND created_at >= ? AND created_at < ? GROUP BY term ORDER BY searches DESC LIMIT 15`,
            [from, to],
        ),
        pool.query(
            `SELECT s.*, u.name userName, u.email userEmail,
                    (SELECT COUNT(*) FROM analytics_sessions x WHERE x.visitor_id = s.visitor_id AND x.started_at < s.started_at) priorVisits
               FROM analytics_sessions s LEFT JOIN users u ON u.id = s.user_id
              WHERE s.started_at >= ? AND s.started_at < ? ORDER BY s.started_at DESC LIMIT 60`,
            [from, to],
        ),
        pool.query(
            "SELECT COUNT(*) sessions, COALESCE(SUM(cart_value), 0) value, COUNT(DISTINCT visitor_id) visitors FROM analytics_sessions WHERE carted = 1 AND purchased = 0 AND started_at >= ? AND started_at < ?",
            [from, to],
        ),
        pool.query('SELECT COUNT(*) active FROM analytics_sessions WHERE last_seen_at >= ?', [liveSince]),
        pool.query('SELECT exit_path p, exit_type pt, COUNT(*) c FROM analytics_sessions WHERE last_seen_at >= ? AND exit_path IS NOT NULL GROUP BY p, pt ORDER BY c DESC LIMIT 5', [liveSince]),
        pool.query('SELECT MIN(started_at) firstSeen, COUNT(*) sessions FROM analytics_sessions'),
    ]);

    // Fill every day in the range so quiet days show as zero instead of disappearing from the chart.
    const byDay = new Map(dailyRows.map((r) => [String(r.d).slice(0, 10), r]));
    const daily = [];
    for (let i = range.days - 1; i >= 0; i -= 1) {
        const istDay = new Date(istMidnightUtc(i).getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
        const row = byDay.get(istDay);
        daily.push({ date: istDay, visitors: n(row?.visitors), sessions: n(row?.sessions), carts: n(row?.carts), orders: n(row?.orders) });
    }
    const byHour = new Map(hourRows.map((r) => [n(r.h), n(r.sessions)]));
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, sessions: byHour.get(h) ?? 0 }));

    const steps = [
        { key: 'visited', label: 'Visited the store', count: n(funnel.visited) },
        { key: 'looked', label: 'Looked at a product', count: n(funnel.looked) },
        { key: 'carted', label: 'Added to bag', count: n(funnel.carted) },
        { key: 'checkout', label: 'Opened checkout', count: n(funnel.checkout) },
        { key: 'form', label: 'Signed in & entered details', count: n(funnel.form) },
        { key: 'bought', label: 'Placed an order', count: n(funnel.bought) },
    ];

    // Pages: views and visitors from page-view events, entries/exits from sessions.
    const exitsByPage = new Map(pageExitRows.map((r) => [r.p, r]));
    const pages = pageViewRows
        .map((r) => {
            const exit = exitsByPage.get(r.p);
            return { path: r.p, type: r.pt, views: n(r.views), visitors: n(r.visitors), exits: n(exit?.exits), lost: n(exit?.lost), bounces: n(exit?.bounces) };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 20);
    // Where the people who did NOT buy were when they left — the actual answer to "where do we lose them".
    const leaks = [...exitsByPage.values()]
        .map((r) => ({ path: r.p, lost: n(r.lost), exits: n(r.exits) }))
        .filter((r) => r.lost > 0)
        .sort((a, b) => b.lost - a.lost)
        .slice(0, 8);
    const lostTotal = leaks.reduce((sum, r) => sum + r.lost, 0);

    // Product names and pictures.
    const productIds = new Set(productRows.map((r) => r.id));
    const eventsBySession = new Map();
    if (sessionRows.length > 0) {
        const [eventRows] = await pool.query(
            'SELECT session_id, event_type, page_type, path, product_id, value, qty, label, created_at FROM analytics_events WHERE session_id IN (?) ORDER BY id',
            [sessionRows.map((s) => s.session_id)],
        );
        for (const e of eventRows) {
            if (e.product_id) productIds.add(e.product_id);
            const list = eventsBySession.get(e.session_id) ?? [];
            if (list.length < 60) list.push(e);
            eventsBySession.set(e.session_id, list);
        }
    }
    const productInfo = new Map();
    if (productIds.size > 0) {
        const [infoRows] = await pool.query(
            `SELECT p.id, p.title, (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) image FROM products p WHERE p.id IN (?)`,
            [[...productIds]],
        );
        for (const r of infoRows) productInfo.set(r.id, r);
    }
    const exitsByProduct = new Map(productExitRows.map((r) => [r.id, n(r.exits)]));
    const products = productRows.map((r) => ({
        id: r.id,
        title: productInfo.get(r.id)?.title ?? r.id,
        image: productInfo.get(r.id)?.image ?? null,
        views: n(r.views), viewers: n(r.viewers), adds: n(r.adds), adders: n(r.adders), wishes: n(r.wishes),
        orders: n(r.orders), units: n(r.units), revenue: n(r.revenue), leftHere: exitsByProduct.get(r.id) ?? 0,
    }));

    const journeys = sessionRows.map((s) => {
        const outcome = s.purchased ? 'bought' : s.checkout_form ? 'checkout' : s.checkout ? 'signin' : s.carted ? 'bag' : s.product_views > 0 ? 'browsed' : 'bounced';
        return {
            id: s.session_id,
            visitorId: s.visitor_id,
            startedAt: s.started_at,
            lastSeenAt: s.last_seen_at,
            customer: s.user_id ? { id: s.user_id, name: s.userName || s.userEmail || 'Customer' } : null,
            returning: n(s.priorVisits) > 0,
            priorVisits: n(s.priorVisits),
            source: s.source, device: s.device, campaign: s.campaign, referrerHost: s.referrer_host,
            pageViews: n(s.page_views), outcome, orderValue: n(s.order_value), cartValue: n(s.cart_value),
            events: (eventsBySession.get(s.session_id) ?? []).map((e) => ({
                type: e.event_type, pageType: e.page_type, path: e.path, at: e.created_at, qty: e.qty, value: e.value, label: e.label,
                productId: e.product_id, product: e.product_id ? productInfo.get(e.product_id)?.title ?? null : null,
            })),
        };
    });

    return {
        range: { key: range.key, days: range.days, from, to },
        kpis: { current, previous },
        funnel: steps,
        daily, hours, pages, leaks, lostTotal, products, journeys,
        sources: sourceRows.map((r) => ({ key: r.k, visitors: n(r.visitors), sessions: n(r.sessions), carts: n(r.carts), checkouts: n(r.checkouts), orders: n(r.orders) })),
        devices: deviceRows.map((r) => ({ key: r.k, visitors: n(r.visitors), sessions: n(r.sessions), carts: n(r.carts), checkouts: n(r.checkouts), orders: n(r.orders) })),
        campaigns: campaignRows.map((r) => ({ key: r.k, visitors: n(r.visitors), carts: n(r.carts), orders: n(r.orders) })),
        searches: searchRows.map((r) => ({ term: r.term, searches: n(r.searches), visitors: n(r.visitors), empty: n(r.empty) })),
        abandoned: { sessions: n(abandoned.sessions), visitors: n(abandoned.visitors), value: n(abandoned.value) },
        live: { active: n(live.active), pages: liveRows.map((r) => ({ path: r.p, type: r.pt, count: n(r.c) })) },
        tracking: { since: tracking.firstSeen ?? null, sessions: n(tracking.sessions) },
    };
}

export { SESSION_IDLE_MINUTES };
