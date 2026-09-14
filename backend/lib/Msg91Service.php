<?php

declare(strict_types=1);

namespace Wellness;

/**
 * MSG91 OTP — server-side send/verify (no widget captcha) + widget token validation.
 * @see https://docs.msg91.com/otp/sendotp
 * @see https://msg91.com/help/api/what-do-you-mean-by-api-security (418 = IP not whitelisted)
 */
final class Msg91Service
{
    private const OTP_SEND_BASE = 'https://control.msg91.com/api/v5/otp';
    private const OTP_VERIFY_BASE = 'https://control.msg91.com/api/v5/otp/verify';
    private const OTP_RETRY_BASE = 'https://control.msg91.com/api/v5/otp/retry';

    /** @var array<int|string, string> */
    private const ERROR_HINTS = [
        418 => 'MSG91 IP security is on and this server IP is not whitelisted. Open MSG91 Dashboard → Authkey → IP Security → add your server IP (see Failed Logs).',
        207 => 'Invalid MSG91 auth key. Check MSG91_AUTH_KEY in config.json matches your dashboard Authkey.',
        202 => 'Invalid mobile number format.',
        301 => 'Insufficient MSG91 SMS balance. Top up your account.',
        311 => 'Duplicate OTP request. Wait 10 seconds before resending.',
    ];

    private static function authKey(): string
    {
        return trim($_ENV['MSG91_AUTH_KEY'] ?? $_ENV['MSG91_TOKEN_AUTH'] ?? '');
    }

    private static function templateId(): string
    {
        return trim($_ENV['MSG91_OTP_TEMPLATE_ID'] ?? '');
    }

    private static function normalizeMobile(string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if ($digits === null || strlen($digits) < 10) {
            return null;
        }
        return '91' . substr($digits, -10);
    }

    /** @return array{ok: bool, data?: array<string, mixed>, error?: string, httpCode?: int, requestId?: string} */
    private static function request(string $method, string $url, array $headers = [], ?string $body = null): array
    {
        $result = HttpClient::request($method, $url, $headers, $body);
        $httpCode = (int) ($result['httpCode'] ?? 0);

        if (!$result['ok']) {
            return [
                'ok' => false,
                'error' => $result['error'] ?? 'MSG91 network request failed',
                'httpCode' => $httpCode,
            ];
        }

        $response = $result['body'];
        if ($response === false || $response === '') {
            return [
                'ok' => false,
                'error' => 'Empty response from MSG91',
                'httpCode' => $httpCode,
            ];
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            error_log('[MSG91] Non-JSON response (HTTP ' . $httpCode . '): ' . substr((string) $response, 0, 500));
            return [
                'ok' => false,
                'error' => 'Unexpected response from MSG91 (HTTP ' . $httpCode . ')',
                'httpCode' => $httpCode,
            ];
        }

        return ['ok' => true, 'data' => $data, 'httpCode' => $httpCode];
    }

    /** @param array<string, mixed> $data */
    private static function isSuccess(array $data, int $httpCode): bool
    {
        if ($httpCode >= 400) {
            return false;
        }

        if (($data['type'] ?? '') === 'error') {
            return false;
        }

        $code = $data['code'] ?? $data['status'] ?? null;
        if ($code !== null && is_numeric($code) && (int) $code >= 400) {
            return false;
        }

        if (($data['type'] ?? '') === 'success') {
            return true;
        }

        $message = strtolower((string) ($data['message'] ?? ''));
        if ($message !== '' && (str_contains($message, 'fail') || str_contains($message, 'error') || str_contains($message, 'invalid'))) {
            return false;
        }

        return str_contains($message, 'success')
            || str_contains($message, 'sent')
            || str_contains($message, 'verified');
    }

    /** @param array<string, mixed> $data */
    private static function errorMessage(array $data, int $httpCode, string $fallback): string
    {
        $raw = (string) ($data['message'] ?? $data['error'] ?? $data['errors'] ?? '');
        $code = $data['code'] ?? $data['status'] ?? $httpCode;
        $numericCode = is_numeric($code) ? (int) $code : $httpCode;

        if ($numericCode === 418 || $httpCode === 418 || str_contains(strtolower($raw), '418') || str_contains(strtolower($raw), 'whitelist')) {
            return self::ERROR_HINTS[418];
        }

        if (isset(self::ERROR_HINTS[$numericCode])) {
            $hint = self::ERROR_HINTS[$numericCode];
            return $raw !== '' ? "{$raw} ({$hint})" : $hint;
        }

        if ($raw !== '') {
            return $raw;
        }

        if ($httpCode >= 400) {
            return "{$fallback} (HTTP {$httpCode})";
        }

        return $fallback;
    }

    /** @param array<string, mixed> $data */
    private static function requestId(array $data): ?string
    {
        $id = $data['request_id'] ?? $data['requestId'] ?? null;
        return is_string($id) && $id !== '' ? $id : null;
    }

    /** @return list<string> */
    private static function authHeaders(): array
    {
        return [
            'authkey: ' . self::authKey(),
            'Accept: application/json',
        ];
    }

    /** @return array{ok: bool, error?: string, requestId?: string, httpCode?: int, msg91Code?: int|string|null} */
    public static function sendPhoneOtp(string $phone): array
    {
        $authKey = self::authKey();
        $mobile = self::normalizeMobile($phone);
        $templateId = self::templateId();

        if (!$authKey) {
            return ['ok' => false, 'error' => 'MSG91 auth key is not configured in config.json'];
        }
        if (!$mobile) {
            return ['ok' => false, 'error' => 'Invalid mobile number'];
        }
        if (!$templateId) {
            return ['ok' => false, 'error' => 'MSG91_OTP_TEMPLATE_ID is missing in config.json'];
        }

        $query = http_build_query([
            'template_id' => $templateId,
            'mobile' => $mobile,
            'otp_length' => 6,
            'otp_expiry' => 10,
            'realTimeResponse' => 1,
        ]);

        $headers = [
            ...self::authHeaders(),
            'Content-Type: application/json',
        ];

        $url = self::OTP_SEND_BASE . '?' . $query;

        OtpLogger::log('msg91_send_request', [
            'phone' => $phone,
            'status' => 'pending',
            'detail' => 'template=' . substr($templateId, 0, 8) . '… mobile=' . OtpLogger::maskPhone($mobile),
        ]);

        $result = self::request('POST', $url, $headers, '{}');
        $httpCode = (int) ($result['httpCode'] ?? 0);
        $data = $result['data'] ?? [];

        if (!$result['ok']) {
            OtpLogger::log('msg91_send_failed', [
                'phone' => $phone,
                'status' => 'network_error',
                'httpCode' => $httpCode,
                'detail' => (string) ($result['error'] ?? 'network error'),
            ]);
            return ['ok' => false, 'error' => $result['error'] ?? 'MSG91 request failed', 'httpCode' => $httpCode];
        }

        $requestId = self::requestId($data);
        $msg91Code = $data['code'] ?? $data['status'] ?? null;

        if (self::isSuccess($data, $httpCode)) {
            OtpLogger::log('msg91_send_ok', [
                'phone' => $phone,
                'status' => 'sent',
                'httpCode' => $httpCode,
                'requestId' => $requestId,
                'detail' => 'request_id=' . ($requestId ?? 'n/a'),
            ]);
            return ['ok' => true, 'requestId' => $requestId, 'httpCode' => $httpCode];
        }

        $message = self::errorMessage($data, $httpCode, 'Failed to send OTP');
        error_log('[MSG91] sendPhoneOtp HTTP ' . $httpCode . ': ' . $message . ' | ' . json_encode($data));

        OtpLogger::log('msg91_send_failed', [
            'phone' => $phone,
            'status' => 'msg91_error',
            'httpCode' => $httpCode,
            'msg91Code' => $msg91Code,
            'requestId' => $requestId,
            'detail' => $message,
            'response' => $data,
        ]);

        return [
            'ok' => false,
            'error' => $message,
            'httpCode' => $httpCode,
            'msg91Code' => $msg91Code,
            'requestId' => $requestId,
        ];
    }

    /** @return array{ok: bool, error?: string, httpCode?: int, msg91Code?: int|string|null} */
    public static function verifyPhoneOtp(string $phone, string $otp): array
    {
        $authKey = self::authKey();
        $mobile = self::normalizeMobile($phone);
        $code = preg_replace('/\D/', '', $otp);

        if (!$authKey) {
            return ['ok' => false, 'error' => 'MSG91 auth key is not configured'];
        }
        if (!$mobile || strlen($code) < 4) {
            return ['ok' => false, 'error' => 'Invalid mobile or OTP'];
        }

        $query = http_build_query([
            'mobile' => $mobile,
            'otp' => $code,
        ]);

        OtpLogger::log('msg91_verify_request', [
            'phone' => $phone,
            'status' => 'pending',
            'detail' => 'mobile=' . OtpLogger::maskPhone($mobile),
        ]);

        $result = self::request(
            'GET',
            self::OTP_VERIFY_BASE . '?' . $query,
            self::authHeaders(),
        );

        $httpCode = (int) ($result['httpCode'] ?? 0);
        $data = $result['data'] ?? [];

        if (!$result['ok']) {
            OtpLogger::log('msg91_verify_failed', [
                'phone' => $phone,
                'status' => 'network_error',
                'httpCode' => $httpCode,
                'detail' => (string) ($result['error'] ?? 'network error'),
            ]);
            return ['ok' => false, 'error' => $result['error'] ?? 'MSG91 verify request failed', 'httpCode' => $httpCode];
        }

        if (self::isSuccess($data, $httpCode)) {
            OtpLogger::log('msg91_verify_ok', [
                'phone' => $phone,
                'status' => 'verified',
                'httpCode' => $httpCode,
            ]);
            return ['ok' => true, 'httpCode' => $httpCode];
        }

        $message = self::errorMessage($data, $httpCode, 'Invalid or expired OTP');
        error_log('[MSG91] verifyPhoneOtp HTTP ' . $httpCode . ': ' . $message . ' | ' . json_encode($data));

        OtpLogger::log('msg91_verify_failed', [
            'phone' => $phone,
            'status' => 'msg91_error',
            'httpCode' => $httpCode,
            'msg91Code' => $data['code'] ?? $data['status'] ?? null,
            'detail' => $message,
            'response' => $data,
        ]);

        return [
            'ok' => false,
            'error' => $message,
            'httpCode' => $httpCode,
            'msg91Code' => $data['code'] ?? $data['status'] ?? null,
        ];
    }

    /** @return array{ok: bool, error?: string, httpCode?: int, msg91Code?: int|string|null} */
    public static function retryPhoneOtp(string $phone, string $retryType = 'text'): array
    {
        $authKey = self::authKey();
        $mobile = self::normalizeMobile($phone);

        if (!$authKey) {
            return ['ok' => false, 'error' => 'MSG91 auth key is not configured'];
        }
        if (!$mobile) {
            return ['ok' => false, 'error' => 'Invalid mobile number'];
        }

        $retryType = strtolower($retryType) === 'voice' ? 'voice' : 'text';
        $query = http_build_query([
            'mobile' => $mobile,
            'retrytype' => $retryType,
        ]);

        OtpLogger::log('msg91_retry_request', [
            'phone' => $phone,
            'status' => 'pending',
            'detail' => 'retrytype=' . $retryType,
        ]);

        $result = self::request(
            'GET',
            self::OTP_RETRY_BASE . '?' . $query,
            self::authHeaders(),
        );

        $httpCode = (int) ($result['httpCode'] ?? 0);
        $data = $result['data'] ?? [];

        if (!$result['ok']) {
            OtpLogger::log('msg91_retry_failed', [
                'phone' => $phone,
                'status' => 'network_error',
                'httpCode' => $httpCode,
                'detail' => (string) ($result['error'] ?? 'network error'),
            ]);
            return ['ok' => false, 'error' => $result['error'] ?? 'MSG91 retry request failed', 'httpCode' => $httpCode];
        }

        if (self::isSuccess($data, $httpCode)) {
            OtpLogger::log('msg91_retry_ok', [
                'phone' => $phone,
                'status' => 'resent',
                'httpCode' => $httpCode,
            ]);
            return ['ok' => true, 'httpCode' => $httpCode];
        }

        $message = self::errorMessage($data, $httpCode, 'Could not resend OTP');
        error_log('[MSG91] retryPhoneOtp HTTP ' . $httpCode . ': ' . $message . ' | ' . json_encode($data));

        OtpLogger::log('msg91_retry_failed', [
            'phone' => $phone,
            'status' => 'msg91_error',
            'httpCode' => $httpCode,
            'msg91Code' => $data['code'] ?? $data['status'] ?? null,
            'detail' => $message,
            'response' => $data,
        ]);

        return [
            'ok' => false,
            'error' => $message,
            'httpCode' => $httpCode,
            'msg91Code' => $data['code'] ?? $data['status'] ?? null,
        ];
    }

    /** @return array{ok: bool, error?: string, httpCode?: int, msg91Code?: int|string|null, identifier?: string|null} */
    public static function verifyAccessToken(string $accessToken): array
    {
        $authKey = self::authKey();
        if (!$authKey) {
            return ['ok' => false, 'error' => 'MSG91 auth key is not configured'];
        }

        $token = trim($accessToken);
        if ($token === '') {
            return ['ok' => false, 'error' => 'Access token is missing'];
        }

        OtpLogger::log('msg91_verify_token_request', [
            'status' => 'pending',
            'detail' => 'token=' . substr($token, 0, 12) . '… len=' . strlen($token),
        ]);

        $widgetId = trim($_ENV['MSG91_WIDGET_ID'] ?? $_ENV['VITE_MSG91_WIDGET_ID'] ?? '');

        // MSG91 expects application/x-www-form-urlencoded body (authkey + access-token).
        // Do NOT duplicate authkey in headers — that can prevent body fields from being read.
        $fields = [
            'authkey' => $authKey,
            'access-token' => $token,
        ];
        if ($widgetId !== '') {
            $fields['widgetId'] = $widgetId;
        }

        $postBody = http_build_query($fields, '', '&', PHP_QUERY_RFC3986);

        $attempts = [
            [
                'label' => 'form_body',
                'headers' => [
                    'Content-Type: application/x-www-form-urlencoded',
                    'Accept: application/json',
                ],
                'body' => $postBody,
            ],
            [
                'label' => 'json_body',
                'headers' => [
                    'authkey: ' . $authKey,
                    'Content-Type: application/json',
                    'Accept: application/json',
                ],
                'body' => json_encode(array_filter([
                    'access-token' => $token,
                    'widgetId' => $widgetId !== '' ? $widgetId : null,
                ], static fn($v) => $v !== null && $v !== ''), JSON_UNESCAPED_SLASHES),
            ],
        ];

        $lastError = 'Access token verification failed';
        $lastHttpCode = 0;
        $lastMsg91Code = null;

        foreach ($attempts as $attempt) {
            $result = self::request(
                'POST',
                'https://control.msg91.com/api/v5/widget/verifyAccessToken',
                $attempt['headers'],
                $attempt['body'],
            );

            $httpCode = (int) ($result['httpCode'] ?? 0);
            $lastHttpCode = $httpCode;
            $data = $result['data'] ?? [];

            if (!$result['ok']) {
                $lastError = $result['error'] ?? 'MSG91 token verify request failed';
                continue;
            }

            if (self::isSuccess($data, $httpCode)) {
                $identifier = null;
                if (isset($data['identifier']) && is_string($data['identifier'])) {
                    $identifier = $data['identifier'];
                } elseif (isset($data['mobile']) && is_string($data['mobile'])) {
                    $identifier = $data['mobile'];
                }

                OtpLogger::log('msg91_verify_token_ok', [
                    'status' => 'verified',
                    'httpCode' => $httpCode,
                    'detail' => ($attempt['label'] ?? 'unknown') . ($identifier ? ' identifier=' . OtpLogger::maskPhone($identifier) : ''),
                ]);

                return ['ok' => true, 'httpCode' => $httpCode, 'identifier' => $identifier];
            }

            $lastError = self::errorMessage($data, $httpCode, 'Access token verification failed');
            $lastMsg91Code = $data['code'] ?? $data['status'] ?? null;

            // If MSG91 didn't receive the field, try the next encoding.
            if (!str_contains(strtolower($lastError), 'access-token field is required')) {
                break;
            }
        }

        error_log('[MSG91] verifyAccessToken HTTP ' . $lastHttpCode . ': ' . $lastError);

        OtpLogger::log('msg91_verify_token_failed', [
            'status' => 'msg91_error',
            'httpCode' => $lastHttpCode,
            'msg91Code' => $lastMsg91Code,
            'detail' => $lastError,
        ]);

        return [
            'ok' => false,
            'error' => $lastError,
            'httpCode' => $lastHttpCode,
            'msg91Code' => $lastMsg91Code,
        ];
    }
}
