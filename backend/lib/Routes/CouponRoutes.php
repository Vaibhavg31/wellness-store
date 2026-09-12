<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\CouponService;
use Krivea\Database;
use Krivea\Repository\CouponRepository;
use Krivea\Request;
use Krivea\Response;

final class CouponRoutes
{
    private static function repo(): CouponRepository
    {
        static $repo = null;
        $repo ??= new CouponRepository();
        return $repo;
    }

    private static function service(): CouponService
    {
        static $svc = null;
        $svc ??= new CouponService();
        return $svc;
    }

    public static function listPublic(): void
    {
        try {
            $svc = self::service();
            $coupons = array_map(
                fn(array $c) => $svc->publicListShape($c),
                self::repo()->getPublic()
            );
            Response::json($coupons);
        } catch (\Exception) {
            Response::error('Failed to fetch coupons', 500);
        }
    }

    public static function validate(): void
    {
        try {
            $body = Request::body();
            $code = (string) ($body['code'] ?? '');
            $subtotal = (float) ($body['subtotal'] ?? 0);

            $userId = null;
            $payload = Auth::optionalCustomer();
            if ($payload !== null) {
                $userId = (string) ($payload['userId'] ?? '');
            }

            $result = self::service()->validate($code, $subtotal, $userId);
            Response::json($result);
        } catch (\Exception) {
            Response::error('Failed to validate coupon', 500);
        }
    }

    public static function autoApply(): void
    {
        try {
            $body = Request::body();
            $subtotal = (float) ($body['subtotal'] ?? 0);

            $userId = null;
            $payload = Auth::optionalCustomer();
            if ($payload !== null) {
                $userId = (string) ($payload['userId'] ?? '');
            }

            $result = self::service()->resolveAutoApply($subtotal, $userId);
            Response::json($result ?? ['valid' => false, 'message' => 'No eligible auto offer']);
        } catch (\Exception) {
            Response::error('Failed to resolve auto offer', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            $svc = self::service();
            $coupons = array_map(
                fn(array $c) => $svc->enrichWithStats($c),
                self::repo()->getAll()
            );
            Response::json($coupons);
        } catch (\Exception) {
            Response::error('Failed to fetch coupons', 500);
        }
    }

    public static function getAdmin(string $id): void
    {
        Auth::requireAdmin();
        try {
            $coupon = self::repo()->getById($id);
            if (!$coupon) {
                Response::error('Coupon not found', 404);
            }
            Response::json(self::service()->enrichWithStats($coupon));
        } catch (\Exception) {
            Response::error('Failed to fetch coupon', 500);
        }
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            $code = CouponService::normalizeCode((string) ($body['code'] ?? ''));
            $type = (string) ($body['type'] ?? 'percent');

            if ($code === '') {
                Response::error('Coupon code is required', 400);
            }

            if (!in_array($type, CouponService::TYPES, true)) {
                Response::error('Invalid coupon type', 400);
            }

            if (self::repo()->codeExists($code)) {
                Response::error('A coupon with this code already exists', 409);
            }

            $now = gmdate('c');
            $coupon = [
                'id'              => Database::generateId('coupon'),
                'code'            => $code,
                'title'           => trim((string) ($body['title'] ?? $code)),
                'description'     => trim((string) ($body['description'] ?? '')),
                'type'            => $type,
                'value'           => (float) ($body['value'] ?? 0),
                'minOrderAmount'  => (float) ($body['minOrderAmount'] ?? 0),
                'maxDiscount'     => (float) ($body['maxDiscount'] ?? 0),
                'maxUses'         => (int) ($body['maxUses'] ?? 0),
                'maxUsesPerUser'  => (int) ($body['maxUsesPerUser'] ?? 0),
                'usageCount'      => 0,
                'isEnabled'       => (bool) ($body['isEnabled'] ?? true),
                'showOnWebsite'   => (bool) ($body['showOnWebsite'] ?? true),
                'autoApply'       => (bool) ($body['autoApply'] ?? false),
                'startsAt'        => trim((string) ($body['startsAt'] ?? '')),
                'expiresAt'       => trim((string) ($body['expiresAt'] ?? '')),
                'createdAt'       => $now,
                'updatedAt'       => $now,
            ];

            Response::json(self::repo()->create($coupon), 201);
        } catch (\Exception) {
            Response::error('Failed to create coupon', 500);
        }
    }

    public static function update(string $id): void
    {
        Auth::requireAdmin();
        try {
            $existing = self::repo()->getById($id);
            if (!$existing) {
                Response::error('Coupon not found', 404);
            }

            $body = Request::body();
            $allowed = [
                'code', 'title', 'description', 'type', 'value',
                'minOrderAmount', 'maxDiscount', 'maxUses', 'maxUsesPerUser',
                'isEnabled', 'showOnWebsite', 'autoApply', 'startsAt', 'expiresAt',
            ];
            $changes = array_intersect_key($body, array_flip($allowed));

            if (isset($changes['code'])) {
                $code = CouponService::normalizeCode((string) $changes['code']);
                if ($code === '') {
                    Response::error('Coupon code cannot be empty', 400);
                }
                if (self::repo()->codeExists($code, $id)) {
                    Response::error('A coupon with this code already exists', 409);
                }
                $changes['code'] = $code;
            }

            if (isset($changes['type']) && !in_array($changes['type'], CouponService::TYPES, true)) {
                Response::error('Invalid coupon type', 400);
            }

            $changes['updatedAt'] = gmdate('c');
            $updated = self::repo()->update($id, $changes);
            $updated ? Response::json(self::service()->enrichWithStats($updated)) : Response::error('Coupon not found', 404);
        } catch (\Exception) {
            Response::error('Failed to update coupon', 500);
        }
    }

    public static function toggle(string $id): void
    {
        Auth::requireAdmin();
        try {
            $existing = self::repo()->getById($id);
            if (!$existing) {
                Response::error('Coupon not found', 404);
            }

            $enabled = !empty($existing['isEnabled']) ? false : true;
            $updated = self::repo()->update($id, [
                'isEnabled' => $enabled,
                'updatedAt' => gmdate('c'),
            ]);

            Response::json(self::service()->enrichWithStats($updated));
        } catch (\Exception) {
            Response::error('Failed to toggle coupon', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Coupon not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete coupon', 500);
        }
    }
}
