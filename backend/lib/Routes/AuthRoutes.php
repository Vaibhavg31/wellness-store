<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Google\Client as GoogleClient;
use Krivea\Auth;
use Krivea\Database;
use Krivea\EmailService;
use Krivea\Msg91Service;
use Krivea\OtpConfig;
use Krivea\OtpLogger;
use Krivea\RateLimiter;
use Krivea\Repository\UserRepository;
use Krivea\Request;
use Krivea\Response;
use Krivea\ServicesConfig;

final class AuthRoutes
{
    private static function repo(): UserRepository
    {
        static $repo = null;
        $repo ??= new UserRepository();
        return $repo;
    }

    /** @return list<string> */
    private static function adminEmails(): array
    {
        $fromEnv = $_ENV['ADMIN_EMAILS'] ?? '';
        return array_values(array_filter(array_map(
            fn(string $e) => strtolower(trim($e)),
            explode(',', $fromEnv)
        )));
    }

    /** @param array{error?: string, msg91Code?: int|string|null, httpCode?: int|null} $result */
    private static function msg91ServiceError(array $result, string $fallback): never
    {
        $error = $result['error'] ?? $fallback;
        $outboundIp = OtpLogger::serverOutboundIp();
        if ($outboundIp && str_contains(strtolower($error), 'whitelist')) {
            $error .= " Whitelist IP: {$outboundIp}";
        }
        Response::error($error, 503);
    }

    /** @param array{error?: string, msg91Code?: int|string|null, httpCode?: int|null} $result */
    private static function isMsg91ServiceFailure(array $result): bool
    {
        $error = strtolower((string) ($result['error'] ?? ''));
        $code  = (string) ($result['msg91Code'] ?? '');

        if ($code === '418' || str_contains($error, 'whitelist')) {
            return true;
        }
        return str_contains($error, 'auth key')
            || str_contains($error, 'balance')
            || str_contains($error, 'network')
            || str_contains($error, 'not configured');
    }

    private static function publicUser(array $user): array
    {
        return [
            'id'                => $user['id'] ?? '',
            'email'             => $user['email'] ?? '',
            'name'              => $user['name'] ?? null,
            'avatar'            => $user['avatar'] ?? null,
            'phone'             => $user['phone'] ?? null,
            'phoneVerified'     => !empty($user['phoneVerified']),
            'emailVerified'     => self::isEmailVerified($user),
            'addresses'         => $user['addresses'] ?? [],
            'lastUsedAddressId' => $user['lastUsedAddressId'] ?? null,
        ];
    }

    private static function isEmailVerified(array $user): bool
    {
        if (!empty($user['emailVerified'])) {
            return true;
        }
        if (empty($user['passwordHash'])) {
            return true; // Google-only
        }
        if (!array_key_exists('emailVerified', $user)) {
            return true; // Legacy
        }
        return false;
    }

    private static function shouldSkipEmailVerify(): bool
    {
        return filter_var($_ENV['SKIP_EMAIL_VERIFY'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
    }

    private static function frontendUrl(): string
    {
        return rtrim(trim((string) ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173')), '/');
    }

    // -------------------------------------------------------------------------
    // Email-verification tokens — now backed by email_verification_tokens table
    // -------------------------------------------------------------------------

    /** @return array{token: string, verifyUrl: string} */
    private static function createVerificationToken(string $email): array
    {
        $token    = bin2hex(random_bytes(32));
        $hash     = hash('sha256', $token);
        $email    = strtolower($email);
        $now      = gmdate('Y-m-d H:i:s');
        $expires  = gmdate('Y-m-d H:i:s', time() + 86400);
        $pdo      = Database::pdo();

        // Delete any existing token for this email
        $pdo->prepare('DELETE FROM email_verification_tokens WHERE email = ?')->execute([$email]);
        $pdo->prepare(
            'INSERT INTO email_verification_tokens (email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
        )->execute([$email, $hash, $expires, $now]);

        $verifyUrl = self::frontendUrl()
            . '/verify-email?token=' . rawurlencode($token)
            . '&email=' . rawurlencode($email);

        return ['token' => $token, 'verifyUrl' => $verifyUrl];
    }

    private static function sendVerificationEmail(string $email, ?string $name = null): bool
    {
        if (self::shouldSkipEmailVerify()) {
            return true;
        }

        $displayName = ($name !== null && trim($name) !== '') ? trim($name) : 'there';
        ['verifyUrl' => $verifyUrl] = self::createVerificationToken($email);

        if (!EmailService::isEnabled()) {
            error_log('[Auth] Email verification link for ' . $email . ': ' . $verifyUrl);
            return false;
        }

        $result = EmailService::sendEmailVerification($email, $displayName, $verifyUrl);
        if (empty($result['ok'])) {
            error_log('[Auth] Verification email failed for ' . $email . ': ' . ($result['error'] ?? 'unknown'));
            error_log('[Auth] Fallback verification link: ' . $verifyUrl);
            return false;
        }

        return true;
    }

    private static function markUserEmailVerified(string $email): bool
    {
        $user = self::repo()->findByEmail($email);
        if (!$user) {
            return false;
        }
        self::repo()->update($user['id'], [
            'emailVerified'   => true,
            'emailVerifiedAt' => gmdate('c'),
        ]);
        return true;
    }

    public static function isEmailVerifiedForUser(array $user): bool
    {
        return self::isEmailVerified($user);
    }

    private static function issueCustomerToken(array $user, bool $remember = false): string
    {
        return Auth::signToken([
            'role'   => 'customer',
            'userId' => $user['id'],
            'email'  => $user['email'],
        ], $remember ? '7d' : '24h');
    }

    private static function findUserByEmail(string $email): ?array
    {
        return self::repo()->findByEmail($email);
    }

    private static function findUserById(string $userId): ?array
    {
        return self::repo()->getById($userId);
    }

    // -------------------------------------------------------------------------
    // Register
    // -------------------------------------------------------------------------

    public static function register(): void
    {
        $body            = Request::body();
        $email           = strtolower(trim((string) ($body['email'] ?? '')));
        $password        = (string) ($body['password'] ?? '');
        $confirmPassword = (string) ($body['confirmPassword'] ?? '');
        $name            = trim((string) ($body['name'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Enter a valid email address', 400);
        }
        if ($name === '') {
            Response::error('Full name is required', 400);
        }
        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters', 400);
        }
        if ($confirmPassword === '' || !hash_equals($password, $confirmPassword)) {
            Response::error('Passwords do not match', 400);
        }

        if (!RateLimiter::check('register-' . Request::ip(), 10, 3600)) {
            Response::error('Too many registration attempts. Try again later.', 429);
        }

        $existing = self::repo()->findByEmail($email);
        if ($existing) {
            if (!empty($existing['passwordHash'])) {
                Response::error('An account with this email already exists. Try signing in.', 409);
            }
            // Google-only account — add password
            $updates = [
                'passwordHash'    => password_hash($password, PASSWORD_BCRYPT),
                'emailVerified'   => true,
                'emailVerifiedAt' => $existing['emailVerifiedAt'] ?? gmdate('c'),
                'lastLogin'       => gmdate('c'),
            ];
            if ($name !== '' && empty($existing['name'])) {
                $updates['name'] = $name;
            }
            $updated = self::repo()->update($existing['id'], $updates) ?? $existing;
            $token   = self::issueCustomerToken($updated);
            Response::json([
                'role'  => 'customer',
                'token' => $token,
                'user'  => self::publicUser($updated),
            ]);
        }

        $now        = gmdate('c');
        $skipVerify = self::shouldSkipEmailVerify();
        $newUser    = [
            'id'              => Database::generateId('user'),
            'email'           => $email,
            'name'            => $name,
            'passwordHash'    => password_hash($password, PASSWORD_BCRYPT),
            'emailVerified'   => $skipVerify,
            'emailVerifiedAt' => $skipVerify ? $now : null,
            'createdAt'       => $now,
            'lastLogin'       => null,
        ];

        self::repo()->create($newUser);

        if (!$skipVerify) {
            $sent = self::sendVerificationEmail($email, $name);
            if (!$sent) {
                Response::error(
                    'Account created but we could not send the verification email. Try signing in and request a new link.',
                    503,
                );
            }
            Response::json([
                'pendingVerification'     => true,
                'email'                   => $email,
                'message'                 => 'Check your email for a verification link to complete sign-in.',
                'verificationEmailSent'   => true,
            ], 201);
        }

        self::repo()->update($newUser['id'], ['lastLogin' => $now]);
        $created = self::repo()->getById($newUser['id']) ?? $newUser;
        $token   = self::issueCustomerToken($created);
        Response::json([
            'role'                  => 'customer',
            'token'                 => $token,
            'user'                  => self::publicUser($created),
            'verificationEmailSent' => false,
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Login (email + password) with admin dev bypass
    // -------------------------------------------------------------------------

    public static function login(): void
    {
        $body     = Request::body();
        $email    = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $remember = !empty($body['rememberMe']);

        if (!$email || !$password) {
            Response::error('Email and password are required', 400);
        }

        if (!RateLimiter::check('login-' . Request::ip(), 20, 900)) {
            Response::error('Too many login attempts. Try again later.', 429);
        }

        // Admin dev bypass — no DB lookup, no verification required
        $adminDevPass = $_ENV['ADMIN_DEV_PASSWORD'] ?? '';
        if ($adminDevPass !== ''
            && in_array($email, self::adminEmails(), true)
            && hash_equals($adminDevPass, $password)
        ) {
            $token = Auth::signToken(['role' => 'admin', 'email' => $email]);
            Response::json([
                'role'     => 'admin',
                'token'    => $token,
                'redirect' => $_ENV['ADMIN_PATH'] ?? '/wellness-studio',
                'user'     => ['email' => $email],
            ]);
        }

        $user = self::repo()->findByEmail($email);
        if (!$user) {
            Response::error('Invalid email or password', 401);
        }
        if (empty($user['passwordHash'])) {
            Response::error('This account uses Google sign-in. Continue with Google, or use Forgot password to set a password.', 401);
        }
        if (!empty($user['isBlocked'])) {
            Response::error('Your account has been blocked. Please contact support.', 403);
        }
        if (!password_verify($password, (string) $user['passwordHash'])) {
            Response::error('Invalid email or password', 401);
        }
        if (!self::isEmailVerified($user)) {
            Response::json([
                'error' => 'Please verify your email before signing in. Check your inbox or request a new verification link.',
                'code'  => 'EMAIL_NOT_VERIFIED',
                'email' => $email,
            ], 403);
        }

        $user  = self::repo()->update($user['id'], ['lastLogin' => gmdate('c')]) ?? $user;
        $token = self::issueCustomerToken($user, $remember);
        Response::json([
            'role'  => 'customer',
            'token' => $token,
            'user'  => self::publicUser($user),
        ]);
    }

    // -------------------------------------------------------------------------
    // Forgot / reset password — backed by password_reset_tokens table
    // -------------------------------------------------------------------------

    public static function forgotPassword(): void
    {
        $body  = Request::body();
        $email = strtolower(trim((string) ($body['email'] ?? '')));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Enter a valid email address', 400);
        }
        if (!RateLimiter::check('forgot-' . Request::ip(), 5, 3600)) {
            Response::error('Too many reset requests. Try again later.', 429);
        }

        $user = self::repo()->findByEmail($email);
        if ($user) {
            $token   = bin2hex(random_bytes(32));
            $pdo     = Database::pdo();
            $now     = gmdate('Y-m-d H:i:s');
            $expires = gmdate('Y-m-d H:i:s', time() + 3600);

            $pdo->prepare('DELETE FROM password_reset_tokens WHERE email = ?')->execute([$email]);
            $pdo->prepare(
                'INSERT INTO password_reset_tokens (email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
            )->execute([$email, hash('sha256', $token), $expires, $now]);

            $resetUrl    = self::frontendUrl()
                . '/reset-password?token=' . rawurlencode($token)
                . '&email=' . rawurlencode($email);
            $displayName = trim((string) ($user['name'] ?? ''));
            $name        = $displayName !== '' ? $displayName : 'there';

            $result = EmailService::sendPasswordReset($email, $name, $resetUrl);
            if (empty($result['ok'])) {
                error_log('[Auth] Password reset email failed for ' . $email . ': ' . ($result['error'] ?? 'unknown'));
                error_log('[Auth] Fallback reset link: ' . $resetUrl);
            }
        }

        Response::json(['message' => 'If an account exists with that email, a reset link has been sent.']);
    }

    public static function resetPassword(): void
    {
        $body            = Request::body();
        $email           = strtolower(trim((string) ($body['email'] ?? '')));
        $token           = (string) ($body['token'] ?? '');
        $password        = (string) ($body['password'] ?? '');
        $confirmPassword = (string) ($body['confirmPassword'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $token === '') {
            Response::error('Invalid reset request', 400);
        }
        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters', 400);
        }
        if ($confirmPassword === '' || !hash_equals($password, $confirmPassword)) {
            Response::error('Passwords do not match', 400);
        }

        $tokenHash = hash('sha256', $token);
        $pdo       = Database::pdo();
        $stmt      = $pdo->prepare(
            'SELECT * FROM password_reset_tokens WHERE email = ? AND token_hash = ? LIMIT 1'
        );
        $stmt->execute([$email, $tokenHash]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Invalid or expired reset link', 400);
        }

        $expires = strtotime((string) $row['expires_at']);
        if ($expires && $expires < time()) {
            Response::error('Reset link has expired. Request a new one.', 400);
        }

        $user = self::repo()->findByEmail($email);
        if (!$user) {
            Response::error('Account not found', 404);
        }

        self::repo()->update($user['id'], [
            'passwordHash'    => password_hash($password, PASSWORD_BCRYPT),
            'emailVerified'   => true,
            'emailVerifiedAt' => gmdate('c'),
        ]);

        $pdo->prepare('DELETE FROM password_reset_tokens WHERE email = ? AND token_hash = ?')
            ->execute([$email, $tokenHash]);

        Response::json(['message' => 'Password updated. You can sign in with your new password.']);
    }

    // -------------------------------------------------------------------------
    // Verify email
    // -------------------------------------------------------------------------

    public static function verifyEmail(): void
    {
        $body      = Request::body();
        $email     = strtolower(trim((string) ($body['email'] ?? '')));
        $token     = (string) ($body['token'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $token === '') {
            Response::error('Invalid verification link', 400);
        }

        $tokenHash = hash('sha256', $token);
        $pdo       = Database::pdo();
        $stmt      = $pdo->prepare(
            'SELECT * FROM email_verification_tokens WHERE email = ? AND token_hash = ? LIMIT 1'
        );
        $stmt->execute([$email, $tokenHash]);
        $row = $stmt->fetch();

        if (!$row) {
            $user = self::repo()->findByEmail($email);
            if ($user && self::isEmailVerified($user)) {
                self::completeEmailVerificationLogin($user, 'Email already verified. You are signed in.');
            }
            Response::error('Invalid or expired verification link', 400);
        }

        $expires = strtotime((string) $row['expires_at']);
        if ($expires && $expires < time()) {
            Response::error('Verification link has expired. Request a new one from your account.', 400);
        }

        if (!self::markUserEmailVerified($email)) {
            Response::error('Account not found', 404);
        }

        $pdo->prepare('DELETE FROM email_verification_tokens WHERE email = ?')->execute([$email]);

        $user = self::repo()->findByEmail($email);
        if (!$user) {
            Response::error('Account not found', 404);
        }

        self::completeEmailVerificationLogin($user, 'Email verified successfully. You are now signed in.');
    }

    private static function completeEmailVerificationLogin(array $user, string $message): void
    {
        $user  = self::repo()->update($user['id'], ['lastLogin' => gmdate('c')]) ?? $user;
        $jwt   = self::issueCustomerToken($user);
        Response::json([
            'message' => $message,
            'role'    => 'customer',
            'token'   => $jwt,
            'user'    => self::publicUser($user),
        ]);
    }

    // -------------------------------------------------------------------------
    // Resend verification
    // -------------------------------------------------------------------------

    public static function resendVerification(): void
    {
        $body           = Request::body();
        $emailFromBody  = strtolower(trim((string) ($body['email'] ?? '')));
        $user           = null;

        $payload = Auth::optionalCustomer();
        if ($payload) {
            $user = self::findUserById((string) ($payload['userId'] ?? ''));
        }

        if (!$user && filter_var($emailFromBody, FILTER_VALIDATE_EMAIL)) {
            $user = self::findUserByEmail($emailFromBody);
            if (!$user) {
                Response::json(['message' => 'If an account exists with that email, a verification link has been sent.']);
            }
        }

        if (!$user) {
            Response::error('Provide your email address to resend the verification link', 400);
        }

        if (self::isEmailVerified($user)) {
            Response::json(['message' => 'Your email is already verified. You can sign in.']);
        }

        $rateKey = 'resend-verify-' . ($user['id'] ?? $emailFromBody);
        if (!RateLimiter::check($rateKey, 5, 3600)) {
            Response::error('Too many verification emails. Try again later.', 429);
        }

        $sent = self::sendVerificationEmail(
            (string) ($user['email'] ?? ''),
            isset($user['name']) ? (string) $user['name'] : null,
        );

        if (!$sent && !self::shouldSkipEmailVerify()) {
            Response::error('Could not send verification email. Please try again later.', 503);
        }

        Response::json(['message' => 'Verification email sent. Check your inbox (and spam folder).']);
    }

    // -------------------------------------------------------------------------
    // /me
    // -------------------------------------------------------------------------

    public static function me(): void
    {
        $payload = Auth::requireCustomer();
        $user    = self::findUserById((string) ($payload['userId'] ?? ''));
        if (!$user) {
            Response::error('User not found', 404);
        }
        Response::json(self::publicUser($user));
    }

    // -------------------------------------------------------------------------
    // Admin role check
    // -------------------------------------------------------------------------

    private static function shouldGrantAdminRole(string $email): bool
    {
        if (($_ENV['ADMIN_PANEL_LOGIN'] ?? 'false') !== 'true') {
            return false;
        }
        return in_array(strtolower($email), self::adminEmails(), true);
    }

    // -------------------------------------------------------------------------
    // Google OAuth
    // -------------------------------------------------------------------------

    public static function google(): void
    {
        $body       = Request::body();
        $credential = $body['credential'] ?? '';

        if (!$credential) {
            Response::error('Invalid request', 400);
        }
        if (empty($_ENV['GOOGLE_CLIENT_ID'])) {
            Response::error('Google login is not configured. Set GOOGLE_CLIENT_ID in config.json', 503);
        }
        if (!ServicesConfig::isGoogleSignInEnabled()) {
            Response::error('Google sign-in is currently disabled', 503);
        }

        try {
            $client  = new GoogleClient(['client_id' => $_ENV['GOOGLE_CLIENT_ID']]);
            $payload = $client->verifyIdToken($credential);

            if (!$payload || empty($payload['email'])) {
                Response::error('Google account has no email', 401);
            }

            $email  = strtolower($payload['email']);
            $name   = $payload['name'] ?? $payload['given_name'] ?? null;
            $avatar = $payload['picture'] ?? null;

            if (self::shouldGrantAdminRole($email)) {
                $token = Auth::signToken(['role' => 'admin', 'email' => $email]);
                Response::json([
                    'role'     => 'admin',
                    'token'    => $token,
                    'redirect' => $_ENV['ADMIN_PATH'] ?? '/wellness-studio',
                    'user'     => ['email' => $email, 'name' => $name, 'avatar' => $avatar],
                ]);
            }

            $existing = self::repo()->findByEmail($email);
            $now      = gmdate('c');

            if (!$existing) {
                $user = self::repo()->create([
                    'id'              => Database::generateId('user'),
                    'email'           => $email,
                    'name'            => $name,
                    'avatar'          => $avatar,
                    'emailVerified'   => true,
                    'emailVerifiedAt' => $now,
                    'createdAt'       => $now,
                    'lastLogin'       => $now,
                ]);
            } else {
                if (!empty($existing['isBlocked'])) {
                    Response::error('Your account has been blocked. Please contact support.', 403);
                }
                $updates = [
                    'lastLogin'       => $now,
                    'emailVerified'   => true,
                    'emailVerifiedAt' => $existing['emailVerifiedAt'] ?? $now,
                ];
                if ($name)   $updates['name']   = $name;
                if ($avatar) $updates['avatar'] = $avatar;
                $user = self::repo()->update($existing['id'], $updates) ?? $existing;
            }

            $token = Auth::signToken([
                'role'   => 'customer',
                'userId' => $user['id'],
                'email'  => $user['email'],
            ]);

            Response::json([
                'role'     => 'customer',
                'token'    => $token,
                'redirect' => '/',
                'user'     => self::publicUser($user),
            ]);
        } catch (\Exception $e) {
            error_log('[Google Auth] ' . $e->getMessage());
            Response::error('Google sign-in failed. Please try again.', 401);
        }
    }

    // -------------------------------------------------------------------------
    // Admin username/password login
    // -------------------------------------------------------------------------

    public static function adminLogin(): void
    {
        $body     = Request::body();
        $username = $body['username'] ?? '';
        $password = $body['password'] ?? '';

        if (!$username || !$password) {
            Response::error('Username and password required', 400);
        }
        if (!RateLimiter::check('admin-' . Request::ip())) {
            Response::error('Too many login attempts. Try again later.', 429);
        }

        $adminUser     = $_ENV['ADMIN_USERNAME'] ?? 'wellness_admin';
        $adminPassHash = $_ENV['ADMIN_PASSWORD_HASH'] ?? null;

        $validUser = hash_equals($adminUser, $username);

        if (!$adminPassHash) {
            error_log('[Admin Login] ADMIN_PASSWORD_HASH is not set. Configure it in config.json');
            Response::error('Admin login is not configured on this server.', 503);
        }

        $validPass = password_verify($password, $adminPassHash);

        if (!$validUser || !$validPass) {
            Response::error('Invalid credentials', 401);
        }

        $token = Auth::signToken(['role' => 'admin']);
        Response::json(['token' => $token, 'role' => 'admin']);
    }

    // -------------------------------------------------------------------------
    // Phone OTP
    // -------------------------------------------------------------------------

    public static function verifyPhone(): void
    {
        $payload     = Auth::requireCustomer();
        $body        = Request::body();
        $accessToken = (string) ($body['accessToken'] ?? '');
        $phone       = preg_replace('/\D/', '', (string) ($body['phone'] ?? ''));

        if (strlen($phone) < 10) {
            Response::error('Valid phone number required', 400);
        }
        if (strlen($phone) > 10) {
            $phone = substr($phone, -10);
        }

        $skipVerify = OtpConfig::shouldSkipVerify();

        if (!$skipVerify) {
            $tokenResult = Msg91Service::verifyAccessToken($accessToken);
            if (!$tokenResult['ok']) {
                $error      = $tokenResult['error'] ?? 'Phone verification failed. Please try again.';
                $outboundIp = OtpLogger::serverOutboundIp();
                if ($outboundIp && str_contains(strtolower($error), 'whitelist')) {
                    $error .= " Whitelist IP: {$outboundIp}";
                }
                OtpLogger::log('verify_phone_failed', [
                    'phone'     => $phone,
                    'userId'    => $payload['userId'] ?? '',
                    'status'    => 'token_rejected',
                    'httpCode'  => $tokenResult['httpCode'] ?? null,
                    'msg91Code' => $tokenResult['msg91Code'] ?? null,
                    'detail'    => $error,
                ]);
                Response::error($error, 401);
            }
        }

        OtpLogger::log('verify_phone_ok', [
            'phone'  => $phone,
            'userId' => $payload['userId'] ?? '',
            'status' => 'verified',
        ]);

        self::markPhoneVerified($payload['userId'] ?? '', $phone);
    }

    public static function sendPhoneOtp(): void
    {
        $payload = Auth::requireCustomer();
        $body    = Request::body();
        $phone   = (string) ($body['phone'] ?? '');

        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) < 10) {
            Response::error('Enter a valid 10-digit mobile number', 400);
        }
        if (strlen($digits) > 10) {
            $digits = substr($digits, -10);
        }

        $userId      = $payload['userId'] ?? '';
        $rateKey     = 'phone-otp-send-' . $userId;
        $maxAttempts = OtpConfig::maxSendAttempts();

        if (!RateLimiter::check($rateKey, $maxAttempts, 900)) {
            $wait = RateLimiter::retryAfterSeconds($rateKey);
            $mins = $wait ? max(1, (int) ceil($wait / 60)) : 15;
            OtpLogger::log('send_blocked_rate_limit', [
                'phone'  => $digits,
                'userId' => $userId,
                'status' => 'rate_limited',
                'detail' => "retry in ~{$mins} min",
            ]);
            Response::error("Too many OTP requests. Please wait about {$mins} minute(s) and try again.", 429);
        }

        $skipVerify = OtpConfig::shouldSkipVerify();

        OtpLogger::log('send_request', [
            'phone'      => $digits,
            'userId'     => $userId,
            'status'     => 'started',
            'skipVerify' => $skipVerify,
            'otpMode'    => OtpConfig::mode(),
        ]);

        if ($skipVerify) {
            OtpLogger::log('send_ok', [
                'phone'  => $digits,
                'userId' => $userId,
                'status' => 'dev_skip',
                'detail' => 'SKIP_PHONE_VERIFY=true — no SMS sent',
            ]);
            Response::json(['message' => 'Phone verification skipped (dev mode)', 'devMode' => true]);
            return;
        }

        $result = Msg91Service::sendPhoneOtp($digits);
        if (!$result['ok']) {
            $outboundIp = OtpLogger::serverOutboundIp();
            OtpLogger::log('send_failed', [
                'phone'     => $digits,
                'userId'    => $userId,
                'status'    => 'failed',
                'httpCode'  => $result['httpCode'] ?? null,
                'msg91Code' => $result['msg91Code'] ?? null,
                'requestId' => $result['requestId'] ?? null,
                'serverIp'  => $outboundIp,
                'detail'    => $result['error'] ?? 'unknown',
            ]);
            self::msg91ServiceError($result, 'Could not send OTP');
        }

        OtpLogger::log('send_ok', [
            'phone'     => $digits,
            'userId'    => $userId,
            'status'    => 'sent',
            'requestId' => $result['requestId'] ?? null,
        ]);

        $response = ['message' => 'OTP sent to your mobile number'];
        if (!empty($result['requestId'])) {
            $response['requestId'] = $result['requestId'];
        }
        Response::json($response);
    }

    public static function resendPhoneOtp(): void
    {
        $payload = Auth::requireCustomer();
        $body    = Request::body();
        $phone   = (string) ($body['phone'] ?? '');

        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) < 10) {
            Response::error('Enter a valid 10-digit mobile number', 400);
        }
        if (strlen($digits) > 10) {
            $digits = substr($digits, -10);
        }

        $userId  = $payload['userId'] ?? '';
        $rateKey = 'phone-otp-resend-' . $userId;

        if (!RateLimiter::check($rateKey, 5, 900)) {
            $wait = RateLimiter::retryAfterSeconds($rateKey);
            $mins = $wait ? max(1, (int) ceil($wait / 60)) : 15;
            Response::error("Too many resend attempts. Please wait about {$mins} minute(s).", 429);
        }

        $skipVerify = OtpConfig::shouldSkipVerify();

        OtpLogger::log('resend_request', [
            'phone'      => $digits,
            'userId'     => $userId,
            'status'     => 'started',
            'skipVerify' => $skipVerify,
        ]);

        if ($skipVerify) {
            OtpLogger::log('resend_ok', [
                'phone'  => $digits,
                'userId' => $userId,
                'status' => 'dev_skip',
            ]);
            Response::json(['message' => 'OTP resent (dev mode — use 000000 to verify)', 'devMode' => true]);
            return;
        }

        $result = Msg91Service::retryPhoneOtp($digits, 'text');
        if (!$result['ok']) {
            $msg91Code  = (string) ($result['msg91Code'] ?? '');
            $errorLower = strtolower($result['error'] ?? '');
            if ($msg91Code === '418' || str_contains($errorLower, 'whitelist')) {
                OtpLogger::log('resend_retry_fallback', [
                    'phone'  => $digits,
                    'userId' => $userId,
                    'status' => 'fallback_to_send',
                    'detail' => 'retry blocked by MSG91 IP security; issuing fresh send',
                ]);
                $result = Msg91Service::sendPhoneOtp($digits);
            }
        }
        if (!$result['ok']) {
            OtpLogger::log('resend_failed', [
                'phone'     => $digits,
                'userId'    => $userId,
                'status'    => 'failed',
                'httpCode'  => $result['httpCode'] ?? null,
                'msg91Code' => $result['msg91Code'] ?? null,
                'detail'    => $result['error'] ?? 'unknown',
            ]);
            self::msg91ServiceError($result, 'Could not resend OTP');
        }

        OtpLogger::log('resend_ok', [
            'phone'  => $digits,
            'userId' => $userId,
            'status' => 'resent',
        ]);

        Response::json(['message' => 'OTP resent to your mobile number']);
    }

    public static function confirmPhoneOtp(): void
    {
        $payload = Auth::requireCustomer();
        $body    = Request::body();
        $phone   = (string) ($body['phone'] ?? '');
        $otp     = (string) ($body['otp'] ?? '');

        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) < 10) {
            Response::error('Valid phone number required', 400);
        }
        if (strlen($digits) > 10) {
            $digits = substr($digits, -10);
        }

        $skipVerify = OtpConfig::shouldSkipVerify();

        if ($skipVerify) {
            OtpLogger::log('confirm_ok', [
                'phone'  => $digits,
                'userId' => $payload['userId'] ?? '',
                'status' => 'dev_skip_auto',
                'detail' => 'SKIP_PHONE_VERIFY — no OTP required',
            ]);
            self::markPhoneVerified($payload['userId'] ?? '', $digits);
            return;
        }

        OtpLogger::log('confirm_request', [
            'phone'  => $digits,
            'userId' => $payload['userId'] ?? '',
            'status' => 'verifying',
        ]);
        $result = Msg91Service::verifyPhoneOtp($phone, $otp);
        if (!$result['ok']) {
            $outboundIp = OtpLogger::serverOutboundIp();
            OtpLogger::log('confirm_failed', [
                'phone'     => $digits,
                'userId'    => $payload['userId'] ?? '',
                'status'    => 'msg91_rejected',
                'httpCode'  => $result['httpCode'] ?? null,
                'msg91Code' => $result['msg91Code'] ?? null,
                'serverIp'  => $outboundIp,
                'detail'    => $result['error'] ?? 'invalid',
            ]);
            if (self::isMsg91ServiceFailure($result)) {
                self::msg91ServiceError($result, 'Could not verify OTP');
            }
            Response::error($result['error'] ?? 'Invalid OTP', 401);
        }

        OtpLogger::log('confirm_ok', [
            'phone'  => $digits,
            'userId' => $payload['userId'] ?? '',
            'status' => 'verified',
        ]);

        self::markPhoneVerified($payload['userId'] ?? '', $digits);
    }

    public static function otpLogs(): void
    {
        $isDev = ($_ENV['APP_ENV'] ?? '') === 'development';
        $logs = OtpLogger::recent(50);

        if (!$isDev) {
            Auth::requireAdmin();
        } else {
            // Dev convenience: customers can self-debug OTP delivery without an
            // admin session, but only see their own entries — never other
            // users' phone numbers/OTP metadata, even in a development environment.
            $payload = Auth::requireCustomer();
            $userId = (string) ($payload['userId'] ?? '');
            $logs = array_values(array_filter(
                $logs,
                fn($log) => (string) ($log['userId'] ?? '') === $userId,
            ));
        }

        Response::json([
            'logs' => $logs,
            'hint' => '418 from MSG91 = server IP not whitelisted in MSG91 Dashboard → Authkey → IP Security.',
        ]);
    }

    private static function markPhoneVerified(string $userId, string $phone10): void
    {
        $user = self::repo()->getById($userId);
        if (!$user) {
            Response::error('User not found', 404);
        }

        self::repo()->update($userId, [
            'phone'           => $phone10,
            'phoneVerified'   => true,
            'phoneVerifiedAt' => gmdate('c'),
        ]);

        Response::json(['phone' => $phone10, 'phoneVerified' => true]);
    }
}
