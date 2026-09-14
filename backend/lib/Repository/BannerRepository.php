<?php

declare(strict_types=1);

namespace Wellness\Repository;

use Wellness\Database;

/**
 * Homepage promotional banners — brand campaigns, festival sales, etc.
 * Rendered as an extra homepage section (does not replace any existing section).
 */
final class BannerRepository extends MysqlRepository
{
    protected function tableName(): string { return 'promo_banners'; }

    protected function rowToArray(array $row): array
    {
        return [
            'id'            => $row['id'],
            'title'         => $row['title'],
            'subtitle'      => $row['subtitle'],
            'image'         => $row['image'],
            'ctaLabel'      => $row['cta_label'],
            'ctaHref'       => $row['cta_href'],
            'isEnabled'     => $this->bool($row['is_enabled']),
            // 'slider' | 'stacked' | 'both' — which homepage section(s) this
            // banner appears in. Without this, "Banner Slider" and "Image
            // Banners (Stacked)" had no way to show different photos; enabling
            // both sections at once would just repeat the same images twice.
            'displayTarget' => $row['display_target'],
            'productId'     => $row['product_id'],
            'order'         => (int) $row['sort_order'],
            'createdAt'     => $this->toIso($row['created_at']),
            'updatedAt'     => $this->toIso($row['updated_at']),
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $row = [];
        $map = [
            'title'         => ['col' => 'title',          'type' => 'string'],
            'subtitle'      => ['col' => 'subtitle',        'type' => 'string'],
            'image'         => ['col' => 'image',           'type' => 'string'],
            'ctaLabel'      => ['col' => 'cta_label',       'type' => 'string'],
            'ctaHref'       => ['col' => 'cta_href',        'type' => 'string'],
            'isEnabled'     => ['col' => 'is_enabled',      'type' => 'bool'],
            'displayTarget' => ['col' => 'display_target',  'type' => 'string'],
            'productId'     => ['col' => 'product_id',      'type' => 'string'],
            'order'         => ['col' => 'sort_order',      'type' => 'int'],
            'updatedAt'     => ['col' => 'updated_at',      'type' => 'datetime'],
        ];
        foreach ($map as $php => $meta) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            $row[$meta['col']] = match ($meta['type']) {
                'bool'     => $v ? 1 : 0,
                'int'      => (int) $v,
                'datetime' => $this->toDbDatetime($v),
                default    => $v,
            };
        }
        return $row;
    }

    /**
     * @param string|null $target 'slider' or 'stacked' to only return banners
     *   tagged for that display (plus ones tagged 'both'); null returns every
     *   enabled banner regardless of target. Use getPublishedForProduct() for
     *   'product'-targeted banners instead — those are always scoped to one
     *   product and never fall back to 'both'.
     */
    public function getPublished(?string $target = null): array
    {
        if ($target !== null && !in_array($target, ['slider', 'stacked'], true)) {
            $target = null;
        }

        if ($target === null) {
            $stmt = $this->pdo()->query(
                "SELECT * FROM promo_banners WHERE is_enabled = 1 AND display_target != 'product' ORDER BY sort_order ASC, created_at ASC"
            );
        } else {
            $stmt = $this->pdo()->prepare(
                "SELECT * FROM promo_banners WHERE is_enabled = 1 AND display_target IN (?, 'both') ORDER BY sort_order ASC, created_at ASC"
            );
            $stmt->execute([$target]);
        }
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    /**
     * Banners an admin has attached to one specific product's page — a
     * completely separate slot from the homepage sections above, so a
     * product banner never leaks onto the homepage and vice versa.
     */
    public function getPublishedForProduct(string $productId): array
    {
        $stmt = $this->pdo()->prepare(
            "SELECT * FROM promo_banners WHERE is_enabled = 1 AND display_target = 'product' AND product_id = ? ORDER BY sort_order ASC, created_at ASC"
        );
        $stmt->execute([$productId]);
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    public function create(array $data): array
    {
        $data['id']        = $data['id'] ?? Database::generateId('banner');
        $data['createdAt'] = $data['createdAt'] ?? gmdate('c');
        $data['updatedAt'] = $data['updatedAt'] ?? gmdate('c');

        $row = $this->arrayToRow($data);
        $row['id']         = $data['id'];
        $row['created_at'] = $this->toDbDatetime($data['createdAt']);

        $cols   = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($row)));
        $places = implode(', ', array_fill(0, count($row), '?'));
        $this->pdo()->prepare("INSERT INTO promo_banners ({$cols}) VALUES ({$places})")->execute(array_values($row));

        return $this->getById($data['id']);
    }

    public function update(string $id, array $changes): ?array
    {
        $changes['updatedAt'] = gmdate('c');
        return parent::update($id, $changes);
    }
}
