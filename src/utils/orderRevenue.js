import { normalizeStatus } from '@/constants/orders';

export function orderCountsTowardRevenue(order) {
    const status = normalizeStatus(order?.status);
    if (status === 'cancelled' || status === 'returned') return false;
    if (order?.payment === 'razorpay' && order?.paymentStatus !== 'paid') return false;
    return true;
}

export function orderRevenue(order) {
    return orderCountsTowardRevenue(order) ? Number(order?.total ?? 0) : 0;
}

export function sumOrderRevenue(orders) {
    return orders.reduce((sum, order) => sum + orderRevenue(order), 0);
}
