<?php

declare(strict_types=1);

namespace Krivea;

/**
 * Loads config.json's active environment block into $_ENV / putenv() so the
 * rest of the codebase's existing $_ENV['SOME_KEY'] reads keep working
 * completely unchanged — this is the only place that knows config.json exists.
 */
final class ConfigLoader
{
    public static function load(string $configPath): void
    {
        if (!is_file($configPath)) {
            return;
        }

        $json = json_decode((string) file_get_contents($configPath), true);
        if (!is_array($json)) {
            return;
        }

        $environment = (string) ($json['environment'] ?? 'development');
        $values = $json[$environment] ?? null;
        if (!is_array($values)) {
            return;
        }

        foreach ($values as $key => $value) {
            if (!is_string($key) || array_key_exists($key, $_ENV)) {
                continue; // a real shell/server env var always wins over the file
            }
            $stringValue = is_string($value) ? $value : (string) $value;
            $_ENV[$key] = $stringValue;
            putenv("{$key}={$stringValue}");
        }
    }
}
