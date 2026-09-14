-- ============================================================================
-- MIGRATION: fix users table to match UserRepository's actual column names
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database -- safe to
-- re-run (uses IF NOT EXISTS / conditional column adds throughout).
--
--   mysql -u root wellness_store < backend/migrations/014_fix_users_table_columns.sql
--
-- Found while building the verified-purchase review feature: registering or
-- logging in as a customer threw a fatal "Unknown column email_verified"
-- (and would have kept throwing for phone_verified, is_blocked, last_login,
-- avatar, last_used_address_id right after) -- UserRepository has always
-- read/written these exact column names, but they were never in this
-- database, and schema.sql itself had the wrong names too (is_email_verified
-- / is_phone_verified, no is_ prefix is what the code actually uses), so
-- customer sign-up and sign-in have been completely broken. This migration
-- adds every column UserRepository expects, and carries over any existing
-- verification flags from the old is_-prefixed columns first.
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `avatar` varchar(2048) DEFAULT NULL AFTER `name`',
  'SELECT ''avatar already present on users'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone_verified'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `users`
     ADD COLUMN `phone_verified` tinyint(1) NOT NULL DEFAULT 0 AFTER `phone`,
     ADD COLUMN `phone_verified_at` datetime(6) DEFAULT NULL AFTER `phone_verified`,
     ADD COLUMN `email_verified` tinyint(1) NOT NULL DEFAULT 0 AFTER `google_id`,
     ADD COLUMN `email_verified_at` datetime(6) DEFAULT NULL AFTER `email_verified`,
     ADD COLUMN `is_blocked` tinyint(1) NOT NULL DEFAULT 0,
     ADD COLUMN `blocked_at` datetime(6) DEFAULT NULL,
     ADD COLUMN `last_login` datetime(6) DEFAULT NULL,
     ADD COLUMN `last_used_address_id` varchar(64) DEFAULT NULL',
  'SELECT ''phone_verified already present on users'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Carry over any existing flags from the old is_-prefixed columns, only if
-- those columns are actually still there (a truly fresh schema.sql-built
-- database created after this fix will not have them at all).
SET @old_col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_email_verified'
);
SET @sql := IF(@old_col_exists > 0,
  'UPDATE `users` SET `email_verified` = `is_email_verified` WHERE `is_email_verified` = 1',
  'SELECT ''no legacy is_email_verified column to migrate'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @old_col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_phone_verified'
);
SET @sql := IF(@old_col_exists > 0,
  'UPDATE `users` SET `phone_verified` = `is_phone_verified` WHERE `is_phone_verified` = 1',
  'SELECT ''no legacy is_phone_verified column to migrate'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- last_used_address_id references user_addresses.id, but nullably and
-- without a hard FK -- a deleted address should not be able to take a user
-- row down with it, the application layer already treats a stale id as
-- "no last address" and falls back gracefully.
