<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\AddressBookHelper;
use Krivea\Auth;
use Krivea\EmailService;
use Krivea\CouponService;
use Krivea\Database;
use Krivea\ExportHelper;
use Krivea\OrderRevenue;
use Krivea\OtpConfig;
use Krivea\RazorpayService;
use Krivea\Repository\BundleRepository;
use Krivea\Repository\CouponRepository;
use Krivea\Repository\OrderRepository;
use Krivea\Repository\ProductRepository;
use Krivea\Repository\SettingsRepository;
use Krivea\Repository\UserRepository;
use Krivea\Request;
use Krivea\Response;
use Krivea\Routes\AuthRoutes;
use Krivea\ServicesConfig;

final class OrderRoutes
{
    private const ALLOWED_STATUSES = [
        'placed',
        'confirmed',
        'packed',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
        'out_for_delivery', // legacy
    ];

    private const FULFILLMENT_PIPELINE = [
        'confirmed',
        'out_for_delivery',
        'delivered',
    ];

    private static function repo(): OrderRepository
    {
        static $repo = null;
        $repo ??= new OrderRepository();
        return $repo;
    }

    private static function products(): ProductRepository
    {
        static $repo = null;
        $repo ??= new ProductRepository();
        return $repo;
    }

    private static function coupons(): CouponRepository
    {
        static $repo = null;
        $repo ??= new CouponRepository();
        return $repo;
    }

    private static function bundles(): BundleRepository
    {
        static $repo = null;
        $repo ??= new BundleRepository();
        return $repo;
    }

    private static function couponService(): CouponService
    {
        static $svc = null;
        $svc ??= new CouponService();
        return $svc;
    }

    public static function list(): void
    {
        $payload = Auth::requireCustomer();
        try {
            $orders = self::repo()->getByUserId($payload['userId']);
            Response::json(array_map([self::class, 'enrichOrder'], $orders));
        } catch (\Exception) {
            Response::error('Failed to fetch orders', 500);
        }
    }

    public static function getOne(string $id): void
    {
        $payload = Auth::requireCustomer();
        try {
            $order = self::repo()->getById($id);
            if (!$order || ($order['userId'] ?? '') !== $payload['userId']) {
                Response::error('Order not found', 404);
            }
            Response::json(self::enrichOrder($order));
        } catch (\Exception) {
            Response::error('Failed to fetch order', 500);
        }
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            $filters = [
                'status'  => $_GET['status'] ?? '',
                'payment' => $_GET['payment'] ?? '',
                'search'  => $_GET['search'] ?? '',
                'from'    => $_GET['from'] ?? '',
                'to'      => $_GET['to'] ?? '',
                'sort'    => $_GET['sort'] ?? 'createdAt',
                'order'   => $_GET['order'] ?? 'desc',
                'source'  => $_GET['source'] ?? '',
            ];
            $orders = self::repo()->listAdminFiltered($filters);
            Response::json(array_map([self::class, 'enrichOrder'], $orders));
        } catch (\Exception) {
            Response::error('Failed to fetch orders', 500);
        }
    }

    public static function exportAdmin(): void
    {
        Auth::requireAdmin();
        try {
            $filters = [
                'status'  => $_GET['status'] ?? '',
                'payment' => $_GET['payment'] ?? '',
                'search'  => $_GET['search'] ?? '',
                'from'    => $_GET['from'] ?? '',
                'to'      => $_GET['to'] ?? '',
                'sort'    => $_GET['sort'] ?? 'createdAt',
                'order'   => $_GET['order'] ?? 'desc',
                'source'  => $_GET['source'] ?? '',
            ];
            $orders = self::repo()->listAdminFiltered($filters);

            $format = strtolower((string) ($_GET['format'] ?? 'csv'));
            if ($format !== 'csv' && $format !== 'pdf') {
                Response::error('Invalid export format. Use csv or pdf.', 400);
            }

            $headers = [
                'Order ID',
                'Date',
                'Status',
                'Source',
                'Customer Name',
                'Email',
                'Phone',
                'City',
                'State',
                'Pincode',
                'Address',
                'Items',
                'Subtotal',
                'Discount',
                'Delivery Fee',
                'Total',
                'Revenue',
                'Payment',
                'Payment Status',
                'Coupon',
                'Tracking',
                'Carrier',
                'User ID',
            ];

            $rows = [];
            foreach ($orders as $order) {
                $shipping = is_array($order['shipping'] ?? null) ? $order['shipping'] : [];
                $itemTitles = array_map(
                    fn($item) => ($item['title'] ?? 'Item') . ' x' . ($item['quantity'] ?? 1),
                    $order['items'] ?? [],
                );

                $rows[] = [
                    $order['id'] ?? '',
                    $order['createdAt'] ?? '',
                    $order['status'] ?? '',
                    $order['orderSource'] ?? 'website',
                    $shipping['name'] ?? '',
                    $order['email'] ?? '',
                    $shipping['phone'] ?? '',
                    $shipping['city'] ?? '',
                    $shipping['state'] ?? '',
                    $shipping['pincode'] ?? '',
                    $shipping['address'] ?? '',
                    implode('; ', $itemTitles),
                    (string) ($order['subtotal'] ?? 0),
                    (string) ($order['discountAmount'] ?? 0),
                    (string) ($order['deliveryFee'] ?? 0),
                    (string) ($order['total'] ?? 0),
                    (string) OrderRevenue::forOrder($order),
                    $order['payment'] ?? '',
                    $order['paymentStatus'] ?? '',
                    $order['couponCode'] ?? '',
                    $order['trackingNumber'] ?? '',
                    $order['carrier'] ?? '',
                    $order['userId'] ?? '',
                ];
            }

            $from = $filters['from'] !== '' ? $filters['from'] : 'all';
            $to = $filters['to'] !== '' ? $filters['to'] : 'all';
            $baseName = "wellness-orders-{$from}-to-{$to}";

            if ($format === 'pdf') {
                ExportHelper::exportTablePdf("{$baseName}.pdf", 'Orders Export', $headers, $rows);
            }

            Response::csv("{$baseName}.csv", $headers, $rows);
        } catch (\Exception) {
            Response::error('Failed to export orders', 500);
        }
    }

    public static function getOneAdmin(string $id): void
    {
        Auth::requireAdmin();
        try {
            $order = self::repo()->getById($id);
            if (!$order) {
                Response::error('Order not found', 404);
            }
            Response::json(self::enrichOrder($order));
        } catch (\Exception) {
            Response::error('Failed to fetch order', 500);
        }
    }

    public static function updateStatus(string $id): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            $status = (string) ($body['status'] ?? '');

            if (!in_array($status, self::ALLOWED_STATUSES, true)) {
                Response::error('Invalid status. Allowed: ' . implode(', ', self::ALLOWED_STATUSES), 400);
            }

            $existing = self::repo()->getById($id);
            if (!$existing) {
                Response::error('Order not found', 404);
            }

            $prev = (string) ($existing['status'] ?? '');
            $note = isset($body['note']) ? trim((string) $body['note']) : '';

            if ($status === 'cancelled' && $prev !== 'cancelled') {
                self::restoreStockForOrder($existing);
                self::releaseCouponForOrder($existing);
            }

            $changes = self::buildStatusChange($existing, $status, $note ?: null, 'admin');
            $updated = self::repo()->update($id, $changes);
            if ($updated && $prev !== $status) {
                self::dispatchOrderEmail($updated, $status, $prev);
            }
            $updated ? Response::json(self::enrichOrder($updated)) : Response::error('Order not found', 404);
        } catch (\Exception) {
            Response::error('Failed to update order', 500);
        }
    }

    public static function bulkUpdateStatus(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            $ids = $body['ids'] ?? [];
            $status = (string) ($body['status'] ?? '');
            $note = isset($body['note']) ? trim((string) $body['note']) : '';

            if (!is_array($ids) || count($ids) === 0) {
                Response::error('ids array is required', 400);
            }

            if (!in_array($status, self::ALLOWED_STATUSES, true)) {
                Response::error('Invalid status', 400);
            }

            $updated = [];
            foreach ($ids as $id) {
                $id = (string) $id;
                $existing = self::repo()->getById($id);
                if (!$existing) {
                    continue;
                }

                $prev = (string) ($existing['status'] ?? '');
                if ($status === 'cancelled' && $prev !== 'cancelled') {
                    self::restoreStockForOrder($existing);
                    self::releaseCouponForOrder($existing);
                }

                $changes = self::buildStatusChange($existing, $status, $note ?: 'Bulk update', 'admin');
                $result = self::repo()->update($id, $changes);
                if ($result) {
                    if ($prev !== $status) {
                        self::dispatchOrderEmail($result, $status, $prev);
                    }
                    $updated[] = self::enrichOrder($result);
                }
            }

            Response::json(['updated' => count($updated), 'orders' => $updated]);
        } catch (\Exception) {
            Response::error('Failed to bulk update orders', 500);
        }
    }

    public static function bulkRefund(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            $ids = $body['ids'] ?? [];
            $note = trim((string) ($body['note'] ?? 'Refund processed'));

            if (!is_array($ids) || count($ids) === 0) {
                Response::error('ids array is required', 400);
            }

            $updated = [];
            foreach ($ids as $id) {
                $id = (string) $id;
                $existing = self::repo()->getById($id);
                if (!$existing) {
                    continue;
                }

                $changes = [
                    'refundStatus' => 'refunded',
                    'refundedAt'   => gmdate('c'),
                    'updatedAt'    => gmdate('c'),
                ];

                $current = (string) ($existing['status'] ?? '');
                if (!in_array($current, ['cancelled', 'returned'], true)) {
                    $statusChanges = self::buildStatusChange($existing, 'returned', $note, 'admin');
                    $changes = array_merge($changes, $statusChanges);
                } else {
                    $changes['adminNotes'] = self::appendAdminNote($existing, $note);
                }

                $result = self::repo()->update($id, $changes);
                if ($result) {
                    $updated[] = self::enrichOrder($result);
                }
            }

            Response::json(['updated' => count($updated), 'orders' => $updated]);
        } catch (\Exception) {
            Response::error('Failed to process refunds', 500);
        }
    }

    public static function updateDetails(string $id): void
    {
        Auth::requireAdmin();
        try {
            $existing = self::repo()->getById($id);
            if (!$existing) {
                Response::error('Order not found', 404);
            }

            $body = Request::body();
            $changes = ['updatedAt' => gmdate('c')];

            if (array_key_exists('trackingNumber', $body)) {
                $changes['trackingNumber'] = trim((string) $body['trackingNumber']);
            }
            if (array_key_exists('carrier', $body)) {
                $changes['carrier'] = trim((string) $body['carrier']);
            }
            if (array_key_exists('estimatedDelivery', $body)) {
                $changes['estimatedDelivery'] = trim((string) $body['estimatedDelivery']);
            }
            if (array_key_exists('adminNotes', $body)) {
                $changes['adminNotes'] = trim((string) $body['adminNotes']);
            }

            $updated = self::repo()->update($id, $changes);
            $updated ? Response::json(self::enrichOrder($updated)) : Response::error('Order not found', 404);
        } catch (\Exception) {
            Response::error('Failed to update order details', 500);
        }
    }

  public static function createDirect(): void
    {
        Auth::requireAdmin();
        try {
            $body = Request::body();
            if (empty($body['items']) || !is_array($body['items'])) {
                Response::error('items array is required', 400);
            }

            $built = self::buildDirectOrderItems($body['items']);
            $items = $built['items'];
            $subtotal = $built['subtotal'];

            $shipping = is_array($body['shipping'] ?? null) ? $body['shipping'] : [];
            $name = trim((string) ($shipping['name'] ?? ''));
            $phone = trim((string) ($shipping['phone'] ?? ''));
            if ($name === '' || $phone === '') {
                Response::error('Customer name and phone are required', 400);
            }

            $discountAmount = max(0, (float) ($body['discountAmount'] ?? 0));
            $deliveryFee = max(0, (float) ($body['deliveryFee'] ?? 0));
            $total = round(max(0, $subtotal - $discountAmount + $deliveryFee), 2);

            $payment = strtolower((string) ($body['payment'] ?? 'cod'));
            if (!in_array($payment, ['cod', 'offline', 'pending'], true)) {
                Response::error('Invalid payment method. Use cod, offline, or pending', 400);
            }

            $status = (string) ($body['status'] ?? 'placed');
            if (!in_array($status, self::ALLOWED_STATUSES, true)) {
                Response::error('Invalid status', 400);
            }

            $adjustStock = ($body['adjustStock'] ?? true) !== false;
            if ($adjustStock) {
                self::decrementStockForDirectItems($items);
            }

            $orderId = Database::generateId('order');
            $email = trim((string) ($body['email'] ?? $shipping['email'] ?? ''));
            $now = gmdate('c');
            $adminNotes = trim((string) ($body['adminNotes'] ?? ''));
            $note = trim((string) ($body['statusNote'] ?? 'Direct order created by admin'));

            $paymentStatus = match ($payment) {
                'offline' => 'paid',
                'pending' => 'pending',
                default   => 'cod',
            };

            $order = [
                'id'             => $orderId,
                'orderSource'    => 'direct',
                'userId'         => trim((string) ($body['userId'] ?? '')),
                'email'          => $email,
                'items'          => $items,
                'subtotal'       => $subtotal,
                'discountAmount' => $discountAmount,
                'deliveryFee'    => $deliveryFee,
                'total'          => $total,
                'status'         => $status,
                'shipping'       => $shipping,
                'payment'        => $payment,
                'paymentStatus'  => $paymentStatus,
                'createdAt'      => $now,
                'updatedAt'      => $now,
                'createdBy'      => 'admin',
                'statusHistory'  => [
                    ['status' => $status, 'at' => $now, 'by' => 'admin', 'note' => $note],
                ],
            ];

            if ($payment === 'offline') {
                $order['paidAt'] = $now;
            }

            if ($adminNotes !== '') {
                $order['adminNotes'] = $adminNotes;
            }

            if (trim((string) ($body['trackingNumber'] ?? '')) !== '') {
                $order['trackingNumber'] = trim((string) $body['trackingNumber']);
            }
            if (trim((string) ($body['carrier'] ?? '')) !== '') {
                $order['carrier'] = trim((string) $body['carrier']);
            }
            if (trim((string) ($body['estimatedDelivery'] ?? '')) !== '') {
                $order['estimatedDelivery'] = trim((string) $body['estimatedDelivery']);
            }

            $created = self::repo()->create($order);

            $sendEmail = ($body['sendEmail'] ?? false) === true;
            if ($sendEmail && $email !== '') {
                $emailEvent = $status === 'confirmed' || $paymentStatus === 'paid' ? 'confirmed' : 'placed';
                self::dispatchOrderEmail($created, $emailEvent);
            }

            Response::json(self::enrichOrder($created), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Exception) {
            Response::error('Failed to create direct order', 500);
        }
    }

    public static function create(): void
    {
        $payload = Auth::requireCustomer();
        try {
            $body = Request::body();
            if (empty($body['items']) || !is_array($body['items'])) {
                Response::error('items array is required', 400);
            }

            $payment = strtolower((string) ($body['payment'] ?? 'cod'));
            if (!in_array($payment, ['cod', 'razorpay'], true)) {
                Response::error('Invalid payment method', 400);
            }

            $validated = self::validateAndBuildItems($body['items']);
            self::validatePaymentMethod($payment, $validated['items']);
            $subtotal  = $validated['subtotal'];
            $items     = $validated['items'];

            $shipping = is_array($body['shipping'] ?? null) ? $body['shipping'] : [];
            self::requireVerifiedEmail($payload['userId'] ?? '');
            self::requireVerifiedPhone($payload['userId'] ?? '', (string) ($shipping['phone'] ?? ''));

            $couponCode = CouponService::normalizeCode((string) ($body['couponCode'] ?? ''));
            $couponRecord = null;
            $discountAmount = 0.0;
            $deliveryFee = 0.0;
            $deliverySaved = 0.0;
            $couponType = '';

            $svc = self::couponService();
            $deliverySettings = $svc->deliverySettings();
            $baseDeliveryFee = $subtotal >= $deliverySettings['freeThreshold']
                ? 0.0
                : $deliverySettings['fee'];

            if ($couponCode !== '') {
                $validation = $svc->validate($couponCode, $subtotal, $payload['userId'] ?? '');
                if (!$validation['valid']) {
                    throw new \InvalidArgumentException((string) ($validation['message'] ?? 'Invalid coupon'));
                }

                $couponRecord = self::coupons()->findByCode($couponCode);
                $breakdown = $validation['breakdown'] ?? $svc->calculateBreakdown($subtotal, $couponRecord ?? []);
                $discountAmount = (float) ($breakdown['discountAmount'] ?? 0);
                $deliveryFee = (float) ($breakdown['deliveryFee'] ?? $baseDeliveryFee);
                $couponType = (string) ($breakdown['couponType'] ?? '');

                if (!empty($breakdown['freeDeliveryFromCoupon']) && $baseDeliveryFee > 0) {
                    $deliverySaved = $baseDeliveryFee;
                }
            } else {
                $deliveryFee = $baseDeliveryFee;
            }

            $total = round(max(0, $subtotal - $discountAmount + $deliveryFee), 2);

            // Reserve the coupon usage slot atomically *before* touching stock —
            // closes a race where two concurrent checkouts both pass validate()'s
            // (now-stale) usage_count read and both get accepted past the limit.
            if ($couponRecord && !self::couponService()->recordUsage((string) $couponRecord['id'])) {
                throw new \InvalidArgumentException('This coupon just reached its usage limit. Please remove it and try again.');
            }

            try {
                self::decrementStock($items);
            } catch (\Throwable $e) {
                if ($couponRecord) {
                    self::couponService()->releaseUsage((string) $couponRecord['id']);
                }
                throw $e;
            }

            $orderId = Database::generateId('order');
            $customerEmail = trim((string) ($body['customerEmail'] ?? $shipping['email'] ?? $payload['email'] ?? ''));
            $now = gmdate('c');

            $order = [
                'id'            => $orderId,
                'orderSource'   => 'website',
                'userId'        => $payload['userId'],
                'email'         => $customerEmail ?: ($payload['email'] ?? ''),
                'items'         => $items,
                'subtotal'      => $subtotal,
                'discountAmount'=> $discountAmount,
                'deliveryFee'   => $deliveryFee,
                'total'         => $total,
                'status'        => 'placed',
                'shipping'      => $shipping,
                'payment'       => $payment,
                'paymentStatus' => $payment === 'cod' ? 'cod' : 'pending',
                'createdAt'     => $now,
                'updatedAt'     => $now,
                'statusHistory' => [
                    ['status' => 'placed', 'at' => $now, 'by' => 'system', 'note' => 'Order placed'],
                ],
            ];

            if ($couponRecord) {
                $order['couponCode'] = (string) ($couponRecord['code'] ?? $couponCode);
                $order['couponId'] = (string) ($couponRecord['id'] ?? '');
                $order['couponType'] = $couponType;
                if ($deliverySaved > 0) {
                    $order['deliverySaved'] = $deliverySaved;
                }
            }

            if ($payment === 'razorpay') {
                try {
                    $amountPaise = (int) round($total * 100);
                    $rp = RazorpayService::createOrder($amountPaise, $orderId, [
                        'order_id' => $orderId,
                        'email'    => (string) ($payload['email'] ?? ''),
                    ]);
                    $order['razorpayOrderId'] = $rp['id'];
                    $order['razorpayAmount']  = $rp['amount'];
                } catch (\Throwable $e) {
                    self::restoreStockItems($items);
                    if ($couponRecord) {
                        self::couponService()->releaseUsage((string) $couponRecord['id']);
                    }
                    Response::error($e->getMessage(), 502);
                }
            }

            try {
                $created = self::repo()->create($order);
            } catch (\Throwable $e) {
                self::restoreStockItems($items);
                if ($couponRecord) {
                    self::couponService()->releaseUsage((string) $couponRecord['id']);
                }
                throw $e;
            }

            // Best-effort convenience sync — must never turn a successfully placed
            // order into a customer-facing failure response.
            try {
                $addressBook = is_array($body['addressBook'] ?? null) ? $body['addressBook'] : [];
                AddressBookHelper::syncFromCheckout(
                    (string) ($payload['userId'] ?? ''),
                    $shipping,
                    $addressBook,
                );
            } catch (\Throwable) {
                // ignore — address book is a convenience feature, not part of the order
            }

            // COD: acknowledge order immediately. Online pay: email only after payment succeeds.
            if ($payment !== 'razorpay') {
                self::dispatchOrderEmail($created, 'placed');
            }

            $response = self::enrichOrder($created);
            if ($payment === 'razorpay') {
                $response['razorpayKeyId'] = RazorpayService::keyId();
            }

            Response::json($response, 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Exception) {
            Response::error('Failed to create order', 500);
        }
    }

    public static function verifyPayment(): void
    {
        $payload = Auth::requireCustomer();
        try {
            $body = Request::body();
            $orderId          = (string) ($body['orderId'] ?? '');
            $razorpayOrderId  = (string) ($body['razorpayOrderId'] ?? $body['razorpay_order_id'] ?? '');
            $razorpayPaymentId = (string) ($body['razorpayPaymentId'] ?? $body['razorpay_payment_id'] ?? '');
            $razorpaySignature = (string) ($body['razorpaySignature'] ?? $body['razorpay_signature'] ?? '');

            if ($orderId === '' || $razorpayOrderId === '' || $razorpayPaymentId === '' || $razorpaySignature === '') {
                Response::error('Missing payment verification fields', 400);
            }

            $order = self::repo()->getById($orderId);
            if (!$order || ($order['userId'] ?? '') !== $payload['userId']) {
                Response::error('Order not found', 404);
            }

            if (($order['payment'] ?? '') !== 'razorpay') {
                Response::error('Order is not a Razorpay payment', 400);
            }

            if (($order['paymentStatus'] ?? '') === 'paid') {
                Response::json(self::enrichOrder($order));
            }

            if (($order['razorpayOrderId'] ?? '') !== $razorpayOrderId) {
                Response::error('Razorpay order mismatch', 400);
            }

            if (!RazorpayService::verifyPaymentSignature($razorpayOrderId, $razorpayPaymentId, $razorpaySignature)) {
                Response::error('Invalid payment signature', 400);
            }

            $now = gmdate('c');
            $prevStatus = (string) ($order['status'] ?? 'placed');
            $statusChanges = self::buildStatusChange($order, 'confirmed', 'Payment received', 'system');
            $updated = self::repo()->update($orderId, array_merge($statusChanges, [
                'paymentStatus'      => 'paid',
                'razorpayPaymentId'  => $razorpayPaymentId,
                'razorpaySignature'  => $razorpaySignature,
                'paidAt'             => $now,
            ]));

            if ($updated) {
                self::dispatchOrderEmail($updated, 'confirmed', $prevStatus);
            }

            Response::json(self::enrichOrder($updated));
        } catch (\Exception) {
            Response::error('Failed to verify payment', 500);
        }
    }

    /**
     * Server-to-server payment confirmation. Reconciles orders whose client
     * never called verifyPayment() (browser/network died right after paying) —
     * without this, a captured Razorpay payment with no matching webhook has
     * no path to ever mark the order paid. Idempotent: safe for Razorpay's
     * automatic retries and safe to run after verifyPayment() already ran.
     */
    public static function razorpayWebhook(): void
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

        if (!RazorpayService::isWebhookConfigured()) {
            // Not set up — ack quietly rather than let Razorpay retry forever.
            Response::json(['ok' => true, 'skipped' => 'webhook not configured']);
        }

        if (!RazorpayService::verifyWebhookSignature($rawBody, (string) $signature)) {
            Response::error('Invalid webhook signature', 400);
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            Response::error('Invalid payload', 400);
        }

        $event = (string) ($payload['event'] ?? '');
        if (!in_array($event, ['payment.captured', 'order.paid'], true)) {
            // Ack unhandled event types so Razorpay doesn't keep retrying them.
            Response::json(['ok' => true, 'ignored' => $event]);
        }

        try {
            $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
            $razorpayOrderId = (string) ($paymentEntity['order_id'] ?? '');
            $razorpayPaymentId = (string) ($paymentEntity['id'] ?? '');

            $order = self::repo()->findByRazorpayOrderId($razorpayOrderId);
            if (!$order) {
                // Unknown to us (e.g. a test event) — ack so Razorpay stops retrying.
                Response::json(['ok' => true, 'note' => 'order not found']);
            }

            if (($order['paymentStatus'] ?? '') === 'paid') {
                Response::json(['ok' => true, 'note' => 'already reconciled']);
            }

            $now = gmdate('c');
            $prevStatus = (string) ($order['status'] ?? 'placed');
            $statusChanges = self::buildStatusChange($order, 'confirmed', 'Payment confirmed via webhook', 'system');
            $updated = self::repo()->update((string) $order['id'], array_merge($statusChanges, [
                'paymentStatus'     => 'paid',
                'razorpayPaymentId' => $razorpayPaymentId ?: ($order['razorpayPaymentId'] ?? ''),
                'paidAt'            => $now,
            ]));

            if ($updated) {
                self::dispatchOrderEmail($updated, 'confirmed', $prevStatus);
            }

            Response::json(['ok' => true]);
        } catch (\Throwable) {
            // Signal failure so Razorpay retries later, rather than silently drop it.
            Response::error('Failed to process webhook', 500);
        }
    }

    public static function cancelPending(): void
    {
        $payload = Auth::requireCustomer();
        try {
            $body = Request::body();
            $orderId = (string) ($body['orderId'] ?? '');
            if ($orderId === '') {
                Response::error('orderId is required', 400);
            }

            $order = self::repo()->getById($orderId);
            if (!$order || ($order['userId'] ?? '') !== $payload['userId']) {
                Response::error('Order not found', 404);
            }

            if (($order['payment'] ?? '') !== 'razorpay') {
                Response::error('Only pending online payments can be cancelled this way', 400);
            }

            if (($order['paymentStatus'] ?? '') === 'paid') {
                Response::error('Payment already completed', 400);
            }

            if (($order['status'] ?? '') === 'cancelled') {
                Response::json(self::enrichOrder($order));
            }

            self::restoreStockForOrder($order);
            self::releaseCouponForOrder($order);
            $statusChanges = self::buildStatusChange($order, 'cancelled', 'Payment cancelled', 'customer');
            $updated = self::repo()->update($orderId, array_merge($statusChanges, [
                'paymentStatus' => 'failed',
                'cancelledAt'   => gmdate('c'),
            ]));

            if ($updated) {
                self::dispatchOrderEmail($updated, 'cancelled');
            }

            Response::json(self::enrichOrder($updated));
        } catch (\Exception) {
            Response::error('Failed to cancel order', 500);
        }
    }

    /**
     * Send transactional emails without blocking the order API response.
     *
     * @param array<string, mixed> $order
     */
    private static function dispatchOrderEmail(array $order, string $event, ?string $prevStatus = null): void
    {
        try {
            if ($event === 'confirmed' && $prevStatus !== null) {
                $payment = (string) ($order['payment'] ?? '');
                $paymentStatus = (string) ($order['paymentStatus'] ?? '');
                if ($payment === 'razorpay' && $paymentStatus === 'paid' && $prevStatus === 'confirmed') {
                    return;
                }
            }

            $allowed = ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'packed', 'shipped'];
            if (!in_array($event, $allowed, true)) {
                return;
            }

            EmailService::handleOrderEvent($order, $event);
        } catch (\Throwable $e) {
            error_log('[Brevo] Order email failed for ' . ($order['id'] ?? 'unknown') . ': ' . $e->getMessage());
        }
    }

    /** @param array<string, mixed> $order */
    private static function enrichOrder(array $order): array
    {
        if (empty($order['statusHistory']) || !is_array($order['statusHistory'])) {
            $order['statusHistory'] = self::deriveStatusHistory($order);
        }
        if (!isset($order['paymentStatus']) && ($order['payment'] ?? '') === 'cod') {
            $order['paymentStatus'] = 'cod';
        }
        return $order;
    }

    /** @param array<string, mixed> $order */
    private static function deriveStatusHistory(array $order): array
    {
        $history = [
            ['status' => 'placed', 'at' => $order['createdAt'] ?? gmdate('c'), 'by' => 'system', 'note' => 'Order placed'],
        ];
        $current = (string) ($order['status'] ?? 'placed');
        if ($current !== 'placed') {
            $history[] = [
                'status' => $current,
                'at'     => $order['updatedAt'] ?? $order['paidAt'] ?? $order['createdAt'] ?? gmdate('c'),
                'by'     => 'system',
                'note'   => 'Status updated',
            ];
        }
        return $history;
    }

    /**
     * @param array<string, mixed> $order
     * @return array<string, mixed>
     */
    private static function buildStatusChange(array $order, string $status, ?string $note, string $by): array
    {
        $now = gmdate('c');
        $history = is_array($order['statusHistory'] ?? null) ? $order['statusHistory'] : self::deriveStatusHistory($order);

        $last = end($history);
        if (!$last || ($last['status'] ?? '') !== $status) {
            $history[] = [
                'status' => $status,
                'at'     => $now,
                'by'     => $by,
                'note'   => $note ?? '',
            ];
        }

        $changes = [
            'status'        => $status,
            'statusHistory' => $history,
            'updatedAt'     => $now,
        ];

        if ($status === 'cancelled') {
            $changes['cancelledAt'] = $now;
        }

        return $changes;
    }

    /** @param array<string, mixed> $order */
    private static function appendAdminNote(array $order, string $note): string
    {
        $existing = trim((string) ($order['adminNotes'] ?? ''));
        $stamp = gmdate('Y-m-d H:i') . ' — ' . $note;
        return $existing === '' ? $stamp : $existing . "\n" . $stamp;
    }

    /**
     * @param array<int, mixed> $rawItems
     * @return array{items: array<int, array<string, mixed>>, subtotal: float}
     */
    /** @param array<int, array<string, mixed>> $items */
    private static function validatePaymentMethod(string $payment, array $items): void
    {
        $settings = (new SettingsRepository())->get();
        $payments = $settings['payments'] ?? [];
        $codGlobal = ($payments['codEnabled'] ?? true) !== false;
        $onlineGlobal = ($payments['onlinePaymentEnabled'] ?? true) !== false;
        $repo = self::products();

        if ($payment === 'cod') {
            if (!$codGlobal) {
                throw new \InvalidArgumentException('Cash on Delivery is not available at the moment');
            }
            foreach ($items as $line) {
                $product = $repo->getPublicById((string) ($line['productId'] ?? ''));
                if ($product && ($product['codEnabled'] ?? true) === false) {
                    throw new \InvalidArgumentException(
                        'Cash on Delivery is not available for one or more items in your bag'
                    );
                }
            }
            return;
        }

        if (!$onlineGlobal) {
            throw new \InvalidArgumentException('Online payment is not available at the moment');
        }
        if (!RazorpayService::isConfigured()) {
            Response::error('Online payment is temporarily unavailable. Please use Cash on Delivery.', 503);
        }
        foreach ($items as $line) {
            $product = $repo->getPublicById((string) ($line['productId'] ?? ''));
            if ($product && ($product['onlinePaymentEnabled'] ?? true) === false) {
                throw new \InvalidArgumentException(
                    'Online payment is not available for one or more items in your bag'
                );
            }
        }
    }

    private static function validateAndBuildItems(array $rawItems): array
    {
        if (count($rawItems) === 0) {
            throw new \InvalidArgumentException('Cart is empty');
        }

        $built = [];
        $subtotal = 0.0;
        $productRepo = self::products();

        foreach ($rawItems as $line) {
            if (!is_array($line)) {
                throw new \InvalidArgumentException('Invalid cart item');
            }

            $productId = (string) ($line['productId'] ?? '');
            $variantId = trim((string) ($line['variantId'] ?? ''));
            $bundleId  = trim((string) ($line['bundleId'] ?? ''));
            $qty       = (int) ($line['quantity'] ?? 0);

            if ($productId === '' || $qty < 1) {
                throw new \InvalidArgumentException('Each item needs a productId and quantity ≥ 1');
            }

            $product = $productRepo->getPublicById($productId);
            if (!$product && str_starts_with($productId, 'rims-')) {
                $product = $productRepo->getPublicById('krivea-' . substr($productId, 5));
                if ($product) {
                    $productId = $product['id'];
                }
            }

            if (!$product) {
                throw new \InvalidArgumentException("Product unavailable: {$productId}");
            }

            $title = (string) ($product['title'] ?? '');

            // A bundle line ("Complete Wellness Kit") is priced and stocked
            // entirely server-side from the bundle's own products/discount —
            // never trust the client's price, and skip normal variant
            // selection (a bundle always buys each product's default
            // variant; see BundleRepository::priceForProduct).
            if ($bundleId !== '') {
                $bundleLine = self::bundles()->priceForProduct($bundleId, $productId);
                if (!$bundleLine) {
                    throw new \InvalidArgumentException("That bundle is no longer available for \"{$title}\"");
                }
                if ($qty !== $bundleLine['quantity']) {
                    throw new \InvalidArgumentException("Please add the full bundle for \"{$bundleLine['bundleTitle']}\"");
                }
                $displayTitle = "{$title} — {$bundleLine['bundleTitle']}";
                if ($bundleLine['stock'] < $qty) {
                    throw new \InvalidArgumentException(
                        $bundleLine['stock'] <= 0
                            ? "\"{$title}\" is out of stock"
                            : "Only {$bundleLine['stock']} left for \"{$title}\". Please update your bag"
                    );
                }
                $built[] = [
                    'productId'    => $productId,
                    'variantId'    => $bundleLine['variantId'],
                    'variantLabel' => null,
                    'bundleId'     => $bundleId,
                    'bundleTitle'  => $bundleLine['bundleTitle'],
                    'title'        => $displayTitle,
                    'price'        => $bundleLine['unitPrice'],
                    'quantity'     => $qty,
                    'image'        => is_array($product['images'] ?? null) && isset($product['images'][0])
                        ? $product['images'][0]
                        : ($line['image'] ?? ''),
                ];
                $subtotal += $bundleLine['unitPrice'] * $qty;
                continue;
            }

            // Pack-size/duration variant (e.g. "3 Month Supply") — its own
            // price and stock take over from the base product's when present.
            if (!empty($product['hasVariants']) && $variantId === '') {
                throw new \InvalidArgumentException("Please choose an option (pack size) for \"{$product['title']}\"");
            }
            $variant = $variantId !== '' ? $productRepo->getVariant($productId, $variantId) : null;
            if ($variantId !== '' && !$variant) {
                throw new \InvalidArgumentException("Selected option is no longer available for \"{$product['title']}\"");
            }

            $stock = $variant ? $variant['stock'] : (int) ($product['stock'] ?? 0);
            $displayTitle = $variant ? "{$title} — {$variant['label']}" : $title;

            if ($stock < $qty) {
                if ($stock <= 0) {
                    throw new \InvalidArgumentException("\"{$displayTitle}\" is out of stock");
                }
                throw new \InvalidArgumentException(
                    "Only {$stock} left for \"{$displayTitle}\". Please update your bag"
                );
            }

            $price = $variant ? $variant['price'] : (float) ($product['price'] ?? 0);
            $built[] = [
                'productId'    => $productId,
                'variantId'    => $variant['id'] ?? null,
                'variantLabel' => $variant['label'] ?? null,
                'title'        => $displayTitle,
                'price'        => $price,
                'quantity'     => $qty,
                'image'        => is_array($product['images'] ?? null) && isset($product['images'][0])
                    ? $product['images'][0]
                    : ($line['image'] ?? ''),
            ];
            $subtotal += $price * $qty;
        }

        return [
            'items'    => $built,
            'subtotal' => round($subtotal, 2),
        ];
    }

    /**
     * Build line items for admin direct orders — custom pricing allowed.
     *
     * @param array<int, mixed> $rawItems
     * @return array{items: array<int, array<string, mixed>>, subtotal: float}
     */
    private static function buildDirectOrderItems(array $rawItems): array
    {
        if (count($rawItems) === 0) {
            throw new \InvalidArgumentException('At least one item is required');
        }

        $built = [];
        $subtotal = 0.0;
        $productRepo = self::products();

        foreach ($rawItems as $line) {
            if (!is_array($line)) {
                throw new \InvalidArgumentException('Invalid line item');
            }

            $title = trim((string) ($line['title'] ?? ''));
            $qty = (int) ($line['quantity'] ?? 0);
            $price = (float) ($line['price'] ?? 0);
            $productId = trim((string) ($line['productId'] ?? ''));

            if ($title === '' || $qty < 1) {
                throw new \InvalidArgumentException('Each item needs a title and quantity ≥ 1');
            }

            if ($price < 0) {
                throw new \InvalidArgumentException('Item price cannot be negative');
            }

            $image = trim((string) ($line['image'] ?? ''));
            $isCustom = $productId === '' || str_starts_with($productId, 'custom-');

            if (!$isCustom && $productId !== '') {
                $product = $productRepo->getById($productId);
                if (!$product && str_starts_with($productId, 'rims-')) {
                    $product = $productRepo->getById('krivea-' . substr($productId, 5));
                    if ($product) {
                        $productId = $product['id'];
                    }
                }
                if ($image === '' && $product && is_array($product['images'] ?? null) && isset($product['images'][0])) {
                    $image = (string) $product['images'][0];
                }
            } else {
                $productId = $productId !== '' ? $productId : 'custom-' . bin2hex(random_bytes(4));
                $isCustom = true;
            }

            $variantId = trim((string) ($line['variantId'] ?? ''));
            $variantLabel = null;
            if ($variantId !== '' && !$isCustom) {
                $variant = $productRepo->getVariant($productId, $variantId);
                $variantLabel = $variant['label'] ?? null;
            }

            $built[] = [
                'productId'    => $productId,
                'variantId'    => $variantId !== '' ? $variantId : null,
                'variantLabel' => $variantLabel,
                'title'        => $title,
                'price'        => round($price, 2),
                'quantity'     => $qty,
                'image'        => $image,
                'isCustom'     => $isCustom,
            ];
            $subtotal += $price * $qty;
        }

        return [
            'items'    => $built,
            'subtotal' => round($subtotal, 2),
        ];
    }

    /**
     * Adjust stock for one order line — routes to the variant's own stock
     * (product_variants.stock) when the line has a variantId, otherwise the
     * product's base stock, exactly mirroring how validateAndBuildItems()
     * decided which stock to check against.
     */
    private static function adjustItemStock(array $item, int $delta): bool
    {
        $repo = self::products();
        $variantId = (string) ($item['variantId'] ?? '');
        if ($variantId !== '') {
            return $repo->adjustVariantStock($variantId, $delta);
        }
        return $repo->adjustStock((string) ($item['productId'] ?? ''), $delta);
    }

    /** @param array<int, array<string, mixed>> $items */
    private static function decrementStockForDirectItems(array $items): void
    {
        $done = [];
        foreach ($items as $item) {
            if (!empty($item['isCustom']) || str_starts_with((string) ($item['productId'] ?? ''), 'custom-')) {
                continue;
            }
            $productId = (string) ($item['productId'] ?? '');
            if ($productId === '') {
                continue;
            }
            $ok = self::adjustItemStock($item, -(int) $item['quantity']);
            if (!$ok) {
                self::restoreStockItems($done);
                throw new \InvalidArgumentException(
                    'Stock unavailable for "' . ($item['title'] ?? $productId) . '". Disable stock adjustment or reduce quantity.'
                );
            }
            $done[] = $item;
        }
    }

    /** @param array<int, array<string, mixed>> $items */
    private static function decrementStock(array $items): void
    {
        $done = [];
        foreach ($items as $item) {
            $ok = self::adjustItemStock($item, -(int) $item['quantity']);
            if (!$ok) {
                self::restoreStockItems($done);
                throw new \InvalidArgumentException(
                    'Stock changed while placing order. Please refresh and try again.'
                );
            }
            $done[] = $item;
        }
    }

    /** @param array<int, array<string, mixed>> $items */
    private static function restoreStockItems(array $items): void
    {
        foreach ($items as $item) {
            self::adjustItemStock($item, (int) $item['quantity']);
        }
    }

    /** @param array<string, mixed> $order */
    private static function releaseCouponForOrder(array $order): void
    {
        $couponId = trim((string) ($order['couponId'] ?? ''));
        if ($couponId === '') {
            return;
        }
        self::couponService()->releaseUsage($couponId);
    }

    /** @param array<string, mixed> $order */
    private static function restoreStockForOrder(array $order): void
    {
        $items = $order['items'] ?? [];
        if (!is_array($items)) {
            return;
        }
        self::restoreStockItems($items);
    }

    private static function normalizePhone10(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';
        if (strlen($digits) < 10) {
            return '';
        }
        return substr($digits, -10);
    }

    private static function requireVerifiedEmail(string $userId): void
    {
        if ($userId === '') {
            Response::error('User not found', 401);
        }

        $user = (new UserRepository())->getById($userId);

        if (!$user) {
            Response::error('User not found', 404);
        }

        if (!AuthRoutes::isEmailVerifiedForUser($user)) {
            Response::error('Please verify your email address before placing an order.', 403);
        }
    }

    private static function requireVerifiedPhone(string $userId, string $orderPhone): void
    {
        if (!ServicesConfig::isOtpEnabled() || OtpConfig::shouldSkipVerify()) {
            return;
        }

        if ($userId === '') {
            Response::error('User not found', 401);
        }

        $user = (new UserRepository())->getById($userId);

        if (!$user) {
            Response::error('User not found', 404);
        }

        if (empty($user['phoneVerified'])) {
            Response::error('Please verify your mobile number before placing an order.', 403);
        }

        $accountPhone = self::normalizePhone10((string) ($user['phone'] ?? ''));
        $shippingPhone = self::normalizePhone10($orderPhone);

        if ($accountPhone === '' || $shippingPhone === '') {
            Response::error('A valid verified mobile number is required', 400);
        }

        if ($accountPhone !== $shippingPhone) {
            Response::error('Order mobile must match your verified account number.', 400);
        }
    }
}
