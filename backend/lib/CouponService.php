<?php

declare(strict_types=1);

namespace Wellness;

use Wellness\Repository\CouponRepository;
use Wellness\Repository\OrderRepository;
use Wellness\Repository\SettingsRepository;

final class CouponService
{
    public const TYPES = ['percent', 'flat', 'free_delivery'];

    /**
     * 'everyone' — no restriction (default, matches every coupon created
     *   before this feature existed).
     * 'new_customers' — only a signed-in customer with zero non-cancelled
     *   past orders; a guest (no account yet) is given the benefit of the
     *   doubt, same as every other per-user rule in eligibilityError().
     * 'returning_customers' — the repeat-customer discount this feature was
     *   built for: only a signed-in customer with at least minPreviousOrders
     *   non-cancelled past orders. A guest is never eligible here, since
     *   there's no order history to check without an account.
     */
    public const AUDIENCES = ['everyone', 'new_customers', 'returning_customers'];

    private CouponRepository $coupons;
    private OrderRepository $orders;
    private SettingsRepository $settings;

    public function __construct()
    {
        $this->coupons  = new CouponRepository();
        $this->orders   = new OrderRepository();
        $this->settings = new SettingsRepository();
    }

    public static function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    /** @return array<string, mixed> */
    public function deliverySettings(): array
    {
        $settings = $this->settings->get();
        $delivery = is_array($settings['delivery'] ?? null) ? $settings['delivery'] : [];

        return [
            'fee'           => (float) ($delivery['fee'] ?? 99),
            'freeThreshold' => (float) ($delivery['freeThreshold'] ?? 1999),
        ];
    }

    /**
     * @return array{valid: bool, message: string, coupon?: array<string, mixed>, breakdown?: array<string, mixed>, autoApplied?: bool}|null
     */
    public function resolveAutoApply(float $subtotal, ?string $userId = null): ?array
    {
        $subtotal = round(max(0, $subtotal), 2);
        if ($subtotal <= 0) {
            return null;
        }

        $best = null;
        $bestSavings = -1.0;

        foreach ($this->coupons->getAutoApply() as $coupon) {
            if ($this->eligibilityError($coupon, $subtotal, $userId) !== null) {
                continue;
            }

            $breakdown = $this->calculateBreakdown($subtotal, $coupon);
            $savings = (float) ($breakdown['discountAmount'] ?? 0);
            if (($breakdown['freeDeliveryFromCoupon'] ?? false) && ($breakdown['deliveryFee'] ?? 0) <= 0) {
                $delivery = $this->deliverySettings();
                $savings += (float) $delivery['fee'];
            }

            if ($savings > $bestSavings) {
                $bestSavings = $savings;
                $best = [
                    'valid'        => true,
                    'message'      => $this->successMessage($coupon, $breakdown),
                    'coupon'       => $this->publicCouponShape($coupon),
                    'breakdown'    => $breakdown,
                    'autoApplied'  => true,
                ];
            }
        }

        return $best;
    }

    /**
     * @return array{valid: bool, message: string, coupon?: array<string, mixed>, breakdown?: array<string, mixed>}
     */
    public function validate(string $code, float $subtotal, ?string $userId = null): array
    {
        $normalized = self::normalizeCode($code);
        if ($normalized === '') {
            return ['valid' => false, 'message' => 'Enter a coupon code'];
        }

        $coupon = $this->coupons->findByCode($normalized);
        if (!$coupon) {
            return ['valid' => false, 'message' => 'Invalid coupon code'];
        }

        $error = $this->eligibilityError($coupon, $subtotal, $userId);
        if ($error !== null) {
            return ['valid' => false, 'message' => $error];
        }

        $breakdown = $this->calculateBreakdown($subtotal, $coupon);

        return [
            'valid'     => true,
            'message'   => $this->successMessage($coupon, $breakdown),
            'coupon'    => $this->publicCouponShape($coupon),
            'breakdown' => $breakdown,
        ];
    }

    /**
     * @param array<string, mixed> $coupon
     * @return array<string, mixed>
     */
    public function calculateBreakdown(float $subtotal, array $coupon): array
    {
        $delivery = $this->deliverySettings();
        $subtotal = round(max(0, $subtotal), 2);

        $type = (string) ($coupon['type'] ?? 'percent');
        $value = (float) ($coupon['value'] ?? 0);

        $discountAmount = 0.0;
        $freeDeliveryFromThreshold = $subtotal >= $delivery['freeThreshold'];
        $freeDeliveryFromCoupon = $type === 'free_delivery';

        if ($type === 'percent') {
            $discountAmount = round($subtotal * $value / 100, 2);
            $maxDiscount = (float) ($coupon['maxDiscount'] ?? 0);
            if ($maxDiscount > 0) {
                $discountAmount = min($discountAmount, $maxDiscount);
            }
            $discountAmount = min($discountAmount, $subtotal);
        } elseif ($type === 'flat') {
            $discountAmount = min($value, $subtotal);
        }

        $deliveryFee = $delivery['fee'];
        if ($freeDeliveryFromThreshold || $freeDeliveryFromCoupon) {
            $deliveryFee = 0.0;
        }

        $total = round(max(0, $subtotal - $discountAmount + $deliveryFee), 2);

        return [
            'subtotal'                  => $subtotal,
            'discountAmount'            => round($discountAmount, 2),
            'deliveryFee'               => round($deliveryFee, 2),
            'total'                     => $total,
            'freeDeliveryFromThreshold' => $freeDeliveryFromThreshold,
            'freeDeliveryFromCoupon'    => $freeDeliveryFromCoupon,
            'couponType'                => $type,
            'couponValue'               => $value,
        ];
    }

    /**
     * @param array<string, mixed> $coupon
     * @return array<string, mixed>
     */
    public function enrichWithStats(array $coupon): array
    {
        $stats = $this->statsForCoupon((string) ($coupon['code'] ?? ''));
        return array_merge($coupon, ['stats' => $stats]);
    }

    /** @return array<string, int|float> */
    public function statsForCoupon(string $code): array
    {
        $normalized = self::normalizeCode($code);
        $stats = $this->orders->statsForCoupon($normalized);

        // delivery_saved wasn't recorded for older orders — fall back to the
        // *current* delivery fee for those (best available estimate; the
        // per-order amount was never captured at order time).
        $totalDiscountGiven = $stats['totalDiscountGiven'];
        if ($stats['freeDeliveryOrdersMissingSavedAmount'] > 0) {
            $totalDiscountGiven += $stats['freeDeliveryOrdersMissingSavedAmount'] * $this->deliverySettings()['fee'];
        }

        return [
            'totalOrders'        => $stats['totalOrders'],
            'uniqueCustomers'    => $stats['uniqueCustomers'],
            'totalRevenue'       => round($stats['totalRevenue'], 2),
            'totalDiscountGiven' => round($totalDiscountGiven, 2),
        ];
    }

    /** @return bool false if another concurrent checkout already claimed the last available use. */
    public function recordUsage(string $couponId): bool
    {
        return $this->coupons->incrementUsage($couponId);
    }

    public function releaseUsage(string $couponId): void
    {
        $this->coupons->decrementUsage($couponId);
    }

    /**
     * @param array<string, mixed> $coupon
     */
    private function eligibilityError(array $coupon, float $subtotal, ?string $userId): ?string
    {
        if (empty($coupon['isEnabled'])) {
            return 'This coupon is no longer active';
        }

        $now = time();
        $startsAt = trim((string) ($coupon['startsAt'] ?? ''));
        if ($startsAt !== '') {
            $startTs = strtotime($startsAt);
            if ($startTs !== false && $now < $startTs) {
                return 'This coupon is not active yet';
            }
        }

        $expiresAt = trim((string) ($coupon['expiresAt'] ?? ''));
        if ($expiresAt !== '') {
            $endTs = strtotime($expiresAt);
            if ($endTs !== false && $now > $endTs) {
                return 'This coupon has expired';
            }
        }

        $minOrder = (float) ($coupon['minOrderAmount'] ?? 0);
        if ($minOrder > 0 && $subtotal < $minOrder) {
            return 'Minimum order of ₹' . number_format($minOrder, 0) . ' required for this coupon';
        }

        $maxUses = (int) ($coupon['maxUses'] ?? 0);
        $usageCount = (int) ($coupon['usageCount'] ?? 0);
        if ($maxUses > 0 && $usageCount >= $maxUses) {
            return 'This coupon has reached its usage limit';
        }

        if ($userId !== null && $userId !== '') {
            $maxPerUser = (int) ($coupon['maxUsesPerUser'] ?? 0);
            if ($maxPerUser > 0) {
                $userUses = $this->countUserUses((string) ($coupon['code'] ?? ''), $userId);
                if ($userUses >= $maxPerUser) {
                    return 'You have already used this coupon';
                }
            }
        }

        $audienceError = $this->audienceError($coupon, $userId);
        if ($audienceError !== null) {
            return $audienceError;
        }

        return null;
    }

    /**
     * @param array<string, mixed> $coupon
     */
    private function audienceError(array $coupon, ?string $userId): ?string
    {
        $audience = (string) ($coupon['audience'] ?? 'everyone');
        if ($audience === 'everyone') {
            return null;
        }

        $signedIn = $userId !== null && $userId !== '';

        if ($audience === 'new_customers') {
            // No account yet -> can't have a prior order -> eligible. Only a
            // signed-in customer who already has one is turned away.
            if ($signedIn && $this->orders->countNonCancelledOrders($userId) > 0) {
                return 'This offer is for new customers only';
            }
            return null;
        }

        if ($audience === 'returning_customers') {
            // The inverse: no account (or no order history) means there's
            // nothing to verify a "repeat" status against, so it's a no —
            // never silently granted the way maxUsesPerUser is for guests.
            if (!$signedIn) {
                return 'Sign in to use this offer — it\'s for returning customers';
            }
            $minOrders = max(1, (int) ($coupon['minPreviousOrders'] ?? 1));
            if ($this->orders->countNonCancelledOrders($userId) < $minOrders) {
                return $minOrders > 1
                    ? "This offer unlocks after {$minOrders} orders with us"
                    : 'This offer is for returning customers only';
            }
            return null;
        }

        return null;
    }

    private function countUserUses(string $code, string $userId): int
    {
        $normalized = self::normalizeCode($code);
        return $this->orders->countUsagesOfCouponByUser($normalized, $userId, '');
    }

    /**
     * @param array<string, mixed> $coupon
     * @param array<string, mixed> $breakdown
     */
    private function successMessage(array $coupon, array $breakdown): string
    {
        $type = (string) ($coupon['type'] ?? 'percent');
        $value = (float) ($coupon['value'] ?? 0);

        if ($type === 'free_delivery') {
            return 'Free delivery applied!';
        }

        if ($type === 'flat') {
            return '₹' . number_format($value, 0) . ' off applied!';
        }

        if ($breakdown['discountAmount'] > 0) {
            return number_format($value, 0) . '% off applied. You save ₹'
                . number_format((float) $breakdown['discountAmount'], 0);
        }

        return 'Coupon applied successfully';
    }

    /**
     * @param array<string, mixed> $coupon
     * @return array<string, mixed>
     */
    private function publicCouponShape(array $coupon): array
    {
        return [
            'id'             => $coupon['id'] ?? '',
            'code'           => $coupon['code'] ?? '',
            'title'          => $coupon['title'] ?? '',
            'description'    => $coupon['description'] ?? '',
            'type'           => $coupon['type'] ?? 'percent',
            'value'          => (float) ($coupon['value'] ?? 0),
            'minOrderAmount' => (float) ($coupon['minOrderAmount'] ?? 0),
            'maxDiscount'    => (float) ($coupon['maxDiscount'] ?? 0),
        ];
    }

    /** @return array<string, mixed> */
    public function publicListShape(array $coupon): array
    {
        $type = (string) ($coupon['type'] ?? 'percent');
        $value = (float) ($coupon['value'] ?? 0);

        $label = match ($type) {
            'free_delivery' => 'Free Delivery',
            'flat'          => '₹' . number_format($value, 0) . ' OFF',
            default         => number_format($value, 0) . '% OFF',
        };

        return [
            'id'             => $coupon['id'] ?? '',
            'code'           => $coupon['code'] ?? '',
            'title'          => $coupon['title'] ?? '',
            'description'    => $coupon['description'] ?? '',
            'type'           => $type,
            'value'          => $value,
            'label'          => $label,
            'minOrderAmount' => (float) ($coupon['minOrderAmount'] ?? 0),
        ];
    }
}
