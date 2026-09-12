<?php

declare(strict_types=1);

namespace Krivea;

use Krivea\Repository\SettingsRepository;

/**
 * Store-wide service toggles from settings.json (admin Settings page).
 * Env vars still required for credentials; toggles control business on/off.
 */
final class ServicesConfig
{
    public static function isEmailEnabled(): bool
    {
        return self::serviceFlag('emailEnabled');
    }

    public static function isOtpEnabled(): bool
    {
        return self::serviceFlag('otpEnabled');
    }

    public static function isGoogleSignInEnabled(): bool
    {
        return self::serviceFlag('googleSignInEnabled');
    }

    public static function isCodEnabled(): bool
    {
        return self::paymentFlag('codEnabled');
    }

    public static function isOnlinePaymentEnabled(): bool
    {
        return self::paymentFlag('onlinePaymentEnabled');
    }

    private static function serviceFlag(string $key): bool
    {
        try {
            $settings = (new SettingsRepository())->get();
            $services = $settings['services'] ?? [];

            return ($services[$key] ?? true) !== false;
        } catch (\Throwable) {
            return true;
        }
    }

    private static function paymentFlag(string $key): bool
    {
        try {
            $settings = (new SettingsRepository())->get();
            $payments = $settings['payments'] ?? [];

            return ($payments[$key] ?? true) !== false;
        } catch (\Throwable) {
            return true;
        }
    }
}
