<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\Database;
use Krivea\Repository\FeedbackRepository;
use Krivea\Request;
use Krivea\Response;

final class FeedbackRoutes
{
    private static function repo(): FeedbackRepository
    {
        static $repo = null;
        $repo ??= new FeedbackRepository();
        return $repo;
    }

    public static function submit(): void
    {
        try {
            $body = Request::body();
            if (empty($body['name']) || empty($body['email']) || empty($body['message'])) {
                Response::error('name, email and message are required', 400);
            }

            $email = strtolower(trim((string) $body['email']));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                Response::error('Enter a valid email address', 400);
            }

            $item = [
                'id'        => Database::generateId('fb'),
                'name'      => htmlspecialchars((string) $body['name'],    ENT_QUOTES, 'UTF-8'),
                'email'     => htmlspecialchars($email, ENT_QUOTES, 'UTF-8'),
                'message'   => htmlspecialchars((string) $body['message'], ENT_QUOTES, 'UTF-8'),
                'isRead'    => false,
                'createdAt' => gmdate('c'),
            ];

            Response::json(self::repo()->create($item), 201);
        } catch (\Exception) {
            Response::error('Failed to submit feedback', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            Response::json(self::repo()->getAll());
        } catch (\Exception) {
            Response::error('Failed to fetch feedback', 500);
        }
    }

    public static function markRead(string $id): void
    {
        Auth::requireAdmin();
        try {
            $updated = self::repo()->markRead($id);
            $updated ? Response::json($updated) : Response::error('Feedback not found', 404);
        } catch (\Exception) {
            Response::error('Failed to update feedback', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            self::repo()->delete($id)
                ? Response::json(['success' => true])
                : Response::error('Feedback not found', 404);
        } catch (\Exception) {
            Response::error('Failed to delete feedback', 500);
        }
    }
}
