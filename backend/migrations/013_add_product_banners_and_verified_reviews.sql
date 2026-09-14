-- ============================================================================
-- MIGRATION: product-page banners + verified-purchase photo reviews
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run (uses IF NOT EXISTS / conditional column adds throughout).
--
--   mysql -u root wellness_store < backend/migrations/013_add_product_banners_and_verified_reviews.sql
--
-- A fresh database created from backend/schema.sql already has these changes
-- and does not need this file.
--
-- Also fixes a pre-existing bug found while building this: BannerRepository
-- has always read/written a `display_target` column that was never actually
-- in schema.sql or any prior migration — every `/api/banners` request
-- (slider, stacked, or plain) was failing with a 500. This migration adds
-- it for real, plus 'product' as a new target value for this feature.
-- ============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- promo_banners: the missing display_target column, plus product scoping
-- ---------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promo_banners' AND COLUMN_NAME = 'display_target'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `promo_banners` ADD COLUMN `display_target` enum(''slider'',''stacked'',''both'',''product'') NOT NULL DEFAULT ''both'' COMMENT ''slider/stacked/both for homepage sections, product for a single product page'' AFTER `cta_href`',
  'SELECT ''display_target already present on promo_banners'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Already-existing installs that somehow have display_target without
-- 'product' in the enum (shouldn't happen given the column was just added
-- above, but keeps this migration safe if display_target was added by hand
-- before this file existed).
ALTER TABLE `promo_banners` MODIFY COLUMN `display_target` enum('slider','stacked','both','product') NOT NULL DEFAULT 'both';

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promo_banners' AND COLUMN_NAME = 'product_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `promo_banners` ADD COLUMN `product_id` varchar(64) DEFAULT NULL COMMENT ''Set together with display_target=product to scope this banner to one product page instead of the homepage'' AFTER `display_target`, ADD KEY `idx_promo_banners_product_id` (`product_id`)',
  'SELECT ''product_id already present on promo_banners'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK added separately (and only if not already present) since MySQL cannot
-- conditionally add a named constraint in one ADD COLUMN statement.
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promo_banners' AND CONSTRAINT_NAME = 'fk_promo_banners_product'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `promo_banners` ADD CONSTRAINT `fk_promo_banners_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE',
  'SELECT ''fk_promo_banners_product already present'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- reviews: who left it (for "only buyers can review") + photos
-- ---------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'user_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `reviews`
     ADD COLUMN `user_id` varchar(64) DEFAULT NULL COMMENT ''Reviewer account id -- reviews require sign-in, so this is set on every new review'' AFTER `product_id`,
     ADD COLUMN `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 0 COMMENT ''True when the reviewer has a non-cancelled order containing this product'' AFTER `rating`,
     ADD COLUMN `images` text DEFAULT NULL COMMENT ''JSON array of /uploads/... photo paths the reviewer attached'',
     ADD KEY `idx_reviews_user_id` (`user_id`)',
  'SELECT ''user_id already present on reviews'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- One review per customer per product -- resubmitting should edit, not spam
-- a second row (enforced again at the application layer with a clear error,
-- this is the data-integrity backstop).
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND INDEX_NAME = 'uq_reviews_user_product'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE `reviews` ADD UNIQUE KEY `uq_reviews_user_product` (`user_id`, `product_id`)',
  'SELECT ''uq_reviews_user_product already present'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
