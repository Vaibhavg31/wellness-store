<?php

declare(strict_types=1);

namespace Krivea\Repository;

use Krivea\Database;

/**
 * Orders — backed by `orders` + child tables:
 * order_shipping (1-1), order_items (1-n), order_status_history (1-n).
 */
final class OrderRepository extends MysqlRepository
{
    protected function tableName(): string { return 'orders'; }

    protected function rowToArray(array $row): array
    {
        $id = $row['id'];
        return array_merge($this->scalarFields($row), [
            'shipping'      => $this->fetchShipping($id),
            'items'         => $this->fetchItems($id),
            'statusHistory' => $this->fetchStatusHistory($id),
        ]);
    }

    private function scalarFields(array $row): array
    {
        return [
            'id'                => $row['id'],
            'orderSource'       => $row['order_source'],
            'userId'            => $row['user_id'],
            'email'             => $row['email'],
            'subtotal'          => (float) $row['subtotal'],
            'discountAmount'    => (float) $row['discount_amount'],
            'deliveryFee'       => (float) $row['delivery_fee'],
            'deliverySaved'     => $this->floatOrNull($row['delivery_saved']),
            'total'             => (float) $row['total'],
            'status'            => $row['status'],
            'payment'           => $row['payment'],
            'paymentStatus'     => $row['payment_status'],
            'couponCode'        => $row['coupon_code'],
            'couponId'          => $row['coupon_id'],
            'couponType'        => $row['coupon_type'],
            'razorpayOrderId'   => $row['razorpay_order_id'],
            'razorpayPaymentId' => $row['razorpay_payment_id'],
            'razorpaySignature' => $row['razorpay_signature'],
            'razorpayAmount'    => $this->intOrNull($row['razorpay_amount']),
            'trackingNumber'    => $row['tracking_number'],
            'carrier'           => $row['carrier'],
            'estimatedDelivery' => $row['estimated_delivery'],
            'adminNotes'        => $row['admin_notes'],
            'refundStatus'      => $row['refund_status'],
            'refundedAt'        => $this->toIso($row['refunded_at']),
            'paidAt'            => $this->toIso($row['paid_at']),
            'cancelledAt'       => $this->toIso($row['cancelled_at']),
            'createdBy'         => $row['created_by'],
            'createdAt'         => $this->toIso($row['created_at']),
            'updatedAt'         => $this->toIso($row['updated_at']),
        ];
    }

    /**
     * Map a whole result set with 3 total queries instead of 1 + 3×N — orders
     * were fetching shipping/items/status-history with 3 separate per-order
     * queries each, so admin order lists and customer order history got
     * linearly slower as order volume grew.
     */
    private function mapRowsBatched(array $rows): array
    {
        if (!$rows) {
            return [];
        }

        $ids = array_column($rows, 'id');
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $pdo = $this->pdo();

        $shippingById = [];
        $stmt = $pdo->prepare("SELECT * FROM order_shipping WHERE order_id IN ({$placeholders})");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $r) {
            $shippingById[$r['order_id']] = [
                'name' => $r['name'], 'phone' => $r['phone'], 'address' => $r['address'],
                'landmark' => $r['landmark'], 'city' => $r['city'], 'state' => $r['state'], 'pincode' => $r['pincode'],
            ];
        }

        $itemsById = [];
        $stmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ({$placeholders}) ORDER BY order_id, id ASC");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $r) {
            $itemsById[$r['order_id']][] = [
                'productId' => $r['product_id'], 'variantId' => $r['variant_id'] ?? null, 'variantLabel' => $r['variant_label'] ?? null,
                'bundleId' => $r['bundle_id'] ?? null, 'bundleTitle' => $r['bundle_title'] ?? null,
                'title' => $r['title'], 'price' => (float) $r['price'],
                'quantity' => (int) $r['quantity'], 'image' => $r['image'], 'isCustom' => $this->bool($r['is_custom']),
            ];
        }

        $historyById = [];
        $stmt = $pdo->prepare("SELECT * FROM order_status_history WHERE order_id IN ({$placeholders}) ORDER BY order_id, changed_at ASC");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $r) {
            $historyById[$r['order_id']][] = [
                'status' => $r['status'], 'at' => $this->toIso($r['changed_at']),
                'by' => $r['changed_by'], 'note' => $r['note'],
            ];
        }

        return array_map(function (array $row) use ($shippingById, $itemsById, $historyById) {
            $id = $row['id'];
            return array_merge($this->scalarFields($row), [
                'shipping'      => $shippingById[$id] ?? [],
                'items'         => $itemsById[$id]    ?? [],
                'statusHistory' => $historyById[$id]  ?? [],
            ]);
        }, $rows);
    }

    protected function arrayToRow(array $data): array
    {
        $map = [
            'orderSource'       => ['col' => 'order_source',        'type' => 'string'],
            'userId'            => ['col' => 'user_id',             'type' => 'nullableString'],
            'email'             => ['col' => 'email',               'type' => 'string'],
            'subtotal'          => ['col' => 'subtotal',            'type' => 'float'],
            'discountAmount'    => ['col' => 'discount_amount',     'type' => 'float'],
            'deliveryFee'       => ['col' => 'delivery_fee',        'type' => 'float'],
            'deliverySaved'     => ['col' => 'delivery_saved',      'type' => 'float'],
            'total'             => ['col' => 'total',               'type' => 'float'],
            'status'            => ['col' => 'status',              'type' => 'string'],
            'payment'           => ['col' => 'payment',             'type' => 'string'],
            'paymentStatus'     => ['col' => 'payment_status',      'type' => 'string'],
            'couponCode'        => ['col' => 'coupon_code',         'type' => 'string'],
            'couponId'          => ['col' => 'coupon_id',           'type' => 'string'],
            'couponType'        => ['col' => 'coupon_type',         'type' => 'string'],
            'razorpayOrderId'   => ['col' => 'razorpay_order_id',  'type' => 'string'],
            'razorpayPaymentId' => ['col' => 'razorpay_payment_id','type' => 'string'],
            'razorpaySignature' => ['col' => 'razorpay_signature',  'type' => 'string'],
            'razorpayAmount'    => ['col' => 'razorpay_amount',     'type' => 'int'],
            'trackingNumber'    => ['col' => 'tracking_number',     'type' => 'string'],
            'carrier'           => ['col' => 'carrier',             'type' => 'string'],
            'estimatedDelivery' => ['col' => 'estimated_delivery',  'type' => 'string'],
            'adminNotes'        => ['col' => 'admin_notes',         'type' => 'string'],
            'refundStatus'      => ['col' => 'refund_status',       'type' => 'string'],
            'refundedAt'        => ['col' => 'refunded_at',         'type' => 'datetime'],
            'paidAt'            => ['col' => 'paid_at',             'type' => 'datetime'],
            'cancelledAt'       => ['col' => 'cancelled_at',        'type' => 'datetime'],
            'createdBy'         => ['col' => 'created_by',          'type' => 'string'],
            'createdAt'         => ['col' => 'created_at',          'type' => 'datetime'],
            'updatedAt'         => ['col' => 'updated_at',          'type' => 'datetime'],
        ];

        $row = [];
        foreach ($map as $php => $meta) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            $row[$meta['col']] = match($meta['type']) {
                'int'            => $v === null ? null : (int) $v,
                'float'          => $v === null ? null : (float) $v,
                'datetime'       => $v === null ? null : $this->toDbDatetime((string) $v),
                'nullableString' => ($v === null || $v === '') ? null : $v,
                default          => $v,
            };
        }
        return $row;
    }

    // -------------------------------------------------------------------------
    // Child table fetchers
    // -------------------------------------------------------------------------

    private function fetchShipping(string $orderId): array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM order_shipping WHERE order_id = ? LIMIT 1');
        $stmt->execute([$orderId]);
        $row = $stmt->fetch();
        if (!$row) {
            return [];
        }
        return [
            'name'     => $row['name'],
            'phone'    => $row['phone'],
            'address'  => $row['address'],
            'landmark' => $row['landmark'],
            'city'     => $row['city'],
            'state'    => $row['state'],
            'pincode'  => $row['pincode'],
        ];
    }

    private function fetchItems(string $orderId): array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');
        $stmt->execute([$orderId]);
        return array_map(fn($r) => [
            'productId'    => $r['product_id'],
            'variantId'    => $r['variant_id']    ?? null,
            'variantLabel' => $r['variant_label'] ?? null,
            'bundleId'     => $r['bundle_id']    ?? null,
            'bundleTitle'  => $r['bundle_title'] ?? null,
            'title'        => $r['title'],
            'price'        => (float) $r['price'],
            'quantity'     => (int) $r['quantity'],
            'image'        => $r['image'],
            'isCustom'     => $this->bool($r['is_custom']),
        ], $stmt->fetchAll());
    }

    private function fetchStatusHistory(string $orderId): array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC'
        );
        $stmt->execute([$orderId]);
        return array_map(fn($r) => [
            'status' => $r['status'],
            'at'     => $this->toIso($r['changed_at']),
            'by'     => $r['changed_by'],
            'note'   => $r['note'],
        ], $stmt->fetchAll());
    }

    // -------------------------------------------------------------------------
    // Child table writers
    // -------------------------------------------------------------------------

    private function upsertShipping(string $orderId, array $shipping): void
    {
        if (empty($shipping)) {
            return;
        }
        $this->pdo()->prepare('DELETE FROM order_shipping WHERE order_id = ?')->execute([$orderId]);
        $this->pdo()->prepare(
            'INSERT INTO order_shipping (order_id, name, phone, address, landmark, city, state, pincode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $orderId,
            $shipping['name']     ?? '',
            $shipping['phone']    ?? '',
            $shipping['address']  ?? '',
            $shipping['landmark'] ?? null,
            $shipping['city']     ?? '',
            $shipping['state']    ?? null,
            $shipping['pincode']  ?? '',
        ]);
    }

    private function replaceItems(string $orderId, array $items): void
    {
        $this->pdo()->prepare('DELETE FROM order_items WHERE order_id = ?')->execute([$orderId]);
        if (!$items) {
            return;
        }
        $stmt = $this->pdo()->prepare(
            'INSERT INTO order_items (order_id, product_id, variant_id, variant_label, bundle_id, bundle_title, title, price, quantity, image, is_custom)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($items as $item) {
            $stmt->execute([
                $orderId,
                $item['productId']    ?? null,
                $item['variantId']    ?? null,
                $item['variantLabel'] ?? null,
                $item['bundleId']     ?? null,
                $item['bundleTitle']  ?? null,
                $item['title']        ?? '',
                (float) ($item['price']    ?? 0),
                (int)   ($item['quantity'] ?? 1),
                $item['image']     ?? null,
                ($item['isCustom'] ?? false) ? 1 : 0,
            ]);
        }
    }

    public function appendStatusHistory(string $orderId, string $status, string $changedBy = 'system', ?string $note = null): void
    {
        $this->pdo()->prepare(
            'INSERT INTO order_status_history (order_id, status, changed_at, changed_by, note)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $orderId,
            $status,
            gmdate('Y-m-d H:i:s.u'),
            $changedBy,
            $note,
        ]);
    }

    /**
     * Persist the full status-history array for an order, replacing whatever
     * rows already exist. The caller (OrderRoutes::buildStatusChange) always
     * hands us the cumulative history — existing entries plus the new one —
     * so this must overwrite rather than append, or every update would
     * re-insert every prior entry as a duplicate row.
     *
     * @param array<int, array<string, mixed>> $history
     */
    private function replaceStatusHistory(string $orderId, array $history): void
    {
        $this->pdo()->prepare('DELETE FROM order_status_history WHERE order_id = ?')->execute([$orderId]);
        if (!$history) {
            return;
        }
        $stmt = $this->pdo()->prepare(
            'INSERT INTO order_status_history (order_id, status, changed_at, changed_by, note)
             VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($history as $h) {
            $at = $h['at'] ?? $h['changedAt'] ?? null;
            $stmt->execute([
                $orderId,
                (string) ($h['status'] ?? ''),
                $at ? ($this->toDbDatetime((string) $at) ?? gmdate('Y-m-d H:i:s.u')) : gmdate('Y-m-d H:i:s.u'),
                (string) ($h['by'] ?? $h['changedBy'] ?? 'system'),
                $h['note'] ?? null,
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Override create / update to handle child tables
    // -------------------------------------------------------------------------

    public function create(array $data): array
    {
        $row       = $this->arrayToRow($data);
        $row['id'] = $data['id'];

        $cols   = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($row)));
        $places = implode(', ', array_fill(0, count($row), '?'));
        $id     = $data['id'];
        $pdo    = $this->pdo();

        // The order row plus its shipping/items/status-history children are one
        // logical unit — without a transaction, a failure partway through (e.g.
        // the order_items insert) leaves an order row with no line items.
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO orders ({$cols}) VALUES ({$places})")->execute(array_values($row));

            if (!empty($data['shipping'])) {
                $this->upsertShipping($id, $data['shipping']);
            }
            if (array_key_exists('items', $data)) {
                $this->replaceItems($id, $data['items'] ?? []);
            }
            if (!empty($data['statusHistory'])) {
                $this->replaceStatusHistory($id, $data['statusHistory']);
            } elseif (!empty($data['status'])) {
                $this->appendStatusHistory($id, $data['status'], $data['createdBy'] ?? 'system');
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return $this->getById($id) ?? $data;
    }

    public function update(string $id, array $changes): ?array
    {
        $pdo = $this->pdo();
        $pdo->beginTransaction();
        try {
            $row = $this->arrayToRow($changes);
            if (!empty($row)) {
                $sets = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($row)));
                $pdo->prepare("UPDATE orders SET {$sets} WHERE id = ?")->execute([...array_values($row), $id]);
            }

            if (array_key_exists('shipping', $changes)) {
                $this->upsertShipping($id, $changes['shipping']);
            }
            if (array_key_exists('items', $changes)) {
                $this->replaceItems($id, $changes['items'] ?? []);
            }
            if (!empty($changes['statusHistory'])) {
                $this->replaceStatusHistory($id, $changes['statusHistory']);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return $this->getById($id);
    }

    // -------------------------------------------------------------------------
    // Domain methods
    // -------------------------------------------------------------------------

    public function findByRazorpayOrderId(string $razorpayOrderId): ?array
    {
        if ($razorpayOrderId === '') {
            return null;
        }
        $stmt = $this->pdo()->prepare('SELECT * FROM orders WHERE razorpay_order_id = ? LIMIT 1');
        $stmt->execute([$razorpayOrderId]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }

    public function getByUserId(string $userId): array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$userId]);
        return $this->mapRowsBatched($stmt->fetchAll());
    }

    /**
     * Gate for "only people who bought this can review it" — true once this
     * user has any non-cancelled order containing this product, whether it
     * has shipped yet or not (requiring "delivered" would lock reviewing out
     * for weeks on a slow shipment; a cancelled order was never fulfilled at
     * all, so that one's excluded).
     */
    public function hasUserPurchasedProduct(string $userId, string $productId): bool
    {
        $stmt = $this->pdo()->prepare(
            'SELECT 1 FROM order_items oi
             INNER JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = ? AND oi.product_id = ? AND o.status != ?
             LIMIT 1'
        );
        $stmt->execute([$userId, $productId, 'cancelled']);
        return (bool) $stmt->fetchColumn();
    }

    public function getForUser(string $userId, string $email): array
    {
        $pdo   = $this->pdo();
        $email = strtolower(trim($email));

        $stmt = $pdo->prepare(
            'SELECT * FROM orders WHERE user_id = ? OR LOWER(email) = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$userId ?: null, $email]);
        $rows = $stmt->fetchAll();

        $seen = [];
        $unique = [];
        foreach ($rows as $row) {
            if (!isset($seen[$row['id']])) {
                $seen[$row['id']] = true;
                $unique[] = $row;
            }
        }
        return $this->mapRowsBatched($unique);
    }

    public function computeStatsForUser(string $userId, string $email): array
    {
        $stats = [
            'orderCount'     => 0,
            'totalSpent'     => 0.0,
            'deliveredCount' => 0,
            'lastOrderAt'    => '',
        ];

        foreach ($this->getForUser($userId, $email) as $order) {
            $stats['orderCount']++;
            $status = (string) ($order['status'] ?? '');
            if (!in_array($status, ['cancelled', 'returned'], true)) {
                $stats['totalSpent'] += (float) ($order['total'] ?? 0);
            }
            if ($status === 'delivered') {
                $stats['deliveredCount']++;
            }
            $createdAt = (string) ($order['createdAt'] ?? '');
            if ($createdAt > $stats['lastOrderAt']) {
                $stats['lastOrderAt'] = $createdAt;
            }
        }

        return $stats;
    }

    public function listAdminFiltered(array $filters = []): array
    {
        $sql    = 'SELECT o.* FROM orders o';
        $joins  = '';
        $where  = [];
        $params = [];

        if (!empty($filters['search'])) {
            $joins .= ' LEFT JOIN order_shipping os ON os.order_id = o.id';
        }

        $sql .= $joins . ' WHERE 1=1';

        if (!empty($filters['source'])) {
            $source = (string) $filters['source'];
            if ($source === 'direct' || $source === 'website') {
                $sql     .= ' AND o.order_source = ?';
                $params[] = $source;
            }
        }

        if (!empty($filters['status'])) {
            $statuses    = array_map('trim', explode(',', (string) $filters['status']));
            $placeholders = implode(', ', array_fill(0, count($statuses), '?'));
            $sql         .= " AND o.status IN ({$placeholders})";
            $params       = array_merge($params, $statuses);
        }

        if (!empty($filters['payment'])) {
            $sql     .= ' AND o.payment = ?';
            $params[] = (string) $filters['payment'];
        }

        if (!empty($filters['search'])) {
            $q        = '%' . strtolower(trim((string) $filters['search'])) . '%';
            $sql     .= ' AND (LOWER(o.id) LIKE ? OR LOWER(o.email) LIKE ?
                           OR LOWER(IFNULL(os.name,"")) LIKE ?
                           OR LOWER(IFNULL(os.phone,"")) LIKE ?
                           OR LOWER(IFNULL(os.city,"")) LIKE ?
                           OR LOWER(IFNULL(o.tracking_number,"")) LIKE ?)';
            $params   = array_merge($params, [$q, $q, $q, $q, $q, $q]);
        }

        if (!empty($filters['from'])) {
            $from     = gmdate('Y-m-d H:i:s', strtotime((string) $filters['from']) ?: 0);
            $sql     .= ' AND o.created_at >= ?';
            $params[] = $from;
        }

        if (!empty($filters['to'])) {
            $to       = gmdate('Y-m-d H:i:s', strtotime((string) $filters['to'] . ' 23:59:59') ?: PHP_INT_MAX);
            $sql     .= ' AND o.created_at <= ?';
            $params[] = $to;
        }

        $sortMap = [
            'createdAt' => 'o.created_at',
            'total'     => 'o.total',
            'status'    => 'o.status',
            'email'     => 'o.email',
        ];
        $sortCol = $sortMap[(string) ($filters['sort'] ?? 'createdAt')] ?? 'o.created_at';
        $dir     = strtolower((string) ($filters['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sql    .= " ORDER BY {$sortCol} {$dir}";

        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($params);
        return $this->mapRowsBatched($stmt->fetchAll());
    }

    /**
     * A coupon usage "counts" once its order is placed and, for Razorpay orders,
     * once payment is confirmed — mirrors the eligibility logic in CouponService.
     */
    private const USAGE_FILTER = "status != 'cancelled' AND (payment != 'razorpay' OR payment_status = 'paid')";

    public function countUsagesOfCoupon(string $couponCode): int
    {
        $stmt = $this->pdo()->prepare(
            'SELECT COUNT(*) FROM orders WHERE coupon_code = ? AND ' . self::USAGE_FILTER
        );
        $stmt->execute([$couponCode]);
        return (int) $stmt->fetchColumn();
    }

    /** Pass an empty $email to match by user_id only (avoids false-positive matches on blank-email orders). */
    public function countUsagesOfCouponByUser(string $couponCode, string $userId, string $email): int
    {
        $email = strtolower(trim($email));
        $sql = 'SELECT COUNT(*) FROM orders WHERE coupon_code = ? AND ' . self::USAGE_FILTER;
        $params = [$couponCode];

        if ($userId !== '' && $email !== '') {
            $sql .= ' AND (user_id = ? OR LOWER(email) = ?)';
            $params[] = $userId;
            $params[] = $email;
        } elseif ($userId !== '') {
            $sql .= ' AND user_id = ?';
            $params[] = $userId;
        } elseif ($email !== '') {
            $sql .= ' AND LOWER(email) = ?';
            $params[] = $email;
        } else {
            return 0;
        }

        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    /** @return array{totalOrders: int, uniqueCustomers: int, totalRevenue: float, totalDiscountGiven: float, freeDeliveryOrdersMissingSavedAmount: int} */
    public function statsForCoupon(string $couponCode): array
    {
        $stmt = $this->pdo()->prepare(
            "SELECT
                COUNT(*) AS total_orders,
                COUNT(DISTINCT NULLIF(user_id, '')) AS unique_customers,
                COALESCE(SUM(total), 0) AS total_revenue,
                COALESCE(SUM(discount_amount), 0) AS total_discount,
                COALESCE(SUM(CASE WHEN coupon_type = 'free_delivery' AND delivery_saved IS NOT NULL THEN delivery_saved ELSE 0 END), 0) AS free_delivery_saved,
                SUM(CASE WHEN coupon_type = 'free_delivery' AND delivery_saved IS NULL THEN 1 ELSE 0 END) AS free_delivery_missing_saved
             FROM orders WHERE coupon_code = ? AND " . self::USAGE_FILTER
        );
        $stmt->execute([$couponCode]);
        $row = $stmt->fetch() ?: [];

        return [
            'totalOrders'                          => (int) ($row['total_orders'] ?? 0),
            'uniqueCustomers'                       => (int) ($row['unique_customers'] ?? 0),
            'totalRevenue'                          => (float) ($row['total_revenue'] ?? 0),
            'totalDiscountGiven'                    => (float) ($row['total_discount'] ?? 0) + (float) ($row['free_delivery_saved'] ?? 0),
            'freeDeliveryOrdersMissingSavedAmount'  => (int) ($row['free_delivery_missing_saved'] ?? 0),
        ];
    }
}
