-- ============================================================================
-- MIGRATION: fix a pre-existing "Save" failure on the entire admin Content
-- Manager page (Content -> every tab)
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run (uses IF NOT EXISTS / conditional column adds throughout).
--
--   mysql -u root wellness_store < backend/migrations/017_add_updated_at_to_site_settings.sql
--
-- A fresh database created from backend/schema.sql already has this change
-- and does not need this file.
--
-- Found while investigating an unrelated "Failed to update settings" 500 on
-- PUT /api/settings: SettingsRepository::writeToDb() has always included
-- `updated_at` in its upsert (both the INSERT column list and the
-- ON DUPLICATE KEY UPDATE clause), but `site_settings` never actually had
-- that column — schema.sql's CREATE TABLE never defined it and no earlier
-- migration added it. Every single save from the admin Content page (Brand,
-- Branding, Homepage, About, Contact, SEO, Popup — all of it, not just one
-- field) has been failing with a MySQL "Unknown column" error since this
-- table was introduced, silently swallowed by the route's generic
-- try/catch, which just replied "Failed to update settings" with no detail.
-- ============================================================================

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'updated_at'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `site_settings` ADD COLUMN `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT ''updated_at already present on site_settings'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
