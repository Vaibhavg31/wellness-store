<?php

declare(strict_types=1);

namespace Krivea;

/**
 * MySQL-backed OTP audit log — replaces otp-logs.json.
 * init() is kept for API compatibility but does nothing.
 */
final class OtpLogger
{
    public static function init(string $baseDir): void
    {
        // No-op: Database::init() handles the PDO connection.
    }

    /** @param array<string, mixed> $entry */
    public static function log(string $action, array $entry): void
    {
        try {
            $pdo = Database::pdo();
        } catch (\Throwable) {
            return;
        }

        $response = isset($entry['response']) ? json_encode($entry['response']) : null;

        $pdo->prepare(
            'INSERT INTO otp_logs
             (logged_at, action, phone, user_id, status, skip_verify, otp_mode,
              http_code, msg91_code, request_id, server_ip, detail, response)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            gmdate('Y-m-d H:i:s.u'),
            $action,
            $entry['phone']      ?? null,
            $entry['userId']     ?? null,
            $entry['status']     ?? null,
            isset($entry['skipVerify']) ? ($entry['skipVerify'] ? 1 : 0) : null,
            $entry['otpMode']    ?? null,
            isset($entry['httpCode'])   ? (int) $entry['httpCode']   : null,
            $entry['msg91Code']  ?? null,
            $entry['requestId']  ?? null,
            $entry['serverIp']   ?? null,
            $entry['detail']     ?? null,
            $response,
        ]);

        // Cap the table at 200 rows
        try {
            $count = (int) $pdo->query('SELECT COUNT(*) FROM otp_logs')->fetchColumn();
            if ($count > 200) {
                $pdo->exec(
                    'DELETE FROM otp_logs ORDER BY id ASC LIMIT ' . ($count - 200)
                );
            }
        } catch (\Throwable) {
            // Non-critical
        }

        $phone  = isset($entry['phone']) ? self::maskPhone((string) $entry['phone']) : '-';
        $status = (string) ($entry['status'] ?? 'unknown');
        $detail = (string) ($entry['detail'] ?? '');
        error_log("[OTP] {$action} | phone={$phone} | status={$status}" . ($detail !== '' ? " | {$detail}" : ''));
    }

    /** @return list<array<string, mixed>> */
    public static function recent(int $limit = 50): array
    {
        try {
            $pdo  = Database::pdo();
            $cap  = max(1, min($limit, 200));
            $stmt = $pdo->prepare(
                'SELECT * FROM otp_logs ORDER BY id DESC LIMIT ?'
            );
            $stmt->bindValue(1, $cap, \PDO::PARAM_INT);
            $stmt->execute();
            return array_map(fn($r) => [
                'at'         => $r['logged_at'],
                'action'     => $r['action'],
                'phone'      => $r['phone'],
                'userId'     => $r['user_id'],
                'status'     => $r['status'],
                'skipVerify' => $r['skip_verify'] !== null ? (bool) $r['skip_verify'] : null,
                'otpMode'    => $r['otp_mode'],
                'httpCode'   => $r['http_code'] !== null ? (int) $r['http_code'] : null,
                'msg91Code'  => $r['msg91_code'],
                'requestId'  => $r['request_id'],
                'serverIp'   => $r['server_ip'],
                'detail'     => $r['detail'],
                'response'   => $r['response'] !== null ? json_decode($r['response'], true) : null,
            ], $stmt->fetchAll());
        } catch (\Throwable) {
            return [];
        }
    }

    public static function maskPhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';
        if (strlen($digits) < 4) {
            return '****';
        }
        return str_repeat('*', max(0, strlen($digits) - 4)) . substr($digits, -4);
    }

    public static function serverOutboundIp(): ?string
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached === '' ? null : $cached;
        }

        foreach (['https://api4.ipify.org', 'https://api.ipify.org?format=text'] as $endpoint) {
            $ip = self::fetchOutboundIp($endpoint);
            if ($ip !== null) {
                $cached = $ip;
                return $ip;
            }
        }

        $cached = '';
        return null;
    }

    private static function fetchOutboundIp(string $endpoint): ?string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($endpoint);
            if ($ch !== false) {
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 4,
                    CURLOPT_CONNECTTIMEOUT => 3,
                ]);
                $ip = trim((string) curl_exec($ch));
                curl_close($ch);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        $context = stream_context_create([
            'http' => ['timeout' => 4],
            'ssl'  => ['verify_peer' => true, 'verify_peer_name' => true],
        ]);
        $ip = trim((string) @file_get_contents($endpoint, false, $context));
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : null;
    }
}
