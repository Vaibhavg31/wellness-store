<?php

declare(strict_types=1);

namespace Wellness;

use Wellness\Repository\SettingsRepository;

/**
 * Brevo transactional email — REST API (no SDK).
 *
 * @see https://developers.brevo.com/docs/send-a-transactional-email
 * @see https://api.brevo.com/v3/smtp/email
 */
final class BrevoService
{
    private const API_URL = 'https://api.brevo.com/v3/smtp/email';

    public static function isEnabled(): bool
    {
        if (!ServicesConfig::isEmailEnabled()) {
            return false;
        }

        if (strtolower(trim((string) ($_ENV['BREVO_ENABLED'] ?? 'true'))) === 'false') {
            return false;
        }

        return self::apiKey() !== '' && self::senderEmail() !== '';
    }

    private static function apiKey(): string
    {
        return trim((string) ($_ENV['BREVO_API_KEY'] ?? ''));
    }

    private static function senderEmail(): string
    {
        return trim((string) ($_ENV['BREVO_SENDER_EMAIL'] ?? ''));
    }

    private static function senderName(): string
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

    private static function brandTagline(): string
    {
        try {
            $settings = (new SettingsRepository())->get();
            return (string) ($settings['brandTagline'] ?? 'Everyday Wellness, Honestly Made');
        } catch (\Throwable) {
            return 'Everyday Wellness, Honestly Made';
        }
    }

    private static function replyEmail(): string
    {
        $reply = trim((string) ($_ENV['BREVO_REPLY_EMAIL'] ?? ''));
        if ($reply !== '') {
            return $reply;
        }

        try {
            $settings = (new SettingsRepository())->get();
            return (string) ($settings['contact']['email'] ?? self::senderEmail());
        } catch (\Throwable) {
            return self::senderEmail();
        }
    }

    private static function frontendUrl(): string
    {
        return rtrim(trim((string) ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173')), '/');
    }

    /** @return list<string> */
    private static function adminEmails(): array
    {
        $raw = trim((string) ($_ENV['ADMIN_EMAILS'] ?? ''));
        if ($raw === '') {
            return [];
        }

        $emails = [];
        foreach (explode(',', $raw) as $part) {
            $email = filter_var(trim($part), FILTER_VALIDATE_EMAIL);
            if ($email) {
                $emails[] = $email;
            }
        }

        return array_values(array_unique($emails));
    }

    /**
     * Dispatch customer + admin emails for an order lifecycle event.
     *
     * @param array<string, mixed> $order
     */
    public static function handleOrderEvent(array $order, string $event): void
    {
        if (!self::isEnabled()) {
            return;
        }

        $customerEmail = filter_var((string) ($order['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $customerName = trim((string) ($order['shipping']['name'] ?? ''));

        $mail = self::buildOrderMail($order, $event);
        if ($mail === null) {
            return;
        }

        if ($customerEmail) {
            self::sendTransactionalEmail(
                $customerEmail,
                $mail['subject'],
                $mail['html'],
                $customerName !== '' ? $customerName : null,
                ['tags' => $mail['tags']],
            );
        }

        $payment = (string) ($order['payment'] ?? '');
        $paymentStatus = (string) ($order['paymentStatus'] ?? '');

        // COD: notify admins when the order is placed. Online pay: only after payment is received.
        if ($event === 'placed' && $payment !== 'razorpay') {
            self::notifyAdminsNewOrder($order);
        }
        if ($event === 'confirmed' && $payment === 'razorpay' && $paymentStatus === 'paid') {
            self::notifyAdminsNewOrder($order);
        }
    }

    /**
     * @param array<string, mixed> $order
     * @return array{subject: string, html: string, tags: list<string>}|null
     */
    private static function buildOrderMail(array $order, string $event): ?array
    {
        return match ($event) {
            'placed'     => self::orderPlacedMail($order),
            'confirmed'  => self::orderConfirmedMail($order),
            'out_for_delivery' => self::orderStatusMail($order, 'out_for_delivery', 'Out for Delivery', 'Your order is on its way!'),
            'packed'     => self::orderStatusMail($order, 'packed', 'Being Packed', 'Your order is being carefully packed.'),
            'shipped'    => self::orderShippedMail($order),
            'delivered'  => self::orderStatusMail($order, 'delivered', 'Delivered', 'Your order has been delivered. We hope you love it!'),
            'cancelled'  => self::orderCancelledMail($order),
            default      => null,
        };
    }

    /**
     * @param array<string, mixed> $order
     */
    private static function notifyAdminsNewOrder(array $order): void
    {
        $admins = self::adminEmails();
        if ($admins === []) {
            return;
        }

        $shortId = self::shortOrderId((string) ($order['id'] ?? ''));
        $total = self::formatInr((float) ($order['total'] ?? 0));
        $payment = self::paymentLabel($order);
        $customer = htmlspecialchars((string) ($order['shipping']['name'] ?? 'Customer'), ENT_QUOTES, 'UTF-8');
        $itemsHtml = self::renderItemsTable($order, false);
        $adminPath = trim((string) ($_ENV['ADMIN_PATH'] ?? '/wellness-studio'));
        if ($adminPath === '') {
            $adminPath = '/wellness-studio';
        }
        $adminUrl = htmlspecialchars(self::frontendUrl() . $adminPath . '/orders', ENT_QUOTES, 'UTF-8');
        $brand = htmlspecialchars(self::senderName(), ENT_QUOTES, 'UTF-8');

        $html = self::wrapEmail(
            'New order received',
            <<<HTML
            <p style="margin:0 0 16px;font-size:15px;color:#4a3f35;">A new order has been placed on {$brand}.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf7f2;border-radius:12px;">
                <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Order</p>
                    <p style="margin:0;font-size:20px;font-weight:600;color:#2c241c;">{$shortId}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#4a3f35;">{$customer} · {$payment} · <strong>{$total}</strong></p>
                </td></tr>
            </table>
            {$itemsHtml}
            <p style="margin:20px 0 0;text-align:center;">
                <a href="{$adminUrl}" style="display:inline-block;padding:12px 28px;background:#2c241c;color:#fff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">Open admin panel</a>
            </p>
            HTML,
        );

        foreach ($admins as $adminEmail) {
            self::sendTransactionalEmail(
                $adminEmail,
                "New order {$shortId}: {$total}",
                $html,
                null,
                ['tags' => ['order', 'admin', 'new_order']],
            );
        }
    }

    /**
     * @param array<string, mixed> $order
     * @return array{subject: string, html: string, tags: list<string>}
     */
    private static function orderPlacedMail(array $order): array
    {
        $shortId = self::shortOrderId((string) ($order['id'] ?? ''));
        $isRazorpay = ($order['payment'] ?? '') === 'razorpay' && ($order['paymentStatus'] ?? '') !== 'paid';

        $headline = $isRazorpay ? 'Order received. Complete your payment' : 'Thank you for your order!';
        $intro = $isRazorpay
            ? 'We have received your order. Please complete the online payment to confirm it.'
            : 'We have received your order and will confirm it shortly. You will receive another email once it is confirmed.';

        $html = self::orderBody($order, $headline, $intro, 'placed');

        return [
            'subject' => "Order received {$shortId} | " . self::senderName(),
            'html'    => $html,
            'tags'    => ['order', 'order_placed'],
        ];
    }

    /**
     * @param array<string, mixed> $order
     * @return array{subject: string, html: string, tags: list<string>}
     */
    private static function orderConfirmedMail(array $order): array
    {
        $shortId = self::shortOrderId((string) ($order['id'] ?? ''));
        $html = self::orderBody(
            $order,
            'Your order is confirmed!',
            'Payment received and your order is confirmed. We are preparing it with care.',
            'confirmed',
        );

        return [
            'subject' => "Order confirmed {$shortId} | " . self::senderName(),
            'html'    => $html,
            'tags'    => ['order', 'order_confirmed'],
        ];
    }

    /**
     * @param array<string, mixed> $order
     * @return array{subject: string, html: string, tags: list<string>}
     */
    private static function orderShippedMail(array $order): array
    {
        $shortId = self::shortOrderId((string) ($order['id'] ?? ''));
        $tracking = trim((string) ($order['trackingNumber'] ?? ''));
        $carrier = trim((string) ($order['carrier'] ?? ''));
        $eta = trim((string) ($order['estimatedDelivery'] ?? ''));

        $extra = '<p style="margin:0 0 12px;font-size:15px;color:#4a3f35;">Your order is on its way!</p>';
        if ($tracking !== '' || $carrier !== '' || $eta !== '') {
            $extra .= '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf7f2;border-radius:12px;"><tr><td style="padding:16px 20px;">';
            if ($carrier !== '') {
                $extra .= '<p style="margin:0 0 6px;font-size:14px;color:#4a3f35;"><strong>Carrier:</strong> ' . htmlspecialchars($carrier, ENT_QUOTES, 'UTF-8') . '</p>';
            }
            if ($tracking !== '') {
                $extra .= '<p style="margin:0 0 6px;font-size:14px;color:#4a3f35;"><strong>Tracking:</strong> ' . htmlspecialchars($tracking, ENT_QUOTES, 'UTF-8') . '</p>';
            }
            if ($eta !== '') {
                $extra .= '<p style="margin:0;font-size:14px;color:#4a3f35;"><strong>Estimated delivery:</strong> ' . htmlspecialchars($eta, ENT_QUOTES, 'UTF-8') . '</p>';
            }
            $extra .= '</td></tr></table>';
        }

        $html = self::orderBody($order, 'Your order has shipped', $extra, 'shipped', false);

        return [
            'subject' => "Order shipped {$shortId} | " . self::senderName(),
            'html'    => $html,
            'tags'    => ['order', 'order_shipped'],
        ];
    }

    /**
     * @param array<string, mixed> $order
     * @return array{subject: string, html: string, tags: list<string>}
     */
    private static function orderCancelledMail(array $order): array
    {
        $shortId = self::shortOrderId((string) ($order['id'] ?? ''));
        $html = self::orderBody(
            $order,
            'Your order was cancelled',
            'This order has been cancelled. If you were charged online, any refund will be processed as per our policy.',
            'cancelled',
        );

        return [
            'subject' => "Order cancelled {$shortId} | " . self::senderName(),
            'html'    => $html,
            'tags'    => ['order', 'order_cancelled'],
        ];
    }

    /**
     * @param array<string, mixed> $order
     * @return array{subject: string, html: string, tags: list<string>}
     */
    private static function orderStatusMail(array $order, string $status, string $title, string $message): array
    {
        $shortId = self::shortOrderId((string) ($order['id'] ?? ''));
        $html = self::orderBody($order, $title, $message, $status);

        return [
            'subject' => "Order update {$shortId}: {$title}",
            'html'    => $html,
            'tags'    => ['order', 'order_' . $status],
        ];
    }

    /**
     * @param array<string, mixed> $order
     */
    private static function orderBody(array $order, string $headline, string $intro, string $statusKey, bool $wrapIntro = true): string
    {
        $shortId = self::shortOrderId((string) ($order['id'] ?? ''));
        $orderUrl = htmlspecialchars(self::frontendUrl() . '/orders/' . rawurlencode((string) ($order['id'] ?? '')), ENT_QUOTES, 'UTF-8');
        $placedAt = self::formatDate((string) ($order['createdAt'] ?? ''));
        $payment = htmlspecialchars(self::paymentLabel($order), ENT_QUOTES, 'UTF-8');
        $introHtml = $wrapIntro
            ? '<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3f35;">' . htmlspecialchars($intro, ENT_QUOTES, 'UTF-8') . '</p>'
            : $intro;

        $itemsHtml = self::renderItemsTable($order, true);
        $summaryHtml = self::renderSummary($order);
        $shippingHtml = self::renderShipping($order);

        return self::wrapEmail(
            $headline,
            <<<HTML
            <p style="margin:0 0 8px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Order {$shortId}</p>
            <h2 style="margin:0 0 12px;font-size:24px;font-weight:600;color:#2c241c;">{$headline}</h2>
            {$introHtml}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                    <td style="padding:12px 16px;background:#faf7f2;border-radius:10px 10px 0 0;border-bottom:1px solid #efe6d8;">
                        <span style="font-size:13px;color:#8b7355;">Placed on</span><br>
                        <strong style="font-size:14px;color:#2c241c;">{$placedAt}</strong>
                    </td>
                    <td style="padding:12px 16px;background:#faf7f2;border-radius:10px 10px 0 0;border-bottom:1px solid #efe6d8;">
                        <span style="font-size:13px;color:#8b7355;">Payment</span><br>
                        <strong style="font-size:14px;color:#2c241c;">{$payment}</strong>
                    </td>
                </tr>
            </table>
            {$itemsHtml}
            {$summaryHtml}
            {$shippingHtml}
            <p style="margin:28px 0 0;text-align:center;">
                <a href="{$orderUrl}" style="display:inline-block;padding:14px 32px;background:#2c241c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">View order details</a>
            </p>
            HTML,
        );
    }

    /**
     * @param array<string, mixed> $order
     */
    private static function renderItemsTable(array $order, bool $withHeading): string
    {
        $items = is_array($order['items'] ?? null) ? $order['items'] : [];
        if ($items === []) {
            return '';
        }

        $heading = $withHeading
            ? '<p style="margin:0 0 12px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Items</p>'
            : '';

        $rows = '';
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $title = htmlspecialchars((string) ($item['title'] ?? 'Product'), ENT_QUOTES, 'UTF-8');
            $qty = (int) ($item['quantity'] ?? 1);
            $price = self::formatInr((float) ($item['price'] ?? 0));
            $lineTotal = self::formatInr((float) ($item['price'] ?? 0) * $qty);
            $image = trim((string) ($item['image'] ?? ''));
            $imageCell = $image !== ''
                ? '<img src="' . htmlspecialchars($image, ENT_QUOTES, 'UTF-8') . '" alt="" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:8px;background:#f3ece3;">'
                : '<div style="width:56px;height:56px;border-radius:8px;background:#f3ece3;"></div>';

            $rows .= <<<HTML
            <tr>
                <td style="padding:12px 0;border-bottom:1px solid #efe6d8;width:64px;vertical-align:top;">{$imageCell}</td>
                <td style="padding:12px 12px;border-bottom:1px solid #efe6d8;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#2c241c;">{$title}</p>
                    <p style="margin:0;font-size:13px;color:#8b7355;">Qty {$qty} × {$price}</p>
                </td>
                <td style="padding:12px 0;border-bottom:1px solid #efe6d8;text-align:right;vertical-align:top;white-space:nowrap;">
                    <strong style="font-size:14px;color:#2c241c;">{$lineTotal}</strong>
                </td>
            </tr>
            HTML;
        }

        return <<<HTML
        {$heading}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            {$rows}
        </table>
        HTML;
    }

    /**
     * @param array<string, mixed> $order
     */
    private static function renderSummary(array $order): string
    {
        $subtotal = self::formatInr((float) ($order['subtotal'] ?? 0));
        $discount = (float) ($order['discountAmount'] ?? 0);
        $delivery = (float) ($order['deliveryFee'] ?? 0);
        $total = self::formatInr((float) ($order['total'] ?? 0));

        $discountRow = $discount > 0
            ? '<tr><td style="padding:4px 0;color:#4a3f35;">Discount</td><td style="padding:4px 0;text-align:right;color:#1f7a4d;">-' . self::formatInr($discount) . '</td></tr>'
            : '';

        $couponCode = trim((string) ($order['couponCode'] ?? ''));
        $couponNote = $couponCode !== ''
            ? '<tr><td colspan="2" style="padding:0 0 8px;font-size:12px;color:#8b7355;">Coupon: ' . htmlspecialchars($couponCode, ENT_QUOTES, 'UTF-8') . '</td></tr>'
            : '';

        $deliveryLabel = $delivery <= 0 ? 'Free' : self::formatInr($delivery);

        return <<<HTML
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#faf7f2;border-radius:12px;">
            <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 12px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Summary</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                    {$couponNote}
                    <tr><td style="padding:4px 0;color:#4a3f35;">Subtotal</td><td style="padding:4px 0;text-align:right;color:#2c241c;">{$subtotal}</td></tr>
                    {$discountRow}
                    <tr><td style="padding:4px 0;color:#4a3f35;">Delivery</td><td style="padding:4px 0;text-align:right;color:#2c241c;">{$deliveryLabel}</td></tr>
                    <tr><td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#2c241c;border-top:1px solid #e8ddd0;">Total</td><td style="padding:12px 0 0;text-align:right;font-size:16px;font-weight:700;color:#2c241c;border-top:1px solid #e8ddd0;">{$total}</td></tr>
                </table>
            </td></tr>
        </table>
        HTML;
    }

    /**
     * @param array<string, mixed> $order
     */
    private static function renderShipping(array $order): string
    {
        $shipping = is_array($order['shipping'] ?? null) ? $order['shipping'] : [];
        if ($shipping === []) {
            return '';
        }

        $name = htmlspecialchars((string) ($shipping['name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $phone = htmlspecialchars((string) ($shipping['phone'] ?? ''), ENT_QUOTES, 'UTF-8');
        $address = htmlspecialchars((string) ($shipping['address'] ?? ''), ENT_QUOTES, 'UTF-8');
        $landmark = trim((string) ($shipping['landmark'] ?? ''));
        $city = htmlspecialchars((string) ($shipping['city'] ?? ''), ENT_QUOTES, 'UTF-8');
        $state = htmlspecialchars((string) ($shipping['state'] ?? ''), ENT_QUOTES, 'UTF-8');
        $pincode = htmlspecialchars((string) ($shipping['pincode'] ?? ''), ENT_QUOTES, 'UTF-8');

        $landmarkLine = $landmark !== ''
            ? '<br>' . htmlspecialchars($landmark, ENT_QUOTES, 'UTF-8')
            : '';

        return <<<HTML
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#faf7f2;border-radius:12px;">
            <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 12px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Delivery address</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#2c241c;">
                    <strong>{$name}</strong><br>
                    {$address}{$landmarkLine}<br>
                    {$city}, {$state} {$pincode}<br>
                    Phone: {$phone}
                </p>
            </td></tr>
        </table>
        HTML;
    }

    private static function wrapEmail(string $title, string $bodyHtml): string
    {
        $brand = htmlspecialchars(self::senderName(), ENT_QUOTES, 'UTF-8');
        $tagline = htmlspecialchars(self::brandTagline(), ENT_QUOTES, 'UTF-8');
        $year = date('Y');

        return <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{$title}</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(44,36,28,0.08);">
                            <tr>
                                <td style="padding:28px 32px 12px;text-align:center;border-bottom:1px solid #efe6d8;">
                                    <p style="margin:0;font-size:22px;font-weight:600;color:#2c241c;letter-spacing:0.04em;">{$brand}</p>
                                    <p style="margin:6px 0 0;font-size:12px;color:#8b7355;letter-spacing:0.12em;text-transform:uppercase;">{$tagline}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:28px 32px 32px;">
                                    {$bodyHtml}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:20px 32px;background:#faf7f2;text-align:center;">
                                    <p style="margin:0 0 6px;font-size:12px;color:#8b7355;">Questions? Reply to this email. We are happy to help.</p>
                                    <p style="margin:0;font-size:11px;color:#b0a08d;">© {$year} {$brand}. All rights reserved.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        HTML;
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
        if (!self::isEnabled()) {
            return ['ok' => false, 'error' => 'Brevo is not configured'];
        }

        $recipient = ['email' => $to];
        if ($toName !== null && trim($toName) !== '') {
            $recipient['name'] = trim($toName);
        }

        $payload = [
            'sender' => [
                'name'  => self::senderName(),
                'email' => self::senderEmail(),
            ],
            'to' => [$recipient],
            'subject' => $subject,
            'htmlContent' => $htmlContent,
            'replyTo' => [
                'email' => self::replyEmail(),
                'name'  => self::senderName(),
            ],
        ];

        $tags = $options['tags'] ?? [];
        if (is_array($tags) && $tags !== []) {
            $payload['tags'] = array_values(array_filter(array_map('strval', $tags)));
        }

        $headers = [
            'accept: application/json',
            'content-type: application/json',
            'api-key: ' . self::apiKey(),
        ];

        $result = HttpClient::request(
            'POST',
            self::API_URL,
            $headers,
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            30,
        );

        $httpCode = (int) ($result['httpCode'] ?? 0);

        if (!$result['ok']) {
            error_log('[Brevo] Network error: ' . ($result['error'] ?? 'unknown'));
            return ['ok' => false, 'error' => $result['error'] ?? 'Network error', 'httpCode' => $httpCode];
        }

        $data = json_decode((string) ($result['body'] ?? ''), true);
        if ($httpCode < 200 || $httpCode >= 300) {
            $message = is_array($data)
                ? (string) ($data['message'] ?? $data['code'] ?? 'Brevo API error')
                : 'Brevo API error';
            error_log('[Brevo] HTTP ' . $httpCode . ': ' . $message . ' | ' . (string) ($result['body'] ?? ''));
            return ['ok' => false, 'error' => $message, 'httpCode' => $httpCode];
        }

        return [
            'ok'        => true,
            'messageId' => is_array($data) ? (string) ($data['messageId'] ?? '') : '',
            'httpCode'  => $httpCode,
        ];
    }

    /** @return array{ok: bool, messageId?: string, error?: string, httpCode?: int} */
    public static function sendEmailVerification(string $to, string $name, string $verifyUrl): array
    {
        $brand = self::senderName();
        $year = (string) gmdate('Y');
        $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeUrl = htmlspecialchars($verifyUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $html = <<<HTML
        <p>Hi {$safeName},</p>
        <p>Welcome to {$brand}! Please confirm your email address to place orders and receive updates.</p>
        <p style="margin:28px 0;">
            <a href="{$safeUrl}" style="display:inline-block;padding:14px 28px;background:#0F5132;color:#faf7f2;text-decoration:none;border-radius:999px;font-weight:600;">
                Verify email address
            </a>
        </p>
        <p style="font-size:13px;color:#8b7355;">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
        <p style="font-size:12px;color:#b0a08d;">© {$year} {$brand}</p>
        HTML;

        return self::sendTransactionalEmail(
            $to,
            'Verify your email — ' . $brand,
            $html,
            $name,
            ['tags' => ['email-verification']],
        );
    }

  /** @param array<string, mixed> $order */
    private static function paymentLabel(array $order): string
    {
        $payment = (string) ($order['payment'] ?? '');
        $paymentStatus = (string) ($order['paymentStatus'] ?? '');
        $refundStatus = (string) ($order['refundStatus'] ?? '');

        if ($payment === 'razorpay') {
            if ($refundStatus === 'refunded') {
                return 'Refunded';
            }
            if ($paymentStatus === 'paid') {
                return 'Paid Online';
            }
            if ($paymentStatus === 'failed') {
                return 'Payment Failed';
            }

            return 'Payment Pending';
        }

        if ($refundStatus === 'refunded') {
            return 'COD · Refunded';
        }

        return 'Cash on Delivery';
    }

    private static function shortOrderId(string $id): string
    {
        if ($id === '') {
            return '';
        }

        $parts = explode('-', $id);
        if (count($parts) > 1) {
            return '#' . substr((string) end($parts), 0, 8);
        }

        return '#' . substr($id, -8);
    }

    private static function formatInr(float $amount): string
    {
        return '₹' . number_format($amount, 2);
    }

    private static function formatDate(string $iso): string
    {
        if ($iso === '') {
            return '—';
        }

        try {
            $dt = new \DateTimeImmutable($iso);
            return $dt->setTimezone(new \DateTimeZone('Asia/Kolkata'))->format('d M Y, h:i A') . ' IST';
        } catch (\Throwable) {
            return $iso;
        }
    }
}
