-- ============================================================================
-- MIGRATION: explicit display order for the homepage Orbit Ring curated list
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run (uses IF NOT EXISTS / conditional column adds throughout).
--
--   mysql -u root wellness_store < backend/migrations/016_add_orbit_sort_order_to_products.sql
--
-- A fresh database created from backend/schema.sql already has this change
-- and does not need this file.
--
-- Companion to 015_add_orbit_featured_to_products.sql: that migration marks
-- WHICH products are curated for the Orbit Ring, this one records WHAT ORDER
-- they should cycle in — set from the new admin "Orbit Ring" manager
-- (Content -> Homepage), not left to incidental row order.
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'orbit_sort_order'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `products` ADD COLUMN `orbit_sort_order` int(11) NOT NULL DEFAULT 0 COMMENT ''Display order within the curated Orbit Ring list (lower first)'' AFTER `orbit_featured`',
  'SELECT ''orbit_sort_order already present on products'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
