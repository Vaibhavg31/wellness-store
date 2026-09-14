<?php

declare(strict_types=1);

namespace Wellness\Routes;

use Wellness\Auth;
use Wellness\Database;
use Wellness\Repository\BundleRepository;
use Wellness\Request;
use Wellness\Response;

final class BundleRoutes
{
    private static function repo(): BundleRepository
    {
        static $repo = null;
        $repo ??= new BundleRepository();
        return $repo;
    }

    public static function listPublic(): void
    {
        try {
            Response::json(self::repo()->getPublished(), 200, 30);
        } catch (\Exception) {
            Response::error('Failed to fetch bundles', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            Response::json(self::repo()->getAllAdmin());
        } catch (\Exception) {
            Response::error('Failed to fetch bundles', 500);
        }
    }

    public static function getAdmin(string $id): void
    {
        Auth::requireAdmin();
        try {
            $bundle = self::repo()->getById($id);
            $bundle ? Response::json($bundle) : Response::error('Bundle not found', 404);
        } catch (\Exception) {
            Response::error('Failed to fetch bundle', 500);
        }
    }

    private static function validateItems(array $items): void
    {
        if (count($items) < 2) {
            throw new \InvalidArgumentException('A bundle needs at least 2 products');
        }
        $seen = [];
        foreach ($items as $item) {
            $productId = trim((string) ($item['productId'] ?? ''));
            if ($productId === '') {
                throw new \InvalidArgumentException('Every bundle item needs a product');
            }
            if (isset($seen[$productId])) {
                throw new \InvalidArgumentException('Each product can only appear once in a bundle');
            }
            $seen[$productId] = true;
        }
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            $title = trim((string) ($body['title'] ?? ''));
            if ($title === '') {
                Response::error('Bundle title is required', 400);
            }

            $discountType = (string) ($body['discountType'] ?? 'percent');
            if (!in_array($discountType, ['percent', 'flat'], true)) {
                Response::error('Invalid discount type', 400);
            }

            $items = is_array($body['items'] ?? null) ? $body['items'] : [];
            self::validateItems($items);

            $now = gmdate('c');
            $bundle = [
                'id'            => Database::generateId('bundle'),
                'title'         => $title,
                'subtitle'      => trim((string) ($body['subtitle'] ?? '')),
                'description'   => trim((string) ($body['description'] ?? '')),
                'image'         => trim((string) ($body['image'] ?? '')),
                'discountType'  => $discountType,
                'discountValue' => (float) ($body['discountValue'] ?? 0),
                'isPublished'   => (bool) ($body['isPublished'] ?? true),
                'sortOrder'     => (int) ($body['sortOrder'] ?? 0),
                'items'         => $items,
                'createdAt'     => $now,
                'updatedAt'     => $now,
            ];

            Response::json(self::repo()->create($bundle), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Exception) {
            Response::error('Failed to create bundle', 500);
        }
    }

    public static function update(string $id): void
    {
        Auth::requireAdmin();
        try {
            $existing = self::repo()->getById($id);
            if (!$existing) {
                Response::error('Bundle not found', 404);
            }

            $body = Request::body();
            $allowed = ['title', 'subtitle', 'description', 'image', 'discountType', 'discountValue', 'isPublished', 'sortOrder', 'items'];
            $changes = array_intersect_key($body, array_flip($allowed));

            if (isset($changes['title']) && trim((string) $changes['title']) === '') {
                Response::error('Bundle title is required', 400);
            }
            if (isset($changes['discountType']) && !in_array($changes['discountType'], ['percent', 'flat'], true)) {
                Response::error('Invalid discount type', 400);
            }
            if (array_key_exists('items', $changes)) {
                $changes['items'] = is_array($changes['items']) ? $changes['items'] : [];
                self::validateItems($changes['items']);
            }

            $changes['updatedAt'] = gmdate('c');
            $updated = self::repo()->update($id, $changes);
            $updated ? Response::json($updated) : Response::error('Bundle not found', 404);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Exception) {
            Response::error('Failed to update bundle', 500);
        }
    }

    public static function toggle(string $id): void
    {
        Auth::requireAdmin();
        try {
            $existing = self::repo()->getById($id);
            if (!$existing) {
                Response::error('Bundle not found', 404);
            }
            $updated = self::repo()->update($id, [
                'isPublished' => !$existing['isPublished'],
                'updatedAt'   => gmdate('c'),
            ]);
            Response::json($updated);
        } catch (\Exception) {
            Response::error('Failed to toggle bundle', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Bundle not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete bundle', 500);
        }
    }
}
