<?php

declare(strict_types=1);

namespace Wellness\Routes;

use Wellness\Auth;
use Wellness\Repository\SettingsRepository;
use Wellness\Request;
use Wellness\Response;

final class SettingsRoutes
{
    private static function repo(): SettingsRepository
    {
        static $repo = null;
        $repo ??= new SettingsRepository();
        return $repo;
    }

    public static function get(): void
    {
        try {
            // Deliberately not browser-cached: the admin Content page re-fetches
            // this same URL right after saving (PUT then GET) and must see its
            // own change immediately, not a cached pre-save response. Unlike
            // the product/category catalog, this payload doesn't grow with
            // store data, so there's no scaling win to caching it anyway.
            Response::json(self::repo()->get());
        } catch (\Exception) {
            Response::error('Failed to fetch settings', 500);
        }
    }

    public static function update(): void
    {
        Auth::requireAdmin();
        try {
            $body    = Request::body();
            $updated = self::repo()->set($body);
            Response::json($updated);
        } catch (\Exception $e) {
            error_log('[Settings Update] ' . $e->getMessage());
            Response::error('Failed to update settings', 500);
        }
    }
}
