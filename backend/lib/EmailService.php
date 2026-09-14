<?php

declare(strict_types=1);

namespace Wellness;

use Wellness\Repository\SettingsRepository;

/**
 * All transactional email via Brevo REST API (auth, orders, password reset).
 * Single provider — no SMTP required.
 */
final class EmailService
{
    public static function isEnabled(): bool
    {
        return BrevoService::isEnabled();
    }

    /** @alias isEnabled — used by auth routes and health check */
    public static function isAuthEmailEnabled(): bool
    {
        return self::isEnabled();
    }

    /**
     * @param array{tags?: list<string>} $options
     * @return array{ok: bool, messageId?: string, error?: string, httpCode?: int}
     */
    public static function sendTransactionalEmail(
        string $to,
        string $subject,
        string $htmlContent,
        ?string $toName = null,
        array $options = [],
    ): array {
        return BrevoService::sendTransactionalEmail($to, $subject, $htmlContent, $toName, $options);
    }

    /** @return array{ok: bool, messageId?: string, error?: string, httpCode?: int} */
    public static function sendEmailVerification(string $to, string $name, string $verifyUrl): array
    {
        $brand = self::brandName();
        $year = (string) gmdate('Y');
        $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeUrl = htmlspecialchars($verifyUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $html = <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:32px 16px;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
                        <tr><td>
                            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#2c241c;">{$brand}</p>
                            <p style="margin:0 0 24px;font-size:14px;color:#8b7355;">Confirm your email to sign in</p>
                            <p style="margin:0 0 12px;font-size:16px;color:#2c241c;">Hi {$safeName},</p>
                            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3f35;">
                                Thanks for creating your account. Click the button below to verify your email address and complete sign-in.
                            </p>
                            <p style="margin:28px 0;text-align:center;">
                                <a href="{$safeUrl}" style="display:inline-block;padding:14px 32px;background:#0F5132;color:#faf7f2;text-decoration:none;border-radius:999px;font-weight:600;">
                                    Verify email &amp; sign in
                                </a>
                            </p>
                            <p style="margin:0 0 8px;font-size:13px;color:#8b7355;">This secure link expires in 24 hours.</p>
                            <p style="margin:0;font-size:12px;color:#b0a08d;">If you did not create an account, you can ignore this email.<br>© {$year} {$brand}</p>
                        </td></tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>
        HTML;

        return self::sendTransactionalEmail(
            $to,
            'Verify your email & sign in — ' . $brand,
            $html,
            $name,
            ['tags' => ['email-verification', 'auth']],
        );
    }

    /** @return array{ok: bool, messageId?: string, error?: string, httpCode?: int} */
    public static function sendPasswordReset(string $to, string $name, string $resetUrl): array
    {
        $brand = self::brandName();
        $year = (string) gmdate('Y');
        $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeUrl = htmlspecialchars($resetUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $html = <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:32px 16px;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
                        <tr><td>
                            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#2c241c;">{$brand}</p>
                            <p style="margin:0 0 24px;font-size:14px;color:#8b7355;">Reset your password</p>
                            <p style="margin:0 0 12px;font-size:16px;color:#2c241c;">Hi {$safeName},</p>
                            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3f35;">
                                We received a request to reset your password. Click the button below to choose a new one.
                            </p>
                            <p style="margin:28px 0;text-align:center;">
                                <a href="{$safeUrl}" style="display:inline-block;padding:14px 32px;background:#0F5132;color:#faf7f2;text-decoration:none;border-radius:999px;font-weight:600;">
                                    Reset password
                                </a>
                            </p>
                            <p style="margin:0 0 8px;font-size:13px;color:#8b7355;">This link expires in 1 hour.</p>
                            <p style="margin:0;font-size:12px;color:#b0a08d;">If you did not request this, ignore this email — your password stays the same.<br>© {$year} {$brand}</p>
                        </td></tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>
        HTML;

        return self::sendTransactionalEmail(
            $to,
            'Reset your password — ' . $brand,
            $html,
            $name,
            ['tags' => ['password-reset', 'auth']],
        );
    }

    /** @param array<string, mixed> $order */
    public static function handleOrderEvent(array $order, string $event): void
    {
        BrevoService::handleOrderEvent($order, $event);
    }

    private static function brandName(): string
    {
        $name = trim((string) ($_ENV['BREVO_SENDER_NAME'] ?? ''));
        if ($name !== '') {
            return $name;
        }

        try {
            $settings = (new SettingsRepository())->get();
            return (string) ($settings['brandName'] ?? 'Wellness Store');
        } catch (\Throwable) {
            return 'Wellness Store';
        }
    }
}
