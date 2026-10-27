-- ============================================================================
-- MIGRATION: "Opening Intro" — a cinematic figure section shown before the
-- hero banner. Inserted at the very front of the section order.
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run. A fresh install from backend/seed.sql already has this row.
--
--   mysql -u root wellness_store < backend/migrations/010_add_opening_intro_section.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @exists := (SELECT COUNT(*) FROM site_section_toggles WHERE section_key = 'openingIntro');
SET @min_sort := (SELECT COALESCE(MIN(sort_order), 1) FROM site_section_toggles);

-- Make room ahead of the current first section.
UPDATE site_section_toggles
SET sort_order = sort_order + 1
WHERE @exists = 0;

INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'openingIntro', 1, @min_sort
WHERE @exists = 0;
