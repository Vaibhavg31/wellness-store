<?php

declare(strict_types=1);

namespace Wellness\Routes;

use Wellness\Auth;
use Wellness\Database;
use Wellness\Repository\MediaRepository;
use Wellness\Response;

final class MediaRoutes
{
    private static function repo(): MediaRepository
    {
        static $repo = null;
        $repo ??= new MediaRepository();
        return $repo;
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            Response::json(self::repo()->list());
        } catch (\Exception) {
            Response::error('Failed to fetch media library', 500);
        }
    }

    public static function delete(string $id): void
    {
        Auth::requireAdmin();
        try {
            $mediaId = (int) $id;
            $item = self::repo()->findById($mediaId);
            if (!$item) {
                Response::error('Media not found', 404);
            }

            self::repo()->delete($mediaId);

            // Best-effort: remove the underlying file if it lives in our own
            // uploads dir. Never fails the request if the file is already gone.
            if (str_starts_with($item['url'], '/uploads/')) {
                $path = Database::uploadsDir() . '/' . basename($item['url']);
                if (is_file($path)) {
                    @unlink($path);
                }
            }

            Response::json(['success' => true]);
        } catch (\Exception) {
            Response::error('Failed to delete media', 500);
        }
    }
}
