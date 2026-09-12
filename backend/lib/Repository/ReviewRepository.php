<?php

declare(strict_types=1);

namespace Krivea\Repository;

final class ReviewRepository extends MysqlRepository
{
    protected function tableName(): string { return 'reviews'; }

    protected function rowToArray(array $row): array
    {
        return [
            'id'         => $row['id'],
            'productId'  => $row['product_id'],
            'name'       => $row['name'],
            'email'      => $row['email'],
            'rating'     => (int) $row['rating'],
            'comment'    => $row['comment'],
            'avatar'     => $row['avatar'],
            'isApproved' => $this->bool($row['is_approved']),
            'createdAt'  => $this->toIso($row['created_at']),
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $map = [
            'productId'  => ['col' => 'product_id',  'type' => 'string'],
            'name'       => ['col' => 'name',         'type' => 'string'],
            'email'      => ['col' => 'email',        'type' => 'string'],
            'rating'     => ['col' => 'rating',       'type' => 'int'],
            'comment'    => ['col' => 'comment',      'type' => 'string'],
            'avatar'     => ['col' => 'avatar',       'type' => 'string'],
            'isApproved' => ['col' => 'is_approved',  'type' => 'bool'],
            'createdAt'  => ['col' => 'created_at',   'type' => 'datetime'],
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

    public function approve(string $id): ?array
    {
        return $this->update($id, ['isApproved' => true]);
    }

    public function reject(string $id): ?array
    {
        return $this->update($id, ['isApproved' => false]);
    }
}
