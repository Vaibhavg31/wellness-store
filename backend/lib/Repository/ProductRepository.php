<?php

declare(strict_types=1);

namespace Krivea\Repository;

use Krivea\Database;

/**
 * Products — backed by `products` + child tables:
 * product_images, product_tags, product_features, product_cutout_images.
 */
final class ProductRepository extends MysqlRepository
{
    protected function tableName(): string { return 'products'; }

    /** Child tables keyed by their PHP array key → [table, column]. */
    private const CHILD_TABLES = [
        'images'   => ['product_images', 'url'],
        'tags'     => ['product_tags', 'tag'],
        'features' => ['product_features', 'feature'],
        'badges'   => ['product_badges', 'badge'],
    ];

    protected function rowToArray(array $row): array
    {
        $id = $row['id'];
        $children = [];
        foreach (self::CHILD_TABLES as $key => [$table, $col]) {
            $children[$key] = $this->fetchChildStrings($table, $id, $col);
        }
        $children['variants'] = $this->fetchVariants($id);
        return $this->applyVariantOverrides(array_merge($this->scalarFields($row), $children));
    }

    private function scalarFields(array $row): array
    {
        return [
            'id'                   => $row['id'],
            'title'                => $row['title'],
            'price'                => (float) $row['price'],
            'originalPrice'        => (float) $row['original_price'],
            'discount'             => (int) $row['discount'],
            'category'             => $row['category_id'],
            'rating'               => (float) $row['rating'],
            'reviewCount'          => (int) $row['review_count'],
            'description'          => $row['description'],
            'stock'                => (int) $row['stock'],
            'isNew'                => $this->bool($row['is_new']),
            'isBestSeller'         => $this->bool($row['is_best_seller']),
            'isTrendingPinned'     => $this->bool($row['is_trending_pinned']),
            'showTrustBadges'      => $this->bool($row['show_trust_badges']),
            'isPublished'          => $this->bool($row['is_published']),
            'codEnabled'           => $this->bool($row['cod_enabled']),
            'onlinePaymentEnabled' => $this->bool($row['online_payment_enabled']),
            'createdAt'            => $this->toIso($row['created_at']),
            'updatedAt'            => $this->toIso($row['updated_at']),
        ];
    }

    /**
     * Map a whole result set with 6 total queries instead of 1 + 5×N — the
     * single biggest cause of the storefront/admin slowing down as the
     * catalog grows (every product listing was doing 5 extra per-product
     * queries for images/tags/features/badges/cutout images).
     */
    private function mapRowsBatched(array $rows): array
    {
        if (!$rows) {
            return [];
        }

        $ids = array_column($rows, 'id');
        $childrenByKey = [];
        foreach (self::CHILD_TABLES as $key => [$table, $col]) {
            $childrenByKey[$key] = $this->fetchChildStringsBatch($table, $col, $ids);
        }
        $variantsById = $this->fetchVariantsBatch($ids);

        return array_map(function (array $row) use ($childrenByKey, $variantsById) {
            $id = $row['id'];
            $children = [];
            foreach (array_keys(self::CHILD_TABLES) as $key) {
                $children[$key] = $childrenByKey[$key][$id] ?? [];
            }
            $children['variants'] = $variantsById[$id] ?? [];
            return $this->applyVariantOverrides(array_merge($this->scalarFields($row), $children));
        }, $rows);
    }

    /**
     * When a product has variants, the catalog-wide price/stock (used by
     * product cards, cart, search, etc. everywhere else in the app) should
     * reflect the pre-selected ("default") variant instead of the product's
     * own base row — so nothing outside the product detail page needs to
     * know variants exist at all.
     */
    private function applyVariantOverrides(array $product): array
    {
        $variants = $product['variants'] ?? [];
        if (!$variants) {
            $product['hasVariants'] = false;
            return $product;
        }

        $default = null;
        foreach ($variants as $v) {
            if (!empty($v['isDefault'])) { $default = $v; break; }
        }
        $default ??= $variants[0];

        $product['hasVariants']   = true;
        $product['price']         = $default['price'];
        $product['originalPrice'] = $default['originalPrice'];
        $product['discount']      = $default['discount'];
        $product['stock']         = array_sum(array_column($variants, 'stock'));
        return $product;
    }

    /** @return array<string, list<string>> child values grouped by product_id */
    private function fetchChildStringsBatch(string $table, string $col, array $productIds): array
    {
        $placeholders = implode(', ', array_fill(0, count($productIds), '?'));
        $stmt = $this->pdo()->prepare(
            "SELECT product_id, `{$col}` AS val FROM `{$table}` WHERE product_id IN ({$placeholders}) ORDER BY product_id, sort_order ASC"
        );
        $stmt->execute($productIds);

        $grouped = [];
        foreach ($stmt->fetchAll() as $r) {
            $grouped[$r['product_id']][] = $r['val'];
        }
        return $grouped;
    }

    protected function arrayToRow(array $data): array
    {
        $row = [];
        $map = [
            'title'                => ['col' => 'title',                   'type' => 'string'],
            'price'                => ['col' => 'price',                   'type' => 'float'],
            'originalPrice'        => ['col' => 'original_price',          'type' => 'float'],
            'discount'             => ['col' => 'discount',                'type' => 'int'],
            'category'             => ['col' => 'category_id',             'type' => 'string'],
            'rating'               => ['col' => 'rating',                  'type' => 'float'],
            'reviewCount'          => ['col' => 'review_count',            'type' => 'int'],
            'description'          => ['col' => 'description',             'type' => 'string'],
            'stock'                => ['col' => 'stock',                   'type' => 'int'],
            'isNew'                => ['col' => 'is_new',                  'type' => 'bool'],
            'isBestSeller'         => ['col' => 'is_best_seller',          'type' => 'bool'],
            'isTrendingPinned'     => ['col' => 'is_trending_pinned',      'type' => 'bool'],
            'showTrustBadges'      => ['col' => 'show_trust_badges',       'type' => 'bool'],
            'isPublished'          => ['col' => 'is_published',            'type' => 'bool'],
            'codEnabled'           => ['col' => 'cod_enabled',             'type' => 'bool'],
            'onlinePaymentEnabled' => ['col' => 'online_payment_enabled',  'type' => 'bool'],
            'createdAt'            => ['col' => 'created_at',              'type' => 'datetime'],
            'updatedAt'            => ['col' => 'updated_at',              'type' => 'datetime'],
        ];

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

    // -------------------------------------------------------------------------
    // Variants (product_variants) — structured child rows, not a simple
    // one-column child table, so they get their own read/write methods.
    // -------------------------------------------------------------------------

    private function variantRowToArray(array $r): array
    {
        return [
            'id'             => $r['id'],
            'label'          => $r['label'],
            'netQuantity'    => $r['net_quantity'],
            // NULL (the common case) means "reuse the product's own photos" —
            // only set when this specific option genuinely looks different
            // (e.g. a different color/flavor).
            'image'          => $r['image'] ?? null,
            'price'          => (float) $r['price'],
            'originalPrice'  => (float) $r['original_price'],
            'discount'       => (int) $r['discount'],
            'stock'          => (int) $r['stock'],
            'sku'            => $r['sku'],
            'isDefault'      => $this->bool($r['is_default']),
        ];
    }

    /**
     * True once we've confirmed `product_variants` exists on this database —
     * checked at most once per request. Lets an install that hasn't run
     * backend/migrations/001_add_product_variants.sql yet keep listing
     * products normally (just without variants) instead of every single
     * product request failing outright.
     */
    private static ?bool $variantsTableExists = null;

    private function variantsTableExists(): bool
    {
        if (self::$variantsTableExists === null) {
            try {
                $this->pdo()->query('SELECT 1 FROM product_variants LIMIT 1');
                self::$variantsTableExists = true;
            } catch (\Throwable) {
                self::$variantsTableExists = false;
                error_log('[ProductRepository] `product_variants` table not found — run backend/migrations/001_add_product_variants.sql. Serving products without variants in the meantime.');
            }
        }
        return self::$variantsTableExists;
    }

    private function fetchVariants(string $productId): array
    {
        if (!$this->variantsTableExists()) {
            return [];
        }
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC'
        );
        $stmt->execute([$productId]);
        return array_map([$this, 'variantRowToArray'], $stmt->fetchAll());
    }

    /** @return array<string, list<array>> variants grouped by product_id */
    private function fetchVariantsBatch(array $productIds): array
    {
        if (!$productIds || !$this->variantsTableExists()) {
            return [];
        }
        $placeholders = implode(', ', array_fill(0, count($productIds), '?'));
        $stmt = $this->pdo()->prepare(
            "SELECT * FROM product_variants WHERE product_id IN ({$placeholders}) ORDER BY product_id, sort_order ASC, created_at ASC"
        );
        $stmt->execute($productIds);

        $grouped = [];
        foreach ($stmt->fetchAll() as $r) {
            $grouped[$r['product_id']][] = $this->variantRowToArray($r);
        }
        return $grouped;
    }

    /**
     * True once we've confirmed `product_variants.image` exists on this
     * database — checked at most once per request. Lets an install that has
     * run 001_add_product_variants.sql but not yet
     * 003_add_variant_image.sql keep saving variants (just without a
     * per-option photo override) instead of every save failing outright.
     */
    private static ?bool $variantImageColumnExists = null;

    private function variantImageColumnExists(): bool
    {
        if (self::$variantImageColumnExists === null) {
            try {
                $this->pdo()->query('SELECT image FROM product_variants LIMIT 1');
                self::$variantImageColumnExists = true;
            } catch (\Throwable) {
                self::$variantImageColumnExists = false;
                error_log('[ProductRepository] `product_variants.image` column not found — run backend/migrations/003_add_variant_image.sql. Saving variants without per-option photos in the meantime.');
            }
        }
        return self::$variantImageColumnExists;
    }

    private function replaceVariants(string $productId, array $variants): void
    {
        $this->pdo()->prepare('DELETE FROM product_variants WHERE product_id = ?')->execute([$productId]);
        if (!$variants) {
            return;
        }

        $hasImageCol = $this->variantImageColumnExists();
        $cols = 'id, product_id, label, net_quantity, ' . ($hasImageCol ? 'image, ' : '') .
            'price, original_price, discount, stock, sku, is_default, sort_order, created_at, updated_at';
        $placeholders = implode(', ', array_fill(0, $hasImageCol ? 14 : 13, '?'));
        $insert = $this->pdo()->prepare("INSERT INTO product_variants ({$cols}) VALUES ({$placeholders})");

        $now = gmdate('Y-m-d H:i:s');
        foreach (array_values($variants) as $i => $v) {
            $price    = (float) ($v['price'] ?? 0);
            $original = (float) ($v['originalPrice'] ?? $price);
            $params = [
                $v['id'] ?? Database::generateId('variant'),
                $productId,
                trim((string) ($v['label'] ?? '')) ?: 'Variant ' . ($i + 1),
                ($v['netQuantity'] ?? '') !== '' ? $v['netQuantity'] : null,
            ];
            if ($hasImageCol) {
                $params[] = ($v['image'] ?? '') !== '' ? $v['image'] : null;
            }
            $params = [
                ...$params,
                $price,
                $original,
                self::calcDiscount($price, $original, isset($v['discount']) ? (float) $v['discount'] : null),
                (int) ($v['stock'] ?? 0),
                $v['sku'] ?? null,
                !empty($v['isDefault']) ? 1 : 0,
                $i,
                $now,
                $now,
            ];
            $insert->execute($params);
        }
    }

    /** Fetch a single variant, scoped to its product (defends against a
     *  variantId from one product being used to buy/adjust another's). */
    public function getVariant(string $productId, string $variantId): ?array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1'
        );
        $stmt->execute([$variantId, $productId]);
        $row = $stmt->fetch();
        return $row ? $this->variantRowToArray($row) : null;
    }

    public function adjustVariantStock(string $variantId, int $delta): bool
    {
        $pdo  = $this->pdo();
        $stmt = $pdo->prepare('SELECT stock FROM product_variants WHERE id = ? FOR UPDATE');
        $pdo->beginTransaction();
        try {
            $stmt->execute([$variantId]);
            $row = $stmt->fetch();
            if (!$row) {
                $pdo->rollBack();
                return false;
            }
            $next = (int) $row['stock'] + $delta;
            if ($next < 0) {
                $pdo->rollBack();
                return false;
            }
            $pdo->prepare('UPDATE product_variants SET stock = ?, updated_at = ? WHERE id = ?')
                ->execute([$next, gmdate('Y-m-d H:i:s'), $variantId]);
            $pdo->commit();
            return true;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private function fetchChildStrings(string $table, string $productId, string $col): array
    {
        $stmt = $this->pdo()->prepare(
            "SELECT `{$col}` FROM `{$table}` WHERE product_id = ? ORDER BY sort_order ASC"
        );
        $stmt->execute([$productId]);
        return $stmt->fetchAll(\PDO::FETCH_COLUMN);
    }

    private function replaceChildStrings(string $table, string $productId, string $col, array $values): void
    {
        $this->pdo()->prepare("DELETE FROM `{$table}` WHERE product_id = ?")->execute([$productId]);
        if (!$values) {
            return;
        }
        $insert = $this->pdo()->prepare(
            "INSERT INTO `{$table}` (product_id, `{$col}`, sort_order) VALUES (?, ?, ?)"
        );
        foreach (array_values($values) as $i => $v) {
            $insert->execute([$productId, $v, $i]);
        }
    }

    // Override create/update to handle child tables
    public function create(array $data): array
    {
        $row     = $this->arrayToRow($data);
        $row['id'] = $data['id'];
        $cols    = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($row)));
        $places  = implode(', ', array_fill(0, count($row), '?'));
        $this->pdo()->prepare("INSERT INTO products ({$cols}) VALUES ({$places})")->execute(array_values($row));

        $id = $data['id'];
        $this->replaceChildStrings('product_images',   $id, 'url',     $data['images']   ?? []);
        $this->replaceChildStrings('product_tags',     $id, 'tag',     $data['tags']     ?? []);
        $this->replaceChildStrings('product_features', $id, 'feature', $data['features'] ?? []);
        $this->replaceChildStrings('product_badges',   $id, 'badge',   $data['badges']   ?? []);
        if (array_key_exists('variants', $data)) {
            $this->replaceVariants($id, $data['variants'] ?? []);
        }

        return $data;
    }

    public function update(string $id, array $changes): ?array
    {
        $row = $this->arrayToRow($changes);
        if (!empty($row)) {
            $sets = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($row)));
            $this->pdo()->prepare("UPDATE products SET {$sets} WHERE id = ?")->execute([...array_values($row), $id]);
        }

        foreach (self::CHILD_TABLES as $phpKey => [$table, $col]) {
            if (array_key_exists($phpKey, $changes)) {
                $this->replaceChildStrings($table, $id, $col, $changes[$phpKey]);
            }
        }
        if (array_key_exists('variants', $changes)) {
            $this->replaceVariants($id, $changes['variants'] ?? []);
        }

        return $this->getById($id);
    }

    // -------------------------------------------------------------------------
    // Domain methods
    // -------------------------------------------------------------------------

    public function getPublished(): array
    {
        $stmt = $this->pdo()->query('SELECT * FROM products WHERE is_published = 1');
        return $this->mapRowsBatched($stmt->fetchAll());
    }

    public function getAdmin(): array
    {
        $stmt = $this->pdo()->query('SELECT * FROM products');
        return $this->mapRowsBatched($stmt->fetchAll());
    }

    public function getPublicById(string $id): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM products WHERE id = ? AND is_published = 1 LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }

    /**
     * Only products the admin has explicitly pinned as trending.
     */
    public function getTrending(int $limit = 12): array
    {
        $pdo = $this->pdo();
        $rows = $pdo->query(
            'SELECT * FROM products WHERE is_trending_pinned = 1 AND is_published = 1 ORDER BY updated_at DESC LIMIT ' . (int) $limit
        )->fetchAll();

        return $this->mapRowsBatched($rows);
    }

    public function adjustStock(string $id, int $delta): bool
    {
        $pdo  = $this->pdo();
        $stmt = $pdo->prepare('SELECT stock FROM products WHERE id = ? FOR UPDATE');
        $pdo->beginTransaction();
        try {
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                $pdo->rollBack();
                return false;
            }
            $next = (int) $row['stock'] + $delta;
            if ($next < 0) {
                $pdo->rollBack();
                return false;
            }
            $pdo->prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?')
                ->execute([$next, gmdate('Y-m-d H:i:s'), $id]);
            $pdo->commit();
            return true;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function calcDiscount(float $price, float $originalPrice, ?float $manual = null): int
    {
        if ($manual !== null) {
            return (int) $manual;
        }
        if ($originalPrice <= $price) {
            return 0;
        }
        return (int) round((($originalPrice - $price) / $originalPrice) * 100);
    }
}
