<?php

declare(strict_types=1);

namespace Krivea\Repository;

final class CategoryRepository extends MysqlRepository
{
    protected function tableName(): string { return 'categories'; }

    protected function rowToArray(array $row): array
    {
        return [
            'id'          => $row['id'],
            'slug'        => $row['slug'],
            'label'       => $row['label'],
            'description' => $row['description'],
            'image'       => $row['image'],
            'isPublished' => $this->bool($row['is_published']),
            'order'       => (int) $row['sort_order'],
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $row = [];
        $map = [
            'slug'        => ['col' => 'slug',         'type' => 'string'],
            'label'       => ['col' => 'label',        'type' => 'string'],
            'description' => ['col' => 'description',  'type' => 'string'],
            'image'       => ['col' => 'image',        'type' => 'string'],
            'isPublished' => ['col' => 'is_published', 'type' => 'bool'],
            'order'       => ['col' => 'sort_order',   'type' => 'int'],
        ];
        foreach ($map as $php => $meta) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            $row[$meta['col']] = match($meta['type']) {
                'bool' => $v ? 1 : 0,
                'int'  => (int) $v,
                default => $v,
            };
        }
        return $row;
    }

    /**
     * Public categories — only ones with at least one published product.
     * Without this, a category with zero products still showed up in the
     * storefront's "Shop by Category" list, leading customers into an empty
     * category page. Admin's own category list (getAll(), inherited) is
     * intentionally NOT filtered — admins still need to see and manage
     * every category, including ones not yet stocked.
     */
    public function getPublished(): array
    {
        $stmt = $this->pdo()->query(
            "SELECT c.* FROM categories c
             WHERE c.is_published = 1
               AND EXISTS (
                   SELECT 1 FROM products p
                   WHERE p.category_id = c.id AND p.is_published = 1
               )
             ORDER BY c.sort_order ASC"
        );
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    public function findBySlug(string $slug): ?array
    {
        return $this->findOneBy('slug', $slug);
    }

    /**
     * Every category (published or not) with its total product count —
     * every product regardless of publish status, since this is for admin
     * inventory management, not the storefront. One query (LEFT JOIN +
     * GROUP BY) instead of a per-category COUNT query.
     */
    public function getAllWithProductCount(): array
    {
        $stmt = $this->pdo()->query(
            'SELECT c.*, COUNT(p.id) AS product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id
             GROUP BY c.id
             ORDER BY c.sort_order ASC'
        );
        return array_map(function (array $row) {
            return array_merge($this->rowToArray($row), [
                'productCount' => (int) $row['product_count'],
            ]);
        }, $stmt->fetchAll());
    }
}
