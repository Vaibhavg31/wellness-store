-- ============================================================================
-- MIGRATION: Replace "Purity in Motion" (generic 3D orbit) with two
-- goal-driven homepage sections — Ritual Builder (interactive quiz) and
-- Wellness Journey (24-hour scroll story).
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run. A fresh install from backend/schema.sql + seed.sql already has
-- these rows and never had `purityOrbit`.
--
--   mysql -u root wellness_store < backend/migrations/007_replace_purity_orbit_section.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @old_sort := (SELECT sort_order FROM site_section_toggles WHERE section_key = 'purityOrbit' LIMIT 1);
SET @bundles_sort := (SELECT sort_order FROM site_section_toggles WHERE section_key = 'bundles' LIMIT 1);
SET @max_sort := (SELECT COALESCE(MAX(sort_order), 0) FROM site_section_toggles);
SET @base_sort := COALESCE(@old_sort, @bundles_sort, @max_sort, 0);

DELETE FROM site_section_toggles WHERE section_key = 'purityOrbit';

INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'ritualBuilder', 1, @base_sort + 1
WHERE NOT EXISTS (SELECT 1 FROM site_section_toggles WHERE section_key = 'ritualBuilder');

INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'wellnessJourney', 1, @base_sort + 2
WHERE NOT EXISTS (SELECT 1 FROM site_section_toggles WHERE section_key = 'wellnessJourney');
