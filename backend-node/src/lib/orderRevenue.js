/** Consistent revenue rules across dashboard, exports, and stats. Mirrors OrderRevenue.php. */
export function countsTowardRevenue(order) {
    const status = order.status || '';
    if (status === 'cancelled' || status === 'returned') return false;
    if (order.payment === 'razorpay' && order.paymentStatus !== 'paid') return false;
    return true;
}

export function revenueForOrder(order) {
    if (!countsTowardRevenue(order)) return 0;
    return Math.round(Number(order.total || 0) * 100) / 100;
}

export function sumRevenue(orders) {
    const total = orders.reduce((sum, order) => sum + revenueForOrder(order), 0);
    return Math.round(total * 100) / 100;
}
