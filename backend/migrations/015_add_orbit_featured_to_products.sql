-- ============================================================================
-- MIGRATION: homepage Orbit Ring center rotation — admin-curated product pick
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run (uses IF NOT EXISTS / conditional column adds throughout).
--
--   mysql -u root wellness_store < backend/migrations/015_add_orbit_featured_to_products.sql
--
-- A fresh database created from backend/schema.sql already has this change
-- and does not need this file.
--
-- Lets the admin explicitly pick which products cycle through the center of
-- the homepage "Orbit Ring" (OrbitShowcase.jsx) instead of that spot always
-- falling to whichever product happens to be best-seller/new. The orbiting
-- ring around it still pulls from the wider catalogue as before — this flag
-- only curates the center stage.
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'orbit_featured'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `products` ADD COLUMN `orbit_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT ''Cycles through the center of the homepage Orbit Ring when true'' AFTER `is_trending_pinned`',
  'SELECT ''orbit_featured already present on products'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
