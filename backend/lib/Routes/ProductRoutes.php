<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\Database;
use Krivea\Repository\ProductRepository;
use Krivea\Request;
use Krivea\Response;

final class ProductRoutes
{
    private static function repo(): ProductRepository
    {
        static $repo = null;
        $repo ??= new ProductRepository();
        return $repo;
    }

    public static function listPublic(): void
    {
        try {
            // Short cache: this list grows with the catalog and is fetched on
            // nearly every storefront page. The admin panel reads/writes
            // through a *different* URL (/api/products/admin/all), so admins
            // always see fresh data — customers may see up-to-30s-old stock
            // display, which checkout re-validates authoritatively anyway.
            Response::json(self::repo()->getPublished(), 200, 30);
        } catch (\Exception) {
            Response::error('Failed to fetch products', 500);
        }
    }

    public static function trending(): void
    {
        try {
            Response::json(self::repo()->getTrending(), 200, 30);
        } catch (\Exception) {
            Response::error('Failed to fetch trending products', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            Response::json(self::repo()->getAdmin());
        } catch (\Exception) {
            Response::error('Failed to fetch products', 500);
        }
    }

    public static function getAdmin(string $id): void
    {
        Auth::requireAdmin();
        try {
            $product = self::repo()->getById($id);
            $product ? Response::json($product) : Response::error('Product not found', 404);
        } catch (\Exception) {
            Response::error('Failed to fetch product', 500);
        }
    }

    public static function getPublic(string $id): void
    {
        try {
            $product = self::repo()->getPublicById($id);
            $product ? Response::json($product, 200, 30) : Response::error('Product not found', 404);
        } catch (\Exception) {
            Response::error('Failed to fetch product', 500);
        }
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            self::validateProduct($body, required: true);

            $now     = gmdate('c');
            $product = [
                'id'            => Database::generateId('product'),
                'title'         => $body['title'],
                'price'         => (float) $body['price'],
                'originalPrice' => (float) $body['originalPrice'],
                'discount'      => ProductRepository::calcDiscount(
                    (float) $body['price'],
                    (float) $body['originalPrice'],
                    isset($body['discount']) ? (float) $body['discount'] : null
                ),
                'category'      => $body['category'],
                'tags'          => $body['tags']        ?? [],
                'rating'        => (float) ($body['rating']      ?? 0),
                'reviewCount'   => (int)   ($body['reviewCount'] ?? 0),
                'description'   => $body['description'],
                'features'      => $body['features']    ?? [],
                'badges'        => is_array($body['badges'] ?? null) ? $body['badges'] : [],
                'stock'         => (int) $body['stock'],
                'images'        => $body['images'],
                'variants'      => is_array($body['variants'] ?? null) ? $body['variants'] : [],
                'isNew'         => (bool) ($body['isNew']        ?? false),
                'isBestSeller'  => (bool) ($body['isBestSeller'] ?? false),
                'isTrendingPinned' => (bool) ($body['isTrendingPinned'] ?? false),
                'orbitFeatured'    => (bool) ($body['orbitFeatured']    ?? false),
                'orbitSortOrder'   => (int)  ($body['orbitSortOrder']   ?? 0),
                'showTrustBadges'  => array_key_exists('showTrustBadges', $body) ? (bool) $body['showTrustBadges'] : true,
                'isPublished'   => (bool) ($body['isPublished']  ?? true),
                'enable3dPreview' => (bool) ($body['enable3dPreview'] ?? false),
                'cutoutImages'  => is_array($body['cutoutImages'] ?? null) ? $body['cutoutImages'] : [],
                'codEnabled'            => array_key_exists('codEnabled', $body) ? (bool) $body['codEnabled'] : true,
                'onlinePaymentEnabled'  => array_key_exists('onlinePaymentEnabled', $body) ? (bool) $body['onlinePaymentEnabled'] : true,
                'createdAt'     => $now,
                'updatedAt'     => $now,
            ];

            Response::json(self::repo()->create($product), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Exception $e) {
            error_log('[Product Create] ' . $e->getMessage());
            Response::error('Failed to create product', 500);
        }
    }

    public static function update(string $id): void
    {
        Auth::requireAdmin();
        try {
            $body    = Request::body();
            $product = self::repo()->getById($id);

            if (!$product) {
                Response::error('Product not found', 404);
            }

            $allowed = ['title', 'price', 'originalPrice', 'discount', 'category', 'tags',
                        'rating', 'reviewCount', 'description', 'features', 'badges', 'stock', 'images',
                        'isNew', 'isBestSeller', 'isTrendingPinned', 'orbitFeatured', 'orbitSortOrder', 'showTrustBadges', 'isPublished', 'enable3dPreview', 'cutoutImages',
                        'codEnabled', 'onlinePaymentEnabled', 'variants'];

            $changes = array_intersect_key($body, array_flip($allowed));
            if (isset($changes['variants']) && !is_array($changes['variants'])) {
                unset($changes['variants']);
            }

            $price         = (float) ($changes['price']         ?? $product['price']);
            $originalPrice = (float) ($changes['originalPrice'] ?? $product['originalPrice']);

            $changes['discount']  = ProductRepository::calcDiscount(
                $price, $originalPrice,
                isset($body['discount']) ? (float) $body['discount'] : null
            );
            $changes['updatedAt'] = gmdate('c');

            $updated = self::repo()->update($id, $changes);
            $updated ? Response::json($updated) : Response::error('Product not found', 404);
        } catch (\Exception) {
            Response::error('Failed to update product', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Product not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete product', 500);
        }
    }

    /** @param array<string, mixed> $body */
    private static function validateProduct(array $body, bool $required): void
    {
        $fields = ['title', 'price', 'originalPrice', 'category', 'description', 'stock'];
        foreach ($fields as $field) {
            if ($required && empty($body[$field]) && $body[$field] !== 0 && $body[$field] !== 0.0) {
                throw new \InvalidArgumentException("Missing required field: {$field}");
            }
        }
        if ($required && (!is_array($body['images'] ?? null) || count($body['images']) < 1)) {
            throw new \InvalidArgumentException('At least one image is required');
        }
    }
}
