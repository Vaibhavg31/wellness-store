<?php

declare(strict_types=1);

namespace Krivea;

use Krivea\Routes\AuthRoutes;
use Krivea\Routes\BannerRoutes;
use Krivea\Routes\BundleRoutes;
use Krivea\Routes\CategoryRoutes;
use Krivea\Routes\CouponRoutes;
use Krivea\Routes\FeedbackRoutes;
use Krivea\Routes\MediaRoutes;
use Krivea\Routes\NewsletterRoutes;
use Krivea\Routes\OrderRoutes;
use Krivea\Routes\ProductRoutes;
use Krivea\Routes\ReviewRoutes;
use Krivea\Routes\SettingsRoutes;
use Krivea\Routes\UploadRoutes;
use Krivea\Routes\UserRoutes;

/**
 * Simple HTTP router — maps URLs to route handlers.
 * Route order matters: specific paths before parameterized ones.
 */
final class Router
{
    public static function dispatch(string $method, string $uri): void
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $path = rtrim($path, '/') ?: '/';

        // Health check (+ OTP mode for local production testing)
        if ($method === 'GET' && $path === '/api/health') {
            $outboundIp = OtpLogger::serverOutboundIp();
            Response::json([
                'status' => 'ok',
                'timestamp' => gmdate('c'),
                'email' => [
                    'provider' => 'brevo',
                    'configured' => EmailService::isEnabled(),
                    'verification' => AppConfig::skipEmailVerify() ? 'skipped (SKIP_EMAIL_VERIFY)' : 'required',
                    'hint' => EmailService::isEnabled()
                        ? 'Brevo is ready — sign-up, forgot password, and order emails use the REST API.'
                        : 'Set BREVO_API_KEY and BREVO_SENDER_EMAIL in config.json.',
                ],
                'profile' => AppConfig::healthProfile(),
                'otp' => [
                    ...OtpConfig::status(),
                    'delivery' => 'server (SendOTP API — checkout send/verify/resend; logs in MSG91 → SendOTP)',
                    'serverOutboundIp' => $outboundIp,
                    'whitelistHint' => $outboundIp
                        ? "Add {$outboundIp} in MSG91 → Authkey → IP Security (required for send, verify, and retry)."
                        : 'Could not detect outbound IP — check MSG91 Failed Logs for the IP to whitelist.',
                ],
            ]);
        }

        // ── Auth ──────────────────────────────────────────
        if ($method === 'POST' && $path === '/api/auth/google') {
            AuthRoutes::google();
        }
        if ($method === 'POST' && $path === '/api/auth/register') {
            AuthRoutes::register();
        }
        if ($method === 'POST' && $path === '/api/auth/login') {
            AuthRoutes::login();
        }
        if ($method === 'POST' && $path === '/api/auth/forgot-password') {
            AuthRoutes::forgotPassword();
        }
        if ($method === 'POST' && $path === '/api/auth/reset-password') {
            AuthRoutes::resetPassword();
        }
        if ($method === 'POST' && $path === '/api/auth/verify-email') {
            AuthRoutes::verifyEmail();
        }
        if ($method === 'POST' && $path === '/api/auth/resend-verification') {
            AuthRoutes::resendVerification();
        }
        if ($method === 'GET' && $path === '/api/auth/me') {
            AuthRoutes::me();
        }
        if ($method === 'POST' && $path === '/api/auth/admin/login') {
            AuthRoutes::adminLogin();
        }
        if ($method === 'POST' && $path === '/api/auth/verify-phone') {
            AuthRoutes::verifyPhone();
        }
        if ($method === 'POST' && $path === '/api/auth/send-phone-otp') {
            AuthRoutes::sendPhoneOtp();
        }
        if ($method === 'POST' && $path === '/api/auth/resend-phone-otp') {
            AuthRoutes::resendPhoneOtp();
        }
        if ($method === 'POST' && $path === '/api/auth/confirm-phone-otp') {
            AuthRoutes::confirmPhoneOtp();
        }
        if ($method === 'GET' && $path === '/api/auth/otp-logs') {
            AuthRoutes::otpLogs();
        }

        // ── Products ──────────────────────────────────────
        if ($method === 'GET' && $path === '/api/products') {
            ProductRoutes::listPublic();
        }
        if ($method === 'GET' && $path === '/api/products/admin/all') {
            ProductRoutes::listAdmin();
        }
        if ($method === 'GET' && $path === '/api/products/trending') {
            ProductRoutes::trending();
        }
        if ($method === 'GET' && preg_match('#^/api/products/admin/([^/]+)$#', $path, $m)) {
            ProductRoutes::getAdmin($m[1]);
        }
        if ($method === 'POST' && $path === '/api/products') {
            ProductRoutes::create();
        }
        if ($method === 'PUT' && preg_match('#^/api/products/([^/]+)$#', $path, $m)) {
            ProductRoutes::update($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/products/([^/]+)$#', $path, $m)) {
            ProductRoutes::delete($m[1]);
        }
        if ($method === 'GET' && preg_match('#^/api/products/([^/]+)$#', $path, $m)) {
            ProductRoutes::getPublic($m[1]);
        }

        // ── Categories ────────────────────────────────────
        if ($method === 'GET' && $path === '/api/categories') {
            CategoryRoutes::listPublic();
        }
        if ($method === 'GET' && $path === '/api/categories/admin/all') {
            CategoryRoutes::listAdmin();
        }
        if ($method === 'POST' && $path === '/api/categories') {
            CategoryRoutes::create();
        }
        if ($method === 'PUT' && preg_match('#^/api/categories/([^/]+)$#', $path, $m)) {
            CategoryRoutes::update($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/categories/([^/]+)$#', $path, $m)) {
            CategoryRoutes::delete($m[1]);
        }
        if ($method === 'GET' && preg_match('#^/api/categories/([^/]+)$#', $path, $m)) {
            CategoryRoutes::getBySlug($m[1]);
        }

        // ── Banners ───────────────────────────────────────
        if ($method === 'GET' && $path === '/api/banners') {
            BannerRoutes::listPublic();
        }
        if ($method === 'GET' && $path === '/api/banners/admin/all') {
            BannerRoutes::listAdmin();
        }
        if ($method === 'POST' && $path === '/api/banners') {
            BannerRoutes::create();
        }
        if ($method === 'PUT' && preg_match('#^/api/banners/([^/]+)$#', $path, $m)) {
            BannerRoutes::update($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/banners/([^/]+)$#', $path, $m)) {
            BannerRoutes::delete($m[1]);
        }

        // ── Reviews ───────────────────────────────────────
        if ($method === 'GET' && $path === '/api/reviews') {
            ReviewRoutes::listPublic();
        }
        if ($method === 'GET' && $path === '/api/reviews/admin/all') {
            ReviewRoutes::listAdmin();
        }
        if ($method === 'POST' && $path === '/api/reviews') {
            ReviewRoutes::submit();
        }
        if ($method === 'POST' && $path === '/api/reviews/admin') {
            ReviewRoutes::createAdmin();
        }
        if ($method === 'PUT' && preg_match('#^/api/reviews/([^/]+)/approve$#', $path, $m)) {
            ReviewRoutes::approve($m[1]);
        }
        if ($method === 'PUT' && preg_match('#^/api/reviews/([^/]+)/reject$#', $path, $m)) {
            ReviewRoutes::reject($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/reviews/([^/]+)$#', $path, $m)) {
            ReviewRoutes::delete($m[1]);
        }

        // ── Feedback ──────────────────────────────────────
        if ($method === 'POST' && $path === '/api/feedback') {
            FeedbackRoutes::submit();
        }
        if ($method === 'GET' && $path === '/api/feedback') {
            FeedbackRoutes::listAdmin();
        }
        if ($method === 'PUT' && preg_match('#^/api/feedback/([^/]+)/read$#', $path, $m)) {
            FeedbackRoutes::markRead($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/feedback/([^/]+)$#', $path, $m)) {
            FeedbackRoutes::delete($m[1]);
        }

        // ── Settings ──────────────────────────────────────
        if ($method === 'GET' && $path === '/api/settings') {
            SettingsRoutes::get();
        }
        if ($method === 'PUT' && $path === '/api/settings') {
            SettingsRoutes::update();
        }

        // ── Upload ────────────────────────────────────────
        if ($method === 'POST' && $path === '/api/upload') {
            UploadRoutes::single();
        }
        if ($method === 'POST' && $path === '/api/upload/multiple') {
            UploadRoutes::multiple();
        }

        // ── Media Library ─────────────────────────────────
        if ($method === 'GET' && $path === '/api/media') {
            MediaRoutes::listAdmin();
        }
        if ($method === 'DELETE' && preg_match('#^/api/media/([^/]+)$#', $path, $m)) {
            MediaRoutes::delete($m[1]);
        }

        // ── Coupons ───────────────────────────────────────
        if ($method === 'GET' && $path === '/api/coupons/public') {
            CouponRoutes::listPublic();
        }
        if ($method === 'POST' && $path === '/api/coupons/validate') {
            CouponRoutes::validate();
        }
        if ($method === 'POST' && $path === '/api/coupons/auto-apply') {
            CouponRoutes::autoApply();
        }
        if ($method === 'GET' && $path === '/api/coupons/admin/all') {
            CouponRoutes::listAdmin();
        }
        if ($method === 'GET' && preg_match('#^/api/coupons/admin/([^/]+)$#', $path, $m)) {
            CouponRoutes::getAdmin($m[1]);
        }
        if ($method === 'POST' && $path === '/api/coupons') {
            CouponRoutes::create();
        }
        if ($method === 'PUT' && preg_match('#^/api/coupons/([^/]+)/toggle$#', $path, $m)) {
            CouponRoutes::toggle($m[1]);
        }
        if ($method === 'PUT' && preg_match('#^/api/coupons/([^/]+)$#', $path, $m)) {
            CouponRoutes::update($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/coupons/([^/]+)$#', $path, $m)) {
            CouponRoutes::delete($m[1]);
        }

        // ── Bundles ───────────────────────────────────────
        if ($method === 'GET' && $path === '/api/bundles') {
            BundleRoutes::listPublic();
        }
        if ($method === 'GET' && $path === '/api/bundles/admin/all') {
            BundleRoutes::listAdmin();
        }
        if ($method === 'GET' && preg_match('#^/api/bundles/admin/([^/]+)$#', $path, $m)) {
            BundleRoutes::getAdmin($m[1]);
        }
        if ($method === 'POST' && $path === '/api/bundles') {
            BundleRoutes::create();
        }
        if ($method === 'PUT' && preg_match('#^/api/bundles/([^/]+)/toggle$#', $path, $m)) {
            BundleRoutes::toggle($m[1]);
        }
        if ($method === 'PUT' && preg_match('#^/api/bundles/([^/]+)$#', $path, $m)) {
            BundleRoutes::update($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/bundles/([^/]+)$#', $path, $m)) {
            BundleRoutes::delete($m[1]);
        }

        // ── Orders ────────────────────────────────────────
        if ($method === 'GET' && $path === '/api/orders') {
            OrderRoutes::list();
        }
        if ($method === 'GET' && $path === '/api/orders/admin/all') {
            OrderRoutes::listAdmin();
        }
        if ($method === 'GET' && $path === '/api/orders/admin/export') {
            OrderRoutes::exportAdmin();
        }
        if ($method === 'POST' && $path === '/api/orders/admin/create-direct') {
            OrderRoutes::createDirect();
        }
        if ($method === 'GET' && preg_match('#^/api/orders/admin/([^/]+)$#', $path, $m)) {
            OrderRoutes::getOneAdmin($m[1]);
        }
        if ($method === 'GET' && preg_match('#^/api/orders/([^/]+)$#', $path, $m)) {
            OrderRoutes::getOne($m[1]);
        }
        if ($method === 'PUT' && preg_match('#^/api/orders/([^/]+)/status$#', $path, $m)) {
            OrderRoutes::updateStatus($m[1]);
        }
        if ($method === 'PUT' && preg_match('#^/api/orders/([^/]+)/details$#', $path, $m)) {
            OrderRoutes::updateDetails($m[1]);
        }
        if ($method === 'POST' && $path === '/api/orders/admin/bulk-status') {
            OrderRoutes::bulkUpdateStatus();
        }
        if ($method === 'POST' && $path === '/api/orders/admin/bulk-refund') {
            OrderRoutes::bulkRefund();
        }
        if ($method === 'POST' && $path === '/api/orders/verify-payment') {
            OrderRoutes::verifyPayment();
        }
        if ($method === 'POST' && $path === '/api/webhooks/razorpay') {
            OrderRoutes::razorpayWebhook();
        }
        if ($method === 'POST' && $path === '/api/orders/cancel-pending') {
            OrderRoutes::cancelPending();
        }
        if ($method === 'POST' && $path === '/api/orders') {
            OrderRoutes::create();
        }

        // ── Newsletter ────────────────────────────────────
        if ($method === 'POST' && $path === '/api/newsletter/subscribe') {
            NewsletterRoutes::subscribe();
        }
        if ($method === 'GET' && $path === '/api/newsletter') {
            NewsletterRoutes::listAdmin();
        }
        if ($method === 'DELETE' && preg_match('#^/api/newsletter/([^/]+)$#', $path, $m)) {
            NewsletterRoutes::delete($m[1]);
        }

        // ── Users ─────────────────────────────────────────
        if ($method === 'GET' && $path === '/api/users/addresses') {
            UserRoutes::listAddresses();
        }
        if ($method === 'POST' && $path === '/api/users/addresses') {
            UserRoutes::createAddress();
        }
        if ($method === 'PUT' && preg_match('#^/api/users/addresses/([^/]+)/default$#', $path, $m)) {
            UserRoutes::setDefaultAddress($m[1]);
        }
        if ($method === 'PUT' && preg_match('#^/api/users/addresses/([^/]+)$#', $path, $m)) {
            UserRoutes::updateAddress($m[1]);
        }
        if ($method === 'DELETE' && preg_match('#^/api/users/addresses/([^/]+)$#', $path, $m)) {
            UserRoutes::deleteAddress($m[1]);
        }
        if ($method === 'GET' && $path === '/api/users/admin/all') {
            UserRoutes::listAdmin();
        }
        if ($method === 'GET' && $path === '/api/users/admin/export') {
            UserRoutes::exportAdmin();
        }
        if ($method === 'PUT' && preg_match('#^/api/users/admin/([^/]+)/block$#', $path, $m)) {
            UserRoutes::setBlocked($m[1]);
        }
        if ($method === 'PUT' && preg_match('#^/api/users/admin/([^/]+)/phone$#', $path, $m)) {
            UserRoutes::setPhone($m[1]);
        }
        if ($method === 'GET' && preg_match('#^/api/users/admin/([^/]+)$#', $path, $m)) {
            UserRoutes::getOneAdmin($m[1]);
        }

        Response::error('Not found', 404);
    }
}
