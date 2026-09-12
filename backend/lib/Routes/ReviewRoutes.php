<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\Database;
use Krivea\Repository\ReviewRepository;
use Krivea\Request;
use Krivea\Response;

final class ReviewRoutes
{
    private static function repo(): ReviewRepository
    {
        static $repo = null;
        $repo ??= new ReviewRepository();
        return $repo;
    }

    public static function listPublic(): void
    {
        try {
            $productId = $_GET['productId'] ?? null;
            $reviews   = $productId
                ? self::repo()->getByProductId($productId)
                : self::repo()->getApproved();
            Response::json($reviews);
        } catch (\Exception) {
            Response::error('Failed to fetch reviews', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            Response::json(self::repo()->getAll());
        } catch (\Exception) {
            Response::error('Failed to fetch reviews', 500);
        }
    }

    public static function submit(): void
    {
        try {
            $body = Request::body();
            if (empty($body['productId']) || empty($body['name']) || empty($body['comment'])) {
                Response::error('productId, name and comment are required', 400);
            }

            $review = [
                'id'        => Database::generateId('review'),
                'productId' => $body['productId'],
                'name'      => htmlspecialchars((string) $body['name'], ENT_QUOTES, 'UTF-8'),
                'email'     => $body['email'] ?? '',
                'rating'    => max(1, min(5, (int) ($body['rating'] ?? 5))),
                'comment'   => htmlspecialchars((string) $body['comment'], ENT_QUOTES, 'UTF-8'),
                'isApproved'=> false,
                'createdAt' => gmdate('c'),
            ];

            Response::json(self::repo()->create($review), 201);
        } catch (\Exception) {
            Response::error('Failed to submit review', 500);
        }
    }

    public static function createAdmin(): void
    {
        Auth::requireAdmin();
        try {
            $body   = Request::body();
            $review = [
                'id'        => Database::generateId('review'),
                'productId' => $body['productId'] ?? '',
                'name'      => $body['name']      ?? 'Admin',
                'email'     => $body['email']     ?? '',
                'rating'    => (int) ($body['rating']  ?? 5),
                'comment'   => $body['comment']   ?? '',
                'isApproved'=> true,
                'createdAt' => gmdate('c'),
            ];

            Response::json(self::repo()->create($review), 201);
        } catch (\Exception) {
            Response::error('Failed to create review', 500);
        }
    }

    public static function approve(string $id): void
    {
        Auth::requireAdmin();
        try {
            $updated = self::repo()->approve($id);
            $updated ? Response::json($updated) : Response::error('Review not found', 404);
        } catch (\Exception) {
            Response::error('Failed to approve review', 500);
        }
    }

    public static function reject(string $id): void
    {
        Auth::requireAdmin();
        try {
            $updated = self::repo()->reject($id);
            $updated ? Response::json($updated) : Response::error('Review not found', 404);
        } catch (\Exception) {
            Response::error('Failed to reject review', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Review not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete review', 500);
        }
    }
}
