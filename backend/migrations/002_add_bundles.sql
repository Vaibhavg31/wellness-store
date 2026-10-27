-- ============================================================================
-- MIGRATION: product bundles (e.g. "Complete Wellness Kit" — buy N products
-- together and save)
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — it's safe
-- to re-run (uses IF NOT EXISTS / conditional column adds).
--
--   mysql -u root wellness_store < backend/migrations/002_add_bundles.sql
--
-- A fresh database created from backend/schema.sql already has these changes
-- and does not need this file.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `bundles` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subtitle` varchar(255) DEFAULT NULL COMMENT 'e.g. "Frequently Bought Together", "Complete your routine"',
  `description` text DEFAULT NULL,
  `image` varchar(2048) DEFAULT NULL COMMENT 'Optional cover image; falls back to a collage of item images',
  `discount_type` enum('percent','flat') NOT NULL DEFAULT 'percent',
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Percent off (0-100) or a flat rupee amount off the combined item price',
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bundles_is_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Multi-product bundle offers — price is computed live from current item prices minus the discount, so it never drifts out of sync';

CREATE TABLE IF NOT EXISTS `bundle_items` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `bundle_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_bundle_items_bundle_id` (`bundle_id`),
  KEY `idx_bundle_items_product_id` (`product_id`),
  CONSTRAINT `fk_bundle_items_bundle` FOREIGN KEY (`bundle_id`) REFERENCES `bundles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Products (and quantities) that make up a bundle';

-- order_items snapshot columns, added only if missing.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'bundle_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `order_items`
     ADD COLUMN `bundle_id` varchar(64) DEFAULT NULL COMMENT ''bundles.id when this line was purchased as part of a bundle offer'',
     ADD COLUMN `bundle_title` varchar(255) DEFAULT NULL COMMENT ''Snapshot of the bundle title so it survives later edits/deletes''',
  'SELECT ''bundle columns already present on order_items'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Pre-existing bug fix: site_section_toggles was missing the `sort_order`
-- column that SettingsRepository has always queried/written — every
-- settings read/write was failing before this. Added here since the new
-- "bundles" homepage section toggle needs it to work at all.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_section_toggles' AND COLUMN_NAME = 'sort_order'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `site_section_toggles` ADD COLUMN `sort_order` int(11) NOT NULL DEFAULT 0',
  'SELECT ''sort_order already present on site_section_toggles'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Pre-existing bug fix: seed data used the key "qualityBanner" for this
-- toggle but every renderer/label in the app has always used
-- "antiTarnishBanner" — so that section never actually rendered. Fix the key
-- in place (only if the old key exists and the correct one doesn't yet).
UPDATE site_section_toggles SET section_key = 'antiTarnishBanner'
WHERE section_key = 'qualityBanner'
  AND NOT EXISTS (SELECT 1 FROM (SELECT section_key FROM site_section_toggles) t WHERE t.section_key = 'antiTarnishBanner');

-- Add the "bundles" homepage section toggle (enabled) if it isn't there yet,
-- placed right after "trending" in display order when we can infer that;
-- otherwise appended at the end.
SET @bundles_exists := (SELECT COUNT(*) FROM site_section_toggles WHERE section_key = 'bundles');
SET @trending_sort := (SELECT sort_order FROM site_section_toggles WHERE section_key = 'trending' LIMIT 1);
SET @max_sort := (SELECT COALESCE(MAX(sort_order), 0) FROM site_section_toggles);
INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'bundles', 1, COALESCE(@trending_sort, @max_sort) + 1
WHERE @bundles_exists = 0;

-- Optional demo bundles — only inserted if the matching seed products exist
-- on this database (harmless no-op otherwise), and safe to re-run.
INSERT IGNORE INTO `bundles` (`id`, `title`, `subtitle`, `description`, `image`, `discount_type`, `discount_value`, `is_published`, `sort_order`, `created_at`, `updated_at`)
SELECT 'bundle-wellness-kit', 'Complete Wellness Kit', 'Frequently Bought Together', 'Everyday essentials for stress, immunity, and digestion — together in one routine.', NULL, 'percent', 15, 1, 1, '2026-04-01 10:00:00.000000', '2026-08-01 10:00:00.000000'
WHERE EXISTS (SELECT 1 FROM products WHERE id = 'ws-ashwagandha-001')
  AND EXISTS (SELECT 1 FROM products WHERE id = 'ws-multivitamin-001')
  AND EXISTS (SELECT 1 FROM products WHERE id = 'ws-triphala-001');

INSERT IGNORE INTO `bundle_items` (`bundle_id`, `product_id`, `quantity`, `sort_order`)
SELECT * FROM (
    SELECT 'bundle-wellness-kit' AS b, 'ws-ashwagandha-001' AS p, 1 AS q, 0 AS s
    UNION ALL SELECT 'bundle-wellness-kit', 'ws-multivitamin-001', 1, 1
    UNION ALL SELECT 'bundle-wellness-kit', 'ws-triphala-001', 1, 2
) AS demo_items
WHERE EXISTS (SELECT 1 FROM bundles WHERE id = 'bundle-wellness-kit');
