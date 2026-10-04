import { normalizeStatus } from '@/constants/orders';
import { orderCountsTowardRevenue, orderRevenue } from '@/utils/orderRevenue';

const DAY_MS = 86_400_000;

/** Local calendar-day key ("2026-10-04") so days line up with the shop owner's clock, not UTC. */
export function dayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * One entry per day for the last `days` days (oldest → newest, ending today):
 * { key, date, revenue, orders }. Cancelled/returned/unpaid-online orders are excluded,
 * matching how revenue is counted everywhere else in the admin.
 */
export function buildDailySeries(orders, days, now = new Date()) {
    const today = startOfDay(now);
    const buckets = new Map();
    const series = [];
    for (let i = days - 1; i >= 0; i -= 1) {
        const date = new Date(today.getTime() - i * DAY_MS);
        const point = { key: dayKey(date), date, revenue: 0, orders: 0 };
        buckets.set(point.key, point);
        series.push(point);
    }
    for (const order of orders) {
        if (!order?.createdAt || !orderCountsTowardRevenue(order)) continue;
        const bucket = buckets.get(dayKey(new Date(order.createdAt)));
        if (!bucket) continue;
        bucket.revenue += orderRevenue(order);
        bucket.orders += 1;
    }
    return series;
}

export function sumSeries(series, metric) {
    return series.reduce((total, point) => total + point[metric], 0);
}

/** Percentage change vs the previous equal-length period; null when there is nothing to compare against. */
export function percentChange(current, previous) {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
}

/** Totals for the `days` immediately before the current window. */
export function previousPeriodTotal(orders, days, metric, now = new Date()) {
    const earlier = new Date(startOfDay(now).getTime() - days * DAY_MS);
    return sumSeries(buildDailySeries(orders, days, earlier), metric);
}

/** "Nice" axis maximum and tick values (0, 1k, 2k …) for a data maximum. */
export function niceScale(max, tickTarget = 4) {
    if (!(max > 0)) return { max: 1, ticks: [0, 1] };
    const rough = max / tickTarget;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
    const top = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 100) / 100);
    return { max: top, ticks };
}

export const STATUS_ORDER = ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];

/** Orders created within the last `days` days, counted by (normalised) status, in pipeline order. */
export function statusBreakdown(orders, days, now = new Date()) {
    const from = startOfDay(now).getTime() - (days - 1) * DAY_MS;
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
    let total = 0;
    for (const order of orders) {
        if (!order?.createdAt || new Date(order.createdAt).getTime() < from) continue;
        const status = normalizeStatus(order.status);
        if (status in counts) {
            counts[status] += 1;
            total += 1;
        }
    }
    return { total, rows: STATUS_ORDER.map((status) => ({ status, count: counts[status] })).filter((row) => row.count > 0) };
}
