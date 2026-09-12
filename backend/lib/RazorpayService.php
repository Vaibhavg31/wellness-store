<?php

declare(strict_types=1);

namespace Krivea;

/**
 * Thin Razorpay Orders API client (no SDK dependency).
 * Docs: https://razorpay.com/docs/api/orders/
 */
final class RazorpayService
{
    public static function isConfigured(): bool
    {
        return self::keyId() !== '' && self::keySecret() !== '';
    }

    public static function keyId(): string
    {
        return trim((string) ($_ENV['RAZORPAY_KEY_ID'] ?? ''));
    }

    private static function keySecret(): string
    {
        return trim((string) ($_ENV['RAZORPAY_KEY_SECRET'] ?? ''));
    }

    public static function isWebhookConfigured(): bool
    {
        return self::webhookSecret() !== '';
    }

    private static function webhookSecret(): string
    {
        return trim((string) ($_ENV['RAZORPAY_WEBHOOK_SECRET'] ?? ''));
    }

    /**
     * Verify the `X-Razorpay-Signature` header on a webhook delivery.
     * Docs: https://razorpay.com/docs/webhooks/validate-test/
     */
    public static function verifyWebhookSignature(string $rawBody, string $signature): bool
    {
        if (!self::isWebhookConfigured() || $rawBody === '' || $signature === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $rawBody, self::webhookSecret());
        return hash_equals($expected, $signature);
    }

    /**
     * Create a Razorpay order. Amount must be in paise (INR × 100).
     *
     * @return array{id: string, amount: int, currency: string, receipt: string}
     */
    public static function createOrder(int $amountPaise, string $receipt, array $notes = []): array
    {
        if (!self::isConfigured()) {
            throw new \RuntimeException('Razorpay is not configured');
        }

        if ($amountPaise < 100) {
            throw new \InvalidArgumentException('Amount must be at least ₹1');
        }

        $payload = [
            'amount'   => $amountPaise,
            'currency' => 'INR',
            'receipt'  => substr($receipt, 0, 40),
            'notes'    => $notes,
        ];

        $headers = [
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode(self::keyId() . ':' . self::keySecret()),
        ];

        $result = HttpClient::request(
            'POST',
            'https://api.razorpay.com/v1/orders',
            $headers,
            json_encode($payload),
            30,
        );

        if (!$result['ok']) {
            throw new \RuntimeException('Razorpay request failed: ' . ($result['error'] ?? 'unknown error'));
        }

        $raw  = $result['body'];
        $code = $result['httpCode'];

        $data = json_decode($raw, true);
        if ($code < 200 || $code >= 300 || empty($data['id'])) {
            $msg = is_array($data) ? ($data['error']['description'] ?? $raw) : $raw;
            throw new \RuntimeException('Razorpay order failed: ' . $msg);
        }

        return [
            'id'       => (string) $data['id'],
            'amount'   => (int) $data['amount'],
            'currency' => (string) ($data['currency'] ?? 'INR'),
            'receipt'  => (string) ($data['receipt'] ?? $receipt),
        ];
    }

    public static function verifyPaymentSignature(
        string $orderId,
        string $paymentId,
        string $signature
    ): bool {
        if (!self::isConfigured() || $orderId === '' || $paymentId === '' || $signature === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, self::keySecret());
        return hash_equals($expected, $signature);
    }
}
