<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\Repository\BannerRepository;
use Krivea\Request;
use Krivea\Response;

final class BannerRoutes
{
    private static function repo(): BannerRepository
    {
        static $repo = null;
        $repo ??= new BannerRepository();
        return $repo;
    }

    public static function listPublic(): void
    {
        try {
            $target = isset($_GET['target']) ? (string) $_GET['target'] : null;

            if ($target === 'product') {
                $productId = isset($_GET['productId']) ? trim((string) $_GET['productId']) : '';
                if ($productId === '') {
                    Response::json([]);
                }
                Response::json(self::repo()->getPublishedForProduct($productId));
            }

            Response::json(self::repo()->getPublished($target));
        } catch (\Exception) {
            Response::error('Failed to fetch banners', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            Response::json(self::repo()->getAll());
        } catch (\Exception) {
            Response::error('Failed to fetch banners', 500);
        }
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            if (empty($body['image'])) {
                Response::error('Banner image is required', 400);
            }

            $displayTarget = (string) ($body['displayTarget'] ?? 'both');
            if (!in_array($displayTarget, ['slider', 'stacked', 'both', 'product'], true)) {
                $displayTarget = 'both';
            }

            $productId = trim((string) ($body['productId'] ?? ''));
            if ($displayTarget === 'product' && $productId === '') {
                Response::error('Pick a product for a product-page banner', 400);
            }

            $banner = [
                'title'         => $body['title']    ?? '',
                'subtitle'      => $body['subtitle'] ?? '',
                'image'         => $body['image'],
                'ctaLabel'      => $body['ctaLabel'] ?? '',
                'ctaHref'       => $body['ctaHref']  ?? '',
                'isEnabled'     => (bool) ($body['isEnabled'] ?? true),
                'displayTarget' => $displayTarget,
                // Only 'product' banners are ever scoped to a product — a
                // stray productId submitted alongside another target is
                // dropped rather than silently stored, so it can never leak
                // that banner onto a product page nobody chose.
                'productId'     => $displayTarget === 'product' ? $productId : null,
                'order'         => (int)  ($body['order']     ?? 99),
            ];

            Response::json(self::repo()->create($banner), 201);
        } catch (\Exception) {
            Response::error('Failed to create banner', 500);
        }
    }

    public static function update(string $id): void
    {
        Auth::requireAdmin();
        try {
            $body    = Request::body();
            $allowed = ['title', 'subtitle', 'image', 'ctaLabel', 'ctaHref', 'isEnabled', 'displayTarget', 'productId', 'order'];
            $changes = array_intersect_key($body, array_flip($allowed));

            if (isset($changes['displayTarget']) && !in_array($changes['displayTarget'], ['slider', 'stacked', 'both', 'product'], true)) {
                unset($changes['displayTarget']);
            }

            if (($changes['displayTarget'] ?? null) === 'product') {
                $productId = trim((string) ($changes['productId'] ?? ''));
                if ($productId === '') {
                    Response::error('Pick a product for a product-page banner', 400);
                }
                $changes['productId'] = $productId;
            } elseif (array_key_exists('displayTarget', $changes)) {
                // Switching away from 'product' clears the scoping — leaving
                // a stale productId around would silently re-target this
                // banner back to that product the next time it's edited.
                $changes['productId'] = null;
            }

            $updated = self::repo()->update($id, $changes);
            $updated ? Response::json($updated) : Response::error('Banner not found', 404);
        } catch (\Exception) {
            Response::error('Failed to update banner', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Banner not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete banner', 500);
        }
    }
}
