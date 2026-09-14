<?php

declare(strict_types=1);

namespace Wellness\Repository;

final class CouponRepository extends MysqlRepository
{
    protected function tableName(): string { return 'coupons'; }

    protected function rowToArray(array $row): array
    {
        return [
            'id'               => $row['id'],
            'code'             => $row['code'],
            'title'            => $row['title'],
            'description'      => $row['description'],
            'type'             => $row['type'],
            'value'            => (float) $row['value'],
            'minOrderAmount'   => (float) $row['min_order_amount'],
            'maxDiscount'      => (float) $row['max_discount'],
            'maxUses'          => (int) $row['max_uses'],
            'maxUsesPerUser'   => (int) $row['max_uses_per_user'],
            'usageCount'       => (int) $row['usage_count'],
            'isEnabled'        => $this->bool($row['is_enabled']),
            'showOnWebsite'    => $this->bool($row['show_on_website']),
            'autoApply'        => $this->bool($row['auto_apply']),
            'audience'         => $row['audience'] ?? 'everyone',
            'minPreviousOrders' => (int) ($row['min_previous_orders'] ?? 1),
            'startsAt'         => $this->toIso($row['starts_at']),
            'expiresAt'        => $this->toIso($row['expires_at']),
            'createdAt'        => $this->toIso($row['created_at']),
            'updatedAt'        => $this->toIso($row['updated_at']),
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $map = [
            'code'           => ['col' => 'code',              'type' => 'string'],
            'title'          => ['col' => 'title',             'type' => 'string'],
            'description'    => ['col' => 'description',       'type' => 'string'],
            'type'           => ['col' => 'type',              'type' => 'string'],
            'value'          => ['col' => 'value',             'type' => 'float'],
            'minOrderAmount' => ['col' => 'min_order_amount',  'type' => 'float'],
            'maxDiscount'    => ['col' => 'max_discount',      'type' => 'float'],
            'maxUses'        => ['col' => 'max_uses',          'type' => 'int'],
            'maxUsesPerUser' => ['col' => 'max_uses_per_user', 'type' => 'int'],
            'usageCount'     => ['col' => 'usage_count',       'type' => 'int'],
            'isEnabled'      => ['col' => 'is_enabled',        'type' => 'bool'],
            'showOnWebsite'  => ['col' => 'show_on_website',   'type' => 'bool'],
            'autoApply'      => ['col' => 'auto_apply',        'type' => 'bool'],
            'audience'         => ['col' => 'audience',            'type' => 'string'],
            'minPreviousOrders' => ['col' => 'min_previous_orders', 'type' => 'int'],
            'startsAt'       => ['col' => 'starts_at',         'type' => 'datetime'],
            'expiresAt'      => ['col' => 'expires_at',        'type' => 'datetime'],
            'createdAt'      => ['col' => 'created_at',        'type' => 'datetime'],
            'updatedAt'      => ['col' => 'updated_at',        'type' => 'datetime'],
        ];
        $row = [];
        foreach ($map as $php => $meta) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            $row[$meta['col']] = match($meta['type']) {
                'bool'     => $v ? 1 : 0,
                'int'      => (int) $v,
                'float'    => (float) $v,
                'datetime' => $this->toDbDatetime($v),
                default    => $v,
            };
        }
        return $row;
    }

    public function findByCode(string $code): ?array
    {
        $normalized = strtoupper(trim($code));
        if ($normalized === '') {
            return null;
        }
        $stmt = $this->pdo()->prepare('SELECT * FROM coupons WHERE UPPER(code) = ? LIMIT 1');
        $stmt->execute([$normalized]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }

    public function codeExists(string $code, ?string $excludeId = null): bool
    {
        $normalized = strtoupper(trim($code));
        $sql        = 'SELECT COUNT(*) FROM coupons WHERE UPPER(code) = ?';
        $params     = [$normalized];
        if ($excludeId !== null) {
            $sql     .= ' AND id != ?';
            $params[] = $excludeId;
        }
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn() > 0;
    }

    public function getEnabled(): array
    {
        $stmt = $this->pdo()->query('SELECT * FROM coupons WHERE is_enabled = 1');
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    public function getPublic(): array
    {
        $stmt = $this->pdo()->query(
            'SELECT * FROM coupons WHERE is_enabled = 1 AND show_on_website = 1 AND auto_apply = 0'
        );
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    public function getAutoApply(): array
    {
        $stmt = $this->pdo()->query(
            'SELECT * FROM coupons WHERE is_enabled = 1 AND auto_apply = 1'
        );
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    /**
     * Atomically increments usage only if the coupon hasn't hit max_uses yet —
     * closes the check-then-act race where two concurrent checkouts could both
     * pass an eligibility check that read a stale usage_count. Returns false
     * if the coupon is unlimited-but-missing, disabled, or already at its cap.
     */
    public function incrementUsage(string $id): bool
    {
        $stmt = $this->pdo()->prepare(
            'UPDATE coupons
             SET usage_count = usage_count + 1, updated_at = ?
             WHERE id = ? AND (max_uses = 0 OR usage_count < max_uses)'
        );
        $stmt->execute([gmdate('Y-m-d H:i:s'), $id]);
        return $stmt->rowCount() > 0;
    }

    public function decrementUsage(string $id): void
    {
        $this->pdo()->prepare(
            'UPDATE coupons SET usage_count = GREATEST(0, usage_count - 1), updated_at = ? WHERE id = ?'
        )->execute([gmdate('Y-m-d H:i:s'), $id]);
    }
}
