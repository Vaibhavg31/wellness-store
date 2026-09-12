-- ============================================================================
-- MIGRATION: product variants (e.g. 1 Month / 3 Month / 6 Month supply)
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — it's safe
-- to re-run (uses IF NOT EXISTS / conditional column adds).
--
--   mysql -u root wellness_store < backend/migrations/001_add_product_variants.sql
--
-- A fresh database created from backend/schema.sql already has these changes
-- and does not need this file.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `label` varchar(150) NOT NULL COMMENT 'e.g. "1 Month Supply", "3 Month Supply"',
  `net_quantity` varchar(100) DEFAULT NULL COMMENT 'e.g. 200g, 60 capsules, 500ml — this variant''s pack size',
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` int(11) NOT NULL DEFAULT 0 COMMENT 'Percent discount; may be admin override',
  `stock` int(11) NOT NULL DEFAULT 0,
  `sku` varchar(100) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Pre-selected variant on the product page',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_variants_product_id` (`product_id`),
  CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Optional pack-size/duration variants for a product (e.g. 1/3/6 month supply), each with its own price and stock';

-- Add the two order_items snapshot columns only if they don't already exist
-- (MySQL has no `ADD COLUMN IF NOT EXISTS` before 8.0.29 / MariaDB 10.x, so
-- this checks information_schema first).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'variant_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `order_items`
     ADD COLUMN `variant_id` varchar(64) DEFAULT NULL COMMENT ''product_variants.id at time of purchase; NULL when the product has no variants'' AFTER `product_id`,
     ADD COLUMN `variant_label` varchar(150) DEFAULT NULL COMMENT ''Snapshot of the variant label (e.g. "3 Month Supply") so it survives later edits/deletes'' AFTER `variant_id`',
  'SELECT ''product_variants columns already present on order_items'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional demo rows — only inserted if the matching seed products exist on
-- this database (harmless no-op otherwise), and safe to re-run (INSERT IGNORE).
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`)
SELECT * FROM (SELECT
    'ws-ashwagandha-001-1m' AS v_id, 'ws-ashwagandha-001' AS v_product_id, '1 Month Supply' AS v_label, '60 capsules' AS v_qty, 649.00 AS v_price, 899.00 AS v_orig, 28 AS v_disc, 60 AS v_stock, 'WS-ASH-001-1M' AS v_sku, 1 AS v_default, 1 AS v_sort, '2026-01-10 10:00:00.000000' AS v_created, '2026-08-18 10:00:00.000000' AS v_updated
  UNION ALL SELECT 'ws-ashwagandha-001-3m', 'ws-ashwagandha-001', '3 Month Supply', '180 capsules (3x60)', 1799.00, 2697.00, 33, 40, 'WS-ASH-001-3M', 0, 2, '2026-01-10 10:00:00.000000', '2026-08-18 10:00:00.000000'
  UNION ALL SELECT 'ws-ashwagandha-001-6m', 'ws-ashwagandha-001', '6 Month Supply', '360 capsules (6x60)', 3299.00, 5394.00, 39, 20, 'WS-ASH-001-6M', 0, 3, '2026-01-10 10:00:00.000000', '2026-08-18 10:00:00.000000'
  UNION ALL SELECT 'ws-protein-001-1m', 'ws-protein-001', '1 Month Supply', '1kg (33 servings)', 1899.00, 2499.00, 24, 30, 'WS-PRO-001-1M', 1, 1, '2026-01-05 10:00:00.000000', '2026-08-20 10:00:00.000000'
  UNION ALL SELECT 'ws-protein-001-3m', 'ws-protein-001', '3 Month Supply', '3kg (3x1kg)', 5399.00, 7497.00, 28, 20, 'WS-PRO-001-3M', 0, 2, '2026-01-05 10:00:00.000000', '2026-08-20 10:00:00.000000'
  UNION ALL SELECT 'ws-protein-001-6m', 'ws-protein-001', '6 Month Supply', '6kg (6x1kg)', 9999.00, 14994.00, 33, 10, 'WS-PRO-001-6M', 0, 3, '2026-01-05 10:00:00.000000', '2026-08-20 10:00:00.000000'
) AS demo_rows
WHERE EXISTS (SELECT 1 FROM `products` WHERE `id` = demo_rows.v_product_id);

