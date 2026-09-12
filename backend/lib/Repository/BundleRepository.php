<?php

declare(strict_types=1);

namespace Krivea\Repository;

use Krivea\Database;

/**
 * Bundles — a curated set of products sold together at a discount.
 * Backed by `bundles` + `bundle_items`.
 *
 * Deliberately NOT storing a static bundle price: it's always computed live
 * from the current price of each included product minus the bundle's
 * discount, so a later price change or sale on a product is automatically
 * reflected in every bundle it's part of instead of silently drifting out
 * of sync.
 */
final class BundleRepository extends MysqlRepository
{
    protected function tableName(): string { return 'bundles'; }

    private function products(): ProductRepository
    {
        static $repo = null;
        $repo ??= new ProductRepository();
        return $repo;
    }

    private function scalarFields(array $row): array
    {
        return [
            'id'            => $row['id'],
            'title'         => $row['title'],
            'subtitle'      => $row['subtitle'],
            'description'   => $row['description'],
            'image'         => $row['image'],
            'discountType'  => $row['discount_type'],
            'discountValue' => (float) $row['discount_value'],
            'isPublished'   => $this->bool($row['is_published']),
            'sortOrder'     => (int) $row['sort_order'],
            'createdAt'     => $this->toIso($row['created_at']),
            'updatedAt'     => $this->toIso($row['updated_at']),
        ];
    }

    protected function rowToArray(array $row): array
    {
        return $this->hydrate($this->scalarFields($row), publishedItemsOnly: false);
    }

    /**
     * Attach items (with a product snapshot) and computed pricing.
     * When $publishedItemsOnly is true (storefront reads), unpublished or
     * deleted products are silently dropped from the bundle instead of
     * breaking the page.
     */
    private function hydrate(array $bundle, bool $publishedItemsOnly): array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order ASC'
        );
        $stmt->execute([$bundle['id']]);
        $rows = $stmt->fetchAll();

        $productRepo = $this->products();
        $items = [];
        $subtotal = 0.0;
        foreach ($rows as $r) {
            $product = $publishedItemsOnly
                ? $productRepo->getPublicById($r['product_id'])
                : $productRepo->getById($r['product_id']);
            if (!$product) {
                continue; // product deleted — drop the line rather than error
            }
            if ($publishedItemsOnly && $product['isPublished'] === false) {
                continue;
            }
            $qty = (int) $r['quantity'];
            $items[] = [
                'productId' => $r['product_id'],
                'quantity'  => $qty,
                'product'   => [
                    'id'    => $product['id'],
                    'title' => $product['title'],
                    'image' => $product['images'][0] ?? null,
                    'price' => $product['price'],
                    'originalPrice' => $product['originalPrice'],
                    'stock' => $product['stock'],
                    'isPublished' => $product['isPublished'],
                ],
            ];
            $subtotal += $product['price'] * $qty;
        }

        $bundle['items'] = $items;
        $bundle['pricing'] = self::computePricing($subtotal, $bundle['discountType'], $bundle['discountValue']);
        return $bundle;
    }

    /** @return array{subtotal: float, discountAmount: float, bundlePrice: float, savingsPercent: int} */
    public static function computePricing(float $subtotal, string $discountType, float $discountValue): array
    {
        $subtotal = round($subtotal, 2);
        $discountAmount = $discountType === 'flat'
            ? min($discountValue, $subtotal)
            : round($subtotal * max(0, min(100, $discountValue)) / 100, 2);
        $discountAmount = max(0, round($discountAmount, 2));
        $bundlePrice = round(max(0, $subtotal - $discountAmount), 2);
        $savingsPercent = $subtotal > 0 ? (int) round(($discountAmount / $subtotal) * 100) : 0;

        return [
            'subtotal'       => $subtotal,
            'discountAmount' => $discountAmount,
            'bundlePrice'    => $bundlePrice,
            'savingsPercent' => $savingsPercent,
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $row = [];
        $map = [
            'title'         => ['col' => 'title',          'type' => 'string'],
            'subtitle'      => ['col' => 'subtitle',        'type' => 'nullableString'],
            'description'   => ['col' => 'description',     'type' => 'nullableString'],
            'image'         => ['col' => 'image',           'type' => 'nullableString'],
            'discountType'  => ['col' => 'discount_type',   'type' => 'string'],
            'discountValue' => ['col' => 'discount_value',  'type' => 'float'],
            'isPublished'   => ['col' => 'is_published',    'type' => 'bool'],
            'sortOrder'     => ['col' => 'sort_order',      'type' => 'int'],
            'createdAt'     => ['col' => 'created_at',      'type' => 'datetime'],
            'updatedAt'     => ['col' => 'updated_at',      'type' => 'datetime'],
        ];

        foreach ($map as $php => $meta) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            $row[$meta['col']] = match ($meta['type']) {
                'bool'           => $v ? 1 : 0,
                'int'            => (int) $v,
                'float'          => (float) $v,
                'nullableString' => ($v === null || $v === '') ? null : (string) $v,
                'datetime'       => $this->toDbDatetime($v),
                default          => $v,
            };
        }
        return $row;
    }

    private function replaceItems(string $bundleId, array $items): void
    {
        $this->pdo()->prepare('DELETE FROM bundle_items WHERE bundle_id = ?')->execute([$bundleId]);
        if (!$items) {
            return;
        }
        $insert = $this->pdo()->prepare(
            'INSERT INTO bundle_items (bundle_id, product_id, quantity, sort_order) VALUES (?, ?, ?, ?)'
        );
        foreach (array_values($items) as $i => $item) {
            $productId = trim((string) ($item['productId'] ?? ''));
            if ($productId === '') {
                continue;
            }
            $insert->execute([$bundleId, $productId, max(1, (int) ($item['quantity'] ?? 1)), $i]);
        }
    }

    public function create(array $data): array
    {
        $row = $this->arrayToRow($data);
        $row['id'] = $data['id'];
        $cols   = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($row)));
        $places = implode(', ', array_fill(0, count($row), '?'));
        $this->pdo()->prepare("INSERT INTO bundles ({$cols}) VALUES ({$places})")->execute(array_values($row));

        $this->replaceItems($data['id'], $data['items'] ?? []);
        return $this->getById($data['id']);
    }

    public function update(string $id, array $changes): ?array
    {
        $row = $this->arrayToRow($changes);
        if (!empty($row)) {
            $sets = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($row)));
            $this->pdo()->prepare("UPDATE bundles SET {$sets} WHERE id = ?")->execute([...array_values($row), $id]);
        }
        if (array_key_exists('items', $changes)) {
            $this->replaceItems($id, $changes['items'] ?? []);
        }
        return $this->getById($id);
    }

    // -------------------------------------------------------------------------
    // Domain methods
    // -------------------------------------------------------------------------

    /** Published bundles with at least one still-available item, for the storefront. */
    public function getPublished(): array
    {
        $stmt = $this->pdo()->query(
            'SELECT * FROM bundles WHERE is_published = 1 ORDER BY sort_order ASC, created_at DESC'
        );
        $bundles = array_map(
            fn(array $row) => $this->hydrate($this->scalarFields($row), publishedItemsOnly: true),
            $stmt->fetchAll()
        );
        return array_values(array_filter($bundles, fn(array $b) => count($b['items']) >= 2));
    }

    public function getAllAdmin(): array
    {
        $stmt = $this->pdo()->query('SELECT * FROM bundles ORDER BY sort_order ASC, created_at DESC');
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    /** A single published bundle, with unpublished items dropped — the same
     *  shape the storefront sees, used to validate a checkout line. */
    public function getPublicById(string $id): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM bundles WHERE id = ? AND is_published = 1 LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $bundle = $this->hydrate($this->scalarFields($row), publishedItemsOnly: true);
        return count($bundle['items']) >= 2 ? $bundle : null;
    }

    /**
     * Server-trusted price for one product's line within a bundle purchase —
     * never trust a client-sent bundle price. Recomputes the bundle's whole
     * subtotal/discount from current catalog prices, then returns this
     * product's proportional share, plus the exact quantity and
     * variant/stock to check and decrement (mirrors how a plain variant
     * purchase is priced/stocked).
     *
     * @return array{unitPrice: float, quantity: int, stock: int, variantId: ?string, bundleTitle: string}|null
     */
    public function priceForProduct(string $bundleId, string $productId): ?array
    {
        $bundle = $this->getPublicById($bundleId);
        if (!$bundle) {
            return null;
        }
        $line = null;
        foreach ($bundle['items'] as $item) {
            if ($item['productId'] === $productId) {
                $line = $item;
                break;
            }
        }
        if (!$line || $bundle['pricing']['subtotal'] <= 0) {
            return null;
        }

        $catalogUnitPrice = (float) $line['product']['price'];
        $ratio = $bundle['pricing']['bundlePrice'] / $bundle['pricing']['subtotal'];
        $unitPrice = round($catalogUnitPrice * $ratio, 2);

        // A product with pack-size variants prices/stocks off its default
        // variant — resolve that here so stock is checked/decremented
        // against the right row, same as a normal (non-bundle) purchase.
        $fullProduct = $this->products()->getPublicById($productId);
        $variantId = null;
        $stock = (int) $line['product']['stock'];
        if (!empty($fullProduct['hasVariants']) && !empty($fullProduct['variants'])) {
            $default = null;
            foreach ($fullProduct['variants'] as $v) {
                if (!empty($v['isDefault'])) { $default = $v; break; }
            }
            $default ??= $fullProduct['variants'][0];
            $variantId = $default['id'];
            $stock = $default['stock'];
        }

        return [
            'unitPrice'   => $unitPrice,
            'quantity'    => $line['quantity'],
            'stock'       => $stock,
            'variantId'   => $variantId,
            'bundleTitle' => $bundle['title'],
        ];
    }
}
