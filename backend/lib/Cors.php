<?php

declare(strict_types=1);

namespace Wellness;

/**
 * CORS handling — mirrors the Express allowedOrigins list.
 */
final class Cors
{
    public static function handle(): void
    {
        $allowed = array_filter([
            'http://localhost:5173',
            'http://localhost:4173',
            $_ENV['FRONTEND_URL'] ?? null,
        ]);

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array($origin, $allowed, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
