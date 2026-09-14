<?php

declare(strict_types=1);

namespace Wellness;

/** Minimal HTTP client — uses cURL when available, otherwise streams. */
final class HttpClient
{
    /**
     * @param list<string> $headers
     * @return array{ok: bool, body: string|false, httpCode: int, error?: string}
     */
    public static function request(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 20): array
    {
        if (\function_exists('curl_init')) {
            return self::requestWithCurl($method, $url, $headers, $body, $timeout);
        }

        return self::requestWithStream($method, $url, $headers, $body, $timeout);
    }

    /** @param list<string> $headers */
    private static function requestWithCurl(string $method, string $url, array $headers, ?string $body, int $timeout): array
    {
        $ch = \curl_init($url);
        if ($ch === false) {
            return ['ok' => false, 'body' => false, 'httpCode' => 0, 'error' => 'Could not initialize cURL'];
        }

        $opts = [
            \CURLOPT_RETURNTRANSFER => true,
            \CURLOPT_HTTPHEADER => $headers,
            \CURLOPT_TIMEOUT => $timeout,
        ];

        $method = strtoupper($method);
        if ($method === 'POST') {
            $opts[\CURLOPT_POST] = true;
            $opts[\CURLOPT_POSTFIELDS] = $body ?? '';
        } elseif ($method !== 'GET') {
            $opts[\CURLOPT_CUSTOMREQUEST] = $method;
            if ($body !== null) {
                $opts[\CURLOPT_POSTFIELDS] = $body;
            }
        }

        \curl_setopt_array($ch, $opts);

        $response = \curl_exec($ch);
        $httpCode = (int) \curl_getinfo($ch, \CURLINFO_HTTP_CODE);
        $err = \curl_error($ch);
        \curl_close($ch);

        if ($response === false) {
            return ['ok' => false, 'body' => false, 'httpCode' => $httpCode, 'error' => $err ?: 'HTTP request failed'];
        }

        return ['ok' => true, 'body' => $response, 'httpCode' => $httpCode];
    }

    /** @param list<string> $headers */
    private static function requestWithStream(string $method, string $url, array $headers, ?string $body, int $timeout): array
    {
        if (!\ini_get('allow_url_fopen')) {
            return [
                'ok' => false,
                'body' => false,
                'httpCode' => 0,
                'error' => 'PHP cURL extension is not installed and allow_url_fopen is disabled',
            ];
        }

        $http = [
            'method' => strtoupper($method),
            'header' => implode("\r\n", $headers),
            'timeout' => $timeout,
            'ignore_errors' => true,
        ];

        if ($body !== null && strtoupper($method) === 'POST') {
            $http['content'] = $body;
        }

        $context = \stream_context_create(['http' => $http]);
        $response = @\file_get_contents($url, false, $context);

        $httpCode = 0;
        if (isset($http_response_header[0]) && \preg_match('/\d{3}/', (string) $http_response_header[0], $matches)) {
            $httpCode = (int) $matches[0];
        }

        if ($response === false) {
            $lastError = \error_get_last();
            $message = \is_array($lastError) ? (string) ($lastError['message'] ?? 'HTTP request failed') : 'HTTP request failed';
            return ['ok' => false, 'body' => false, 'httpCode' => $httpCode, 'error' => $message];
        }

        return ['ok' => true, 'body' => $response, 'httpCode' => $httpCode];
    }
}
