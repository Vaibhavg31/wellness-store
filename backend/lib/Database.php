<?php

declare(strict_types=1);

namespace Wellness;

/**
 * MySQL PDO connection holder — replaces the JSON flat-file Database.
 * All repositories and route helpers talk to the DB through Database::pdo().
 */
final class Database
{
    private static ?\PDO $pdo = null;
    private static string $uploadsDir = '';

    /** Sets uploads dir only — DB connects lazily on first pdo() call. */
    public static function init(string $baseDir): void
    {
        self::$uploadsDir = $baseDir . '/uploads';
        if (!is_dir(self::$uploadsDir)) {
            mkdir(self::$uploadsDir, 0755, true);
        }
    }

    /** Connects on first call; subsequent calls return the cached connection. */
    public static function pdo(): \PDO
    {
        if (self::$pdo === null) {
            $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
            $port = $_ENV['DB_PORT'] ?? '3306';
            $name = $_ENV['DB_NAME'] ?? 'wellness_store';
            $user = $_ENV['DB_USER'] ?? 'root';
            $pass = $_ENV['DB_PASS'] ?? '';

            $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
            self::$pdo = new \PDO($dsn, $user, $pass, [
                \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }
        return self::$pdo;
    }

    public static function uploadsDir(): string
    {
        return self::$uploadsDir;
    }

    public static function generateId(string $prefix): string
    {
        return $prefix . '-' . (string) (int) (microtime(true) * 1000) . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
    }
}
