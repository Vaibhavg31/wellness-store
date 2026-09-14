<?php

declare(strict_types=1);

namespace Wellness\Routes;

use Wellness\Auth;
use Wellness\Database;
use Wellness\Repository\NewsletterRepository;
use Wellness\Request;
use Wellness\Response;

final class NewsletterRoutes
{
    private static function repo(): NewsletterRepository
    {
        static $repo = null;
        $repo ??= new NewsletterRepository();
        return $repo;
    }

    public static function subscribe(): void
    {
        try {
            $body = Request::body();
            $email = strtolower(trim((string) ($body['email'] ?? '')));

            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                Response::error('A valid email address is required', 400);
            }

            if (self::repo()->findByEmail($email)) {
                Response::json(['success' => true, 'message' => 'Already subscribed']);
                return;
            }

            $subscriber = [
                'id'        => Database::generateId('sub'),
                'email'     => $email,
                'source'    => htmlspecialchars((string) ($body['source'] ?? 'website'), ENT_QUOTES, 'UTF-8'),
                'createdAt' => gmdate('c'),
            ];

            Response::json(self::repo()->create($subscriber), 201);
        } catch (\Exception) {
            Response::error('Failed to subscribe', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            $all = self::repo()->getAll();
            usort($all, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
            Response::json($all);
        } catch (\Exception) {
            Response::error('Failed to fetch subscribers', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Subscriber not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete subscriber', 500);
        }
    }
}
