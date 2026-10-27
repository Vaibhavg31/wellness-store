const DAY = 24 * 60 * 60 * 1000;
const fmt = (date) => date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * "Tue 13 Oct – Fri 16 Oct" for an order placed on `from`, or null when the admin hasn't set an estimate
 * (maxDays = 0). One date is shown when the fastest and slowest estimates are equal.
 */
export function deliveryWindow(delivery, from = new Date()) {
    const max = Number(delivery?.maxDays) || 0;
    if (max <= 0) return null;
    const min = Math.min(Number(delivery?.minDays) || max, max);
    const start = fmt(new Date(from.getTime() + min * DAY));
    const end = fmt(new Date(from.getTime() + max * DAY));
    return start === end ? start : `${start} – ${end}`;
}
