<?php

declare(strict_types=1);

namespace Wellness;

/**
 * Environment profile — production-like behaviour while running locally (npm run dev).
 */
final class AppConfig
{
    public static function env(): string
    {
        return strtolower(trim((string) ($_ENV['APP_ENV'] ?? 'development')));
    }

    public static function isProduction(): bool
    {
        return self::env() === 'production';
    }

    public static function isDevelopment(): bool
    {
        return !self::isProduction();
    }

    public static function skipEmailVerify(): bool
    {
        return filter_var($_ENV['SKIP_EMAIL_VERIFY'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
    }

    public static function skipPhoneVerify(): bool
    {
        return filter_var($_ENV['SKIP_PHONE_VERIFY'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
    }

    public static function skipPhoneVerifyFrontend(): bool
    {
        return filter_var($_ENV['VITE_SKIP_PHONE_VERIFY'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Local dev with the same auth/checkout rules as production (real Brevo + real OTP).
     */
    public static function isProductionLikeDev(): bool
    {
        if (self::isProduction()) {
            return false;
        }

        return !self::skipEmailVerify()
            && !self::skipPhoneVerify()
            && !self::skipPhoneVerifyFrontend()
            && EmailService::isEnabled()
            && !OtpConfig::shouldSkipVerify();
    }

    /** @return array<string, mixed> */
    public static function healthProfile(): array
    {
        $productionLike = self::isProductionLikeDev();

        return [
            'appEnv'              => self::env(),
            'productionLikeDev'   => $productionLike,
            'emailVerification'   => self::skipEmailVerify() ? 'skipped' : 'required',
            'phoneOtpAtCheckout'  => OtpConfig::shouldSkipVerify() ? 'skipped' : 'required',
            'recommendation'      => $productionLike
                ? 'Dev matches production auth & checkout — safe to test sign-up, email links, and OTP.'
                : self::productionLikeHint(),
        ];
    }

    private static function productionLikeHint(): string
    {
        $fixes = [];
        if (self::skipEmailVerify()) {
            $fixes[] = 'set SKIP_EMAIL_VERIFY=false';
        }
        if (self::skipPhoneVerify()) {
            $fixes[] = 'set SKIP_PHONE_VERIFY=false';
        }
        if (self::skipPhoneVerifyFrontend()) {
            $fixes[] = 'set VITE_SKIP_PHONE_VERIFY=false (not "fase")';
        }
        if (!EmailService::isEnabled()) {
            $fixes[] = 'configure BREVO_API_KEY + BREVO_SENDER_EMAIL';
        }
        if (OtpConfig::shouldSkipVerify() && !self::skipPhoneVerify()) {
            $fixes[] = 'set MSG91_OTP_MODE=production or enable OTP in store settings';
        }

        return $fixes === []
            ? 'Adjust config.json for production-like testing.'
            : 'For production-like dev: ' . implode('; ', $fixes) . '.';
    }
}
