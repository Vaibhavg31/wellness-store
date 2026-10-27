-- ============================================================================
-- MIGRATION: homepage video banner
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run. A fresh install from backend/schema.sql already has these columns.
--
--   mysql -u root wellness_store < backend/migrations/005_add_video_banner.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'video_banner_url'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `site_settings`
     ADD COLUMN `video_banner_url` text DEFAULT NULL,
     ADD COLUMN `video_banner_poster` text DEFAULT NULL,
     ADD COLUMN `video_banner_title` varchar(255) DEFAULT NULL,
     ADD COLUMN `video_banner_subtitle` varchar(255) DEFAULT NULL,
     ADD COLUMN `video_banner_cta_label` varchar(255) DEFAULT NULL,
     ADD COLUMN `video_banner_cta_href` text DEFAULT NULL,
     ADD COLUMN `video_banner_fit` varchar(20) NOT NULL DEFAULT ''cover'',
     ADD COLUMN `video_banner_width` int(10) UNSIGNED DEFAULT NULL,
     ADD COLUMN `video_banner_height` int(10) UNSIGNED DEFAULT NULL',
  'SELECT ''video_banner columns already present on site_settings'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add the "videoBanner" homepage section toggle (enabled) if it isn't there
-- yet. The section itself renders nothing until a video is uploaded, so
-- it's safe to enable by default.
SET @exists := (SELECT COUNT(*) FROM site_section_toggles WHERE section_key = 'videoBanner');
SET @hero_sort := (SELECT sort_order FROM site_section_toggles WHERE section_key = 'hero' LIMIT 1);
SET @max_sort := (SELECT COALESCE(MAX(sort_order), 0) FROM site_section_toggles);
INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'videoBanner', 1, COALESCE(@hero_sort, 0) + 1
WHERE @exists = 0;

-- The insert above may collide in display order with whatever was already
-- second — that's fine, it's just a tiebreak; admins can drag-reorder
-- sections in Content Manager afterwards.
