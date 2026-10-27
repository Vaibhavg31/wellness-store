-- ============================================================================
-- MIGRATION: repeat-customer / new-customer targeting for coupons
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run (uses IF NOT EXISTS / conditional column adds throughout).
--
--   mysql -u root wellness_store < backend/migrations/018_add_coupon_customer_audience.sql
--
-- A fresh database created from backend/schema.sql already has this change
-- and does not need this file.
--
-- Lets the admin restrict a coupon (auto-applied or code-entry) to either
-- first-time customers or repeat customers, instead of every coupon being
-- open to everyone — e.g. an automatic "Welcome back" discount that only
-- kicks in once a signed-in customer already has an order on file, with a
-- configurable minimum order count so it can mean "any repeat customer" or
-- "reward my 3rd-time-or-more buyers" depending on how the admin sets it.
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'audience'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `coupons` ADD COLUMN `audience` enum(''everyone'',''new_customers'',''returning_customers'') NOT NULL DEFAULT ''everyone'' COMMENT ''Who this coupon is open to -- checked against the signed-in customer''''s past order history'' AFTER `auto_apply`',
  'SELECT ''audience already present on coupons'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'min_previous_orders'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `coupons` ADD COLUMN `min_previous_orders` int(10) unsigned NOT NULL DEFAULT 1 COMMENT ''Only meaningful when audience = returning_customers -- how many non-cancelled past orders the customer must already have'' AFTER `audience`',
  'SELECT ''min_previous_orders already present on coupons'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
