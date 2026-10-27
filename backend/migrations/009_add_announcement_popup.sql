-- ============================================================================
-- MIGRATION: site-wide on-load announcement popup (product / coupon /
-- festival / info), admin-managed from Content Manager. Off by default —
-- an admin has to explicitly enable and fill it in.
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run. A fresh install from backend/schema.sql already has these columns.
--
--   mysql -u root wellness_store < backend/migrations/009_add_announcement_popup.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'popup_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `site_settings`
     ADD COLUMN `popup_enabled` tinyint(1) NOT NULL DEFAULT 0,
     ADD COLUMN `popup_type` varchar(20) NOT NULL DEFAULT ''info'',
     ADD COLUMN `popup_title` varchar(255) NOT NULL DEFAULT '''',
     ADD COLUMN `popup_message` text NOT NULL,
     ADD COLUMN `popup_image` text NOT NULL,
     ADD COLUMN `popup_cta_label` varchar(255) NOT NULL DEFAULT '''',
     ADD COLUMN `popup_cta_href` text NOT NULL,
     ADD COLUMN `popup_coupon_code` varchar(50) NOT NULL DEFAULT '''',
     ADD COLUMN `popup_product_id` varchar(64) DEFAULT NULL,
     ADD COLUMN `popup_delay_seconds` int(10) UNSIGNED NOT NULL DEFAULT 2,
     ADD COLUMN `popup_frequency` varchar(20) NOT NULL DEFAULT ''session''',
  'SELECT ''popup columns already present on site_settings'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
