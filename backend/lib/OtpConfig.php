<?php

declare(strict_types=1);

namespace Krivea;

/**
 * OTP mode for checkout phone verification.
 *
 * MSG91_OTP_MODE (dev only):
 *   production — real MSG91, production rate limits, no dev bypass (matches live behaviour)
 *   live       — real MSG91, relaxed dev rate limits (default)
 *   skip       — fake OTP 000000, no MSG91 calls
 */
final class OtpConfig
{
    public static function mode(): string
    {
        if (($_ENV['APP_ENV'] ?? '') === 'production') {
            return 'production';
        }

        $mode = strtolower(trim($_ENV['MSG91_OTP_MODE'] ?? 'live'));
        return match ($mode) {
            'production', 'prod', 'live' => 'live',
            'skip', 'mock', 'dev' => 'skip',
            default => 'live',
        };
    }

    /** Real MSG91 send/verify (production behaviour). */
    public static function isLiveMode(): bool
    {
        if (($_ENV['APP_ENV'] ?? '') === 'production') {
            return true;
        }

        return self::mode() === 'live';
    }

    /** Skip MSG91 and auto-verify checkout phone (dev only, or OTP disabled in settings). */
    public static function shouldSkipVerify(): bool
    {
        if (!ServicesConfig::isOtpEnabled()) {
            return true;
        }

        if (($_ENV['APP_ENV'] ?? '') === 'production') {
            return false;
        }

        if (($_ENV['SKIP_PHONE_VERIFY'] ?? 'false') === 'true') {
            return true;
        }

        if (self::isLiveMode()) {
            return false;
        }

        return self::mode() === 'skip';
    }

    /** Max OTP send attempts per 15-minute window. */
    public static function maxSendAttempts(): int
    {
        $productionLimits = self::usesProductionRateLimits();

        if (($_ENV['APP_ENV'] ?? '') === 'production' || $productionLimits) {
            return 8;
        }

        return 15;
    }

    public static function usesProductionRateLimits(): bool
    {
        if (($_ENV['APP_ENV'] ?? '') === 'production') {
            return true;
        }

        $mode = strtolower(trim($_ENV['MSG91_OTP_MODE'] ?? 'live'));
        return in_array($mode, ['production', 'prod'], true);
    }

    public static function includeDebugHints(): bool
    {
        return ($_ENV['APP_ENV'] ?? '') === 'development'
            && !self::usesProductionRateLimits();
    }

    /** @return array<string, mixed> */
    public static function status(): array
    {
        return [
            'mode' => self::isLiveMode() ? 'live' : 'skip',
            'productionTest' => self::usesProductionRateLimits() && ($_ENV['APP_ENV'] ?? '') === 'development',
            'productionLimits' => self::usesProductionRateLimits(),
            'skipVerify' => self::shouldSkipVerify(),
            'otpEnabled' => ServicesConfig::isOtpEnabled(),
            'maxSendAttempts' => self::maxSendAttempts(),
            'msg91Configured' => trim($_ENV['MSG91_AUTH_KEY'] ?? '') !== ''
                && trim($_ENV['MSG91_OTP_TEMPLATE_ID'] ?? '') !== '',
        ];
    }
}
