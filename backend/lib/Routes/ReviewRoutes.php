<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\Database;
use Krivea\Repository\OrderRepository;
use Krivea\Repository\ReviewRepository;
use Krivea\Repository\UserRepository;
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

    private static function orders(): OrderRepository
    {
        static $repo = null;
        $repo ??= new OrderRepository();
        return $repo;
    }

    /** Strip fields a reviewer shared with us but that the public storefront
     *  has no business displaying next to their name. */
    private static function toPublic(array $review): array
    {
        unset($review['userId'], $review['email']);
        return $review;
    }

    public static function listPublic(): void
    {
        try {
            $productId = $_GET['productId'] ?? null;
            $reviews   = $productId
                ? self::repo()->getByProductId($productId)
                : self::repo()->getApproved();
            Response::json(array_map([self::class, 'toPublic'], $reviews));
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

    /**
     * Lets the product page ask "can the current visitor review this?"
     * before showing (or hiding) the review form, with a reason it can
     * display either way — rather than only finding out after they fill in
     * the form and press submit.
     */
    public static function eligibility(): void
    {
        try {
            $productId = trim((string) ($_GET['productId'] ?? ''));
            if ($productId === '') {
                Response::error('productId is required', 400);
            }

            $customer = Auth::optionalCustomer();
            if (!$customer) {
                Response::json(['eligible' => false, 'reason' => 'signed_out']);
            }

            $userId = (string) $customer['userId'];

            if (self::repo()->findByUserAndProduct($userId, $productId)) {
                Response::json(['eligible' => false, 'reason' => 'already_reviewed']);
            }

            if (!self::orders()->hasUserPurchasedProduct($userId, $productId)) {
                Response::json(['eligible' => false, 'reason' => 'not_purchased']);
            }

            Response::json(['eligible' => true]);
        } catch (\Exception) {
            Response::error('Failed to check review eligibility', 500);
        }
    }

    /**
     * Reviews are gated end to end, not just steered by the UI: this still
     * re-checks sign-in, purchase history, and duplicates even though the
     * storefront already used eligibility() to decide whether to show the
     * form at all — the API has to hold the line on its own.
     */
    public static function submit(): void
    {
        try {
            $customer = Auth::requireCustomer();
            $userId   = (string) $customer['userId'];

            $body      = Request::body();
            $productId = trim((string) ($body['productId'] ?? ''));
            $comment   = trim((string) ($body['comment'] ?? ''));
            if ($productId === '' || $comment === '') {
                Response::error('productId and comment are required', 400);
            }

            if (self::repo()->findByUserAndProduct($userId, $productId)) {
                Response::error('You have already reviewed this product. Thank you!', 409);
            }

            if (!self::orders()->hasUserPurchasedProduct($userId, $productId)) {
                Response::error('Only customers who have purchased this product can review it', 403);
            }

            $user = (new UserRepository())->getById($userId);
            if (!$user) {
                Response::error('Account not found', 404);
            }

            $images = is_array($body['images'] ?? null) ? array_slice(array_values(array_filter(
                $body['images'],
                static fn ($v) => is_string($v) && $v !== ''
            )), 0, 6) : [];

            $review = [
                'id'                 => Database::generateId('review'),
                'productId'          => $productId,
                'userId'             => $userId,
                'name'               => $user['name'] ?: 'Verified Buyer',
                'email'              => $user['email'] ?? '',
                'rating'             => max(1, min(5, (int) ($body['rating'] ?? 5))),
                'comment'            => htmlspecialchars($comment, ENT_QUOTES, 'UTF-8'),
                'images'             => $images,
                'isVerifiedPurchase' => true,
                'isApproved'         => false,
                'createdAt'          => gmdate('c'),
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
