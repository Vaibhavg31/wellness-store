<?php

declare(strict_types=1);

namespace Krivea;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * JWT authentication — same token format as the Express backend.
 */
final class Auth
{
    private static function secret(): string
    {
        return $_ENV['JWT_SECRET'] ?? 'krivea-dev-secret-change-in-production';
    }

    /** @param array{role: string, userId?: string, email?: string} $payload */
    public static function signToken(array $payload, string $expiresIn = '24h'): string
    {
        $seconds = match ($expiresIn) {
            '24h' => 86400,
            '7d' => 604800,
            default => 86400,
        };

        $payload['iat'] = time();
        $payload['exp'] = time() + $seconds;

        return JWT::encode($payload, self::secret(), 'HS256');
    }

    /** @return array{role: string, userId?: string, email?: string} */
    public static function verifyToken(string $token): array
    {
        $decoded = JWT::decode($token, new Key(self::secret(), 'HS256'));
        return (array) $decoded;
    }

    public static function getBearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }
        return null;
    }

    /** @return array{role: string, userId?: string, email?: string} */
    public static function requireAdmin(): array
    {
        $token = self::getBearerToken();
        if (!$token) {
            Response::error('Unauthorized', 401);
        }

        try {
            $payload = self::verifyToken($token);
            if (($payload['role'] ?? '') !== 'admin') {
                Response::error('Forbidden', 403);
            }
            return $payload;
        } catch (\Exception) {
            Response::error('Invalid or expired token', 401);
        }
    }

    /** @return array{role: string, userId?: string, email?: string} | null */
    public static function optionalCustomer(): ?array
    {
        $token = self::getBearerToken();
        if (!$token) {
            return null;
        }

        try {
            $payload = self::verifyToken($token);
            if (($payload['role'] ?? '') !== 'customer' || empty($payload['userId'])) {
                return null;
            }
            return $payload;
        } catch (\Exception) {
            return null;
        }
    }

    /** @return array{role: string, userId?: string, email?: string} */
    public static function requireCustomer(): array
    {
        $token = self::getBearerToken();
        if (!$token) {
            Response::error('Please sign in to continue', 401);
        }

        try {
            $payload = self::verifyToken($token);
            if (($payload['role'] ?? '') !== 'customer' || empty($payload['userId'])) {
                Response::error('Customer account required', 403);
            }
            self::rejectIfBlocked((string) $payload['userId']);
            return $payload;
        } catch (\Exception) {
            Response::error('Invalid or expired session. Please sign in again.', 401);
        }
    }

    public static function rejectIfBlocked(string $userId): void
    {
        if ((new \Krivea\Repository\UserRepository())->isBlocked($userId)) {
            Response::error('Your account has been blocked. Please contact support.', 403);
        }
    }
}
