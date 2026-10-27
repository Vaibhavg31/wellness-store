-- ============================================================================
-- MIGRATION: optional per-variant photo override
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run. Only needed if you already ran 001_add_product_variants.sql
-- before this column existed; a fresh install from backend/schema.sql
-- already has it.
--
--   mysql -u root wellness_store < backend/migrations/003_add_variant_image.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_variants' AND COLUMN_NAME = 'image'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `product_variants` ADD COLUMN `image` varchar(2048) DEFAULT NULL COMMENT ''Optional override photo (e.g. a different color/flavor); NULL = reuse the product''''s own photos'' AFTER `net_quantity`',
  'SELECT ''image column already present on product_variants'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
