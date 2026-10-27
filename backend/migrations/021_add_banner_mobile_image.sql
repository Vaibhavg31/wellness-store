SET NAMES utf8mb4;

-- Optional portrait/square artwork for phones. The full-width banner slider shows it instead of the wide desktop
-- image on small screens (a 21:8 banner cropped to a phone is unreadable).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promo_banners' AND COLUMN_NAME = 'mobile_image'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `promo_banners` ADD COLUMN `mobile_image` varchar(2048) DEFAULT NULL COMMENT ''Optional phone-sized artwork'' AFTER `image`',
  'SELECT ''mobile_image already present on promo_banners'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
