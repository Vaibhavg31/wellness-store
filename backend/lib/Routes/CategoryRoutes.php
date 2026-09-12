<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\Database;
use Krivea\Repository\CategoryRepository;
use Krivea\Request;
use Krivea\Response;

final class CategoryRoutes
{
    private static function repo(): CategoryRepository
    {
        static $repo = null;
        $repo ??= new CategoryRepository();
        return $repo;
    }

    public static function listPublic(): void
    {
        try {
            // Categories change rarely; admin edits go through a different URL
            // (/api/categories/admin/all) so this cache never masks an admin's
            // own change from them.
            Response::json(self::repo()->getPublished(), 200, 300);
        } catch (\Exception) {
            Response::error('Failed to fetch categories', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            Response::json(self::repo()->getAllWithProductCount());
        } catch (\Exception) {
            Response::error('Failed to fetch categories', 500);
        }
    }

    public static function getBySlug(string $slug): void
    {
        try {
            $cat = self::repo()->findBySlug($slug);
            $cat ? Response::json($cat) : Response::error('Category not found', 404);
        } catch (\Exception) {
            Response::error('Failed to fetch category', 500);
        }
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            if (empty($body['label']) || empty($body['slug'])) {
                Response::error('label and slug are required', 400);
            }

            $category = [
                'id'          => $body['slug'],
                'slug'        => $body['slug'],
                'label'       => $body['label'],
                'description' => $body['description'] ?? '',
                'image'       => $body['image']       ?? '',
                'isPublished' => (bool) ($body['isPublished'] ?? true),
                'order'       => (int)  ($body['order']       ?? 99),
            ];

            Response::json(self::repo()->create($category), 201);
        } catch (\Exception) {
            Response::error('Failed to create category', 500);
        }
    }

    public static function update(string $id): void
    {
        Auth::requireAdmin();
        try {
            $body    = Request::body();
            $allowed = ['label', 'description', 'image', 'isPublished', 'order'];
            $changes = array_intersect_key($body, array_flip($allowed));

            $updated = self::repo()->update($id, $changes);
            $updated ? Response::json($updated) : Response::error('Category not found', 404);
        } catch (\Exception) {
            Response::error('Failed to update category', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Category not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete category', 500);
        }
    }
}
