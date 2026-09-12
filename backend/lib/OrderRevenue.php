<?php

declare(strict_types=1);

namespace Krivea;

/**
 * Consistent revenue rules across dashboard, exports, and stats.
 */
final class OrderRevenue
{
    public static function countsTowardRevenue(array $order): bool
    {
        $status = (string) ($order['status'] ?? '');
        if ($status === 'cancelled' || $status === 'returned') {
            return false;
        }

        if (($order['payment'] ?? '') === 'razorpay' && ($order['paymentStatus'] ?? '') !== 'paid') {
            return false;
        }

        return true;
    }

    public static function forOrder(array $order): float
    {
        if (!self::countsTowardRevenue($order)) {
            return 0.0;
        }

        return round((float) ($order['total'] ?? 0), 2);
    }

    /** @param array<int, array<string, mixed>> $orders */
    public static function sum(array $orders): float
    {
        $total = 0.0;
        foreach ($orders as $order) {
            $total += self::forOrder($order);
        }

        return round($total, 2);
    }
}
