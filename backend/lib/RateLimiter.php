<?php

declare(strict_types=1);

namespace Wellness;

/**
 * MySQL-backed rate limiter — replaces JSON flat-file storage.
 * init() is kept for API compatibility but does nothing (Database::init() handles connection).
 */
final class RateLimiter
{
    public static function init(string $baseDir): void
    {
        // No-op: Database::init() already set up the PDO connection.
    }

    public static function check(string $key, int $max = 5, int $windowSeconds = 900): bool
    {
        $pdo = Database::pdo();
        $now = time();

        $stmt = $pdo->prepare('SELECT count, UNIX_TIMESTAMP(reset_at) AS reset_ts FROM rate_limits WHERE rate_key = ? LIMIT 1');
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        if (!$row || $now > (int) $row['reset_ts']) {
            // New window
            $resetAt = gmdate('Y-m-d H:i:s', $now + $windowSeconds);
            $pdo->prepare(
                'INSERT INTO rate_limits (rate_key, count, reset_at) VALUES (?, 1, ?)
                 ON DUPLICATE KEY UPDATE count = 1, reset_at = VALUES(reset_at)'
            )->execute([$key, $resetAt]);
            return true;
        }

        if ((int) $row['count'] >= $max) {
            return false;
        }

        $pdo->prepare('UPDATE rate_limits SET count = count + 1 WHERE rate_key = ?')->execute([$key]);
        return true;
    }

    public static function retryAfterSeconds(string $key): ?int
    {
        try {
            $stmt = Database::pdo()->prepare(
                'SELECT UNIX_TIMESTAMP(reset_at) AS reset_ts FROM rate_limits WHERE rate_key = ? LIMIT 1'
            );
            $stmt->execute([$key]);
            $row = $stmt->fetch();
        } catch (\Throwable) {
            return null;
        }

        if (!$row) {
            return null;
        }

        $remaining = (int) $row['reset_ts'] - time();
        return $remaining > 0 ? $remaining : null;
    }
}
