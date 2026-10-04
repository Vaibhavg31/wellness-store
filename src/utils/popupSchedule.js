// Admin sets start/end as local "YYYY-MM-DDTHH:mm" (datetime-local). Empty means open-ended on that side.
const toMs = (value) => (value ? new Date(value).getTime() : NaN);

export function isWithinSchedule(startsAt, endsAt, now = Date.now()) {
    const start = toMs(startsAt);
    const end = toMs(endsAt);
    if (!Number.isNaN(start) && now < start) return false;
    if (!Number.isNaN(end) && now > end) return false;
    return true;
}

// Routes where a popup would interrupt the task in hand (paying, signing in) or isn't the storefront at all.
const BLOCKED_PREFIXES = ['/checkout', '/login', '/register', '/signup', '/forgot-password', '/reset-password', '/verify-email'];

export function popupAllowedOn(pathname, pages, adminPath) {
    if (adminPath && pathname.startsWith(adminPath)) return false;
    if (BLOCKED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
    return pages === 'home' ? pathname === '/' : true;
}
