<?php

declare(strict_types=1);

namespace Wellness\Repository;

final class ReviewRepository extends MysqlRepository
{
    protected function tableName(): string { return 'reviews'; }

    protected function rowToArray(array $row): array
    {
        return [
            'id'                 => $row['id'],
            'productId'          => $row['product_id'],
            'userId'             => $row['user_id'],
            'name'               => $row['name'],
            'email'              => $row['email'],
            'rating'             => (int) $row['rating'],
            'comment'            => $row['comment'],
            'images'             => $this->decodeImages($row['images'] ?? null),
            'isVerifiedPurchase' => $this->bool($row['is_verified_purchase'] ?? false),
            'avatar'             => $row['avatar'],
            'isApproved'         => $this->bool($row['is_approved']),
            'createdAt'          => $this->toIso($row['created_at']),
        ];
    }

    private function decodeImages(?string $json): array
    {
        if (!$json) {
            return [];
        }
        $decoded = json_decode($json, true);
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
    }

    protected function arrayToRow(array $data): array
    {
        $map = [
            'productId'          => ['col' => 'product_id',           'type' => 'string'],
            'userId'             => ['col' => 'user_id',              'type' => 'string'],
            'name'               => ['col' => 'name',                 'type' => 'string'],
            'email'              => ['col' => 'email',                'type' => 'string'],
            'rating'             => ['col' => 'rating',               'type' => 'int'],
            'comment'            => ['col' => 'comment',              'type' => 'string'],
            'images'             => ['col' => 'images',               'type' => 'json'],
            'isVerifiedPurchase' => ['col' => 'is_verified_purchase', 'type' => 'bool'],
            'avatar'             => ['col' => 'avatar',               'type' => 'string'],
            'isApproved'         => ['col' => 'is_approved',          'type' => 'bool'],
            'createdAt'          => ['col' => 'created_at',           'type' => 'datetime'],
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
                'datetime' => $this->toDbDatetime($v),
                'json'     => is_array($v) && count($v) > 0 ? json_encode(array_values($v)) : null,
                default    => $v,
            };
        }
        return $row;
    }

    public function getApproved(): array
    {
        $stmt = $this->pdo()->query('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC');
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    public function getByProductId(string $productId, bool $approvedOnly = true): array
    {
        $sql    = 'SELECT * FROM reviews WHERE product_id = ?';
        $params = [$productId];
        if ($approvedOnly) {
            $sql .= ' AND is_approved = 1';
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    /** One review per customer per product — mirrors the uq_reviews_user_product
     *  unique key, checked up front so submit() can return a clear message
     *  instead of a raw duplicate-key database error. */
    public function findByUserAndProduct(string $userId, string $productId): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM reviews WHERE user_id = ? AND product_id = ? LIMIT 1');
        $stmt->execute([$userId, $productId]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }

    public function approve(string $id): ?array
    {
        return $this->update($id, ['isApproved' => true]);
    }

    public function reject(string $id): ?array
    {
        return $this->update($id, ['isApproved' => false]);
    }
}
