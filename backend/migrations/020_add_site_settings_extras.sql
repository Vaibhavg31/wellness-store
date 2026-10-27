SET NAMES utf8mb4;

-- Flexible JSON bucket for newer, admin-editable storefront options (delivery estimate, health disclaimer,
-- rotating announcements, restock-reminder timing, ...) so each one doesn't need its own column/migration.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'extras_json'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `site_settings` ADD COLUMN `extras_json` longtext DEFAULT NULL COMMENT ''JSON: newer storefront options'' AFTER `popup_frequency`',
  'SELECT ''extras_json already present on site_settings'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
