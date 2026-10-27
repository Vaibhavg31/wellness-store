/** Single source of truth for order statuses across admin & customer UIs */

export const ORDER_STATUSES = [
    { value: 'placed', label: 'Placed', adminLabel: 'Placed', userLabel: 'Order Placed' },
    { value: 'confirmed', label: 'Confirmed', adminLabel: 'Confirmed', userLabel: 'Confirmed' },
    { value: 'out_for_delivery', label: 'Out for Delivery', adminLabel: 'Out for Delivery', userLabel: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered', adminLabel: 'Delivered', userLabel: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled', adminLabel: 'Cancelled', userLabel: 'Cancelled' },
    { value: 'returned', label: 'Returned', adminLabel: 'Returned', userLabel: 'Returned' },
];

/** Status options shown in admin dropdowns and filters */
export const ADMIN_STATUS_OPTIONS = ORDER_STATUSES.filter((s) =>
    ['confirmed', 'out_for_delivery', 'delivered', 'cancelled'].includes(s.value),
);

/** Legacy statuses kept for older orders */
export const LEGACY_STATUS_ALIASES = {
    packed: 'confirmed',
    shipped: 'out_for_delivery',
};

export const FULFILLMENT_PIPELINE = ['confirmed', 'out_for_delivery', 'delivered'];

export const TERMINAL_STATUSES = ['delivered', 'cancelled', 'returned'];

export const STATUS_COLORS = {
    placed: 'bg-info-tint text-info border-info/30',
    confirmed: 'bg-warning-tint text-warning border-warning/30',
    out_for_delivery: 'bg-primary-tint text-primary-deep border-primary/20',
    delivered: 'bg-primary/15 text-primary border-primary/30',
    cancelled: 'bg-danger-tint text-danger border-danger/30',
    returned: 'bg-warning-tint text-warning border-warning/30',
    packed: 'bg-primary-tint text-primary-deep border-primary/20',
    shipped: 'bg-primary-tint text-primary-deep border-primary/20',
};

export const STATUS_LABELS = Object.fromEntries(
    ORDER_STATUSES.map((s) => [s.value, s.label]),
);

export const USER_STATUS_LABELS = Object.fromEntries(
    ORDER_STATUSES.map((s) => [s.value, s.userLabel]),
);

export function normalizeStatus(status) {
    return LEGACY_STATUS_ALIASES[status] || status;
}

export function getStatusLabel(status, audience = 'admin') {
    const normalized = normalizeStatus(status);
    const found = ORDER_STATUSES.find((s) => s.value === normalized);
    if (!found) return status;
    return audience === 'user' ? found.userLabel : found.adminLabel;
}

export function getStatusIndex(status) {
    const normalized = normalizeStatus(status);
    switch (normalized) {
        case 'placed': return 0;
        case 'confirmed': return 1;
        case 'out_for_delivery': return 2;
        case 'delivered': return FULFILLMENT_PIPELINE.length;
        default: return -1;
    }
}

export function isStepDone(status, stepIndex) {
    const normalized = normalizeStatus(status);
    if (normalized === 'delivered') return true;
    if (stepIndex === 0) return ['confirmed', 'out_for_delivery'].includes(normalized);
    if (stepIndex === 1) return false;
    return false;
}

export function isStepActive(status, stepIndex) {
    const normalized = normalizeStatus(status);
    if (normalized === 'confirmed' && stepIndex === 0) return true;
    if (normalized === 'out_for_delivery' && stepIndex === 1) return true;
    return false;
}

export function getFulfillmentProgress(status) {
    const normalized = normalizeStatus(status);
    const stepCount = FULFILLMENT_PIPELINE.length;
    if (normalized === 'placed') return Math.round((1 / stepCount) * 50);
    if (normalized === 'confirmed') return Math.round((1 / stepCount) * 100);
    if (normalized === 'out_for_delivery') return Math.round((2 / stepCount) * 100);
    if (normalized === 'delivered') return 100;
    return 0;
}

export function getNextStatus(status) {
    const normalized = normalizeStatus(status);
    if (normalized === 'placed') return 'confirmed';
    const idx = FULFILLMENT_PIPELINE.indexOf(normalized);
    if (idx < 0 || idx >= FULFILLMENT_PIPELINE.length - 1) return null;
    return FULFILLMENT_PIPELINE[idx + 1];
}

export function isTerminalStatus(status) {
    return TERMINAL_STATUSES.includes(normalizeStatus(status));
}

export function canAdvanceStatus(status) {
    return getNextStatus(status) !== null;
}

export function paymentLabel(order) {
    if (order.payment === 'offline') {
        if (order.refundStatus === 'refunded') return 'Paid Offline · Refunded';
        return 'Paid Offline';
    }
    if (order.payment === 'pending') {
        if (order.refundStatus === 'refunded') return 'Payment Pending · Refunded';
        return 'Payment Pending';
    }
    if (order.payment === 'razorpay') {
        const ps = order.paymentStatus || 'pending';
        if (order.refundStatus === 'refunded') return 'Refunded';
        if (ps === 'paid') return 'Paid Online';
        if (ps === 'failed') return 'Payment Failed';
        return 'Payment Pending';
    }
    if (order.refundStatus === 'refunded') return 'COD · Refunded';
    return 'Cash on Delivery';
}

export function formatOrderDate(iso, options = {}) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: options.time !== false ? '2-digit' : undefined,
        minute: options.time !== false ? '2-digit' : undefined,
        ...options,
    });
}

export function shortOrderId(id) {
    if (!id) return '';
    const parts = id.split('-');
    return parts.length > 1 ? `#${parts[parts.length - 1].slice(0, 8)}` : `#${id.slice(-8)}`;
}

export function isDirectOrder(order) {
    return order?.orderSource === 'direct';
}

export function orderSourceLabel(order) {
    return isDirectOrder(order) ? 'Direct' : 'Website';
}

export function buildStatusHistory(order) {
    if (Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
        return order.statusHistory;
    }
    const history = [{ status: 'placed', at: order.createdAt, note: 'Order received' }];
    const current = normalizeStatus(order.status);
    if (current !== 'placed') {
        history.push({
            status: current,
            at: order.updatedAt || order.paidAt || order.createdAt,
            note: getStatusLabel(current, 'user'),
        });
    }
    return history;
}
