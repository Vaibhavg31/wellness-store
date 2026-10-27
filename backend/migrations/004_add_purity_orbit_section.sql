-- ============================================================================
-- MIGRATION: "Purity in Motion" homepage 3D section toggle
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run. A fresh install from backend/schema.sql + seed.sql already has
-- this row.
--
--   mysql -u root wellness_store < backend/migrations/004_add_purity_orbit_section.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @exists := (SELECT COUNT(*) FROM site_section_toggles WHERE section_key = 'purityOrbit');
SET @bundles_sort := (SELECT sort_order FROM site_section_toggles WHERE section_key = 'bundles' LIMIT 1);
SET @max_sort := (SELECT COALESCE(MAX(sort_order), 0) FROM site_section_toggles);
INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'purityOrbit', 1, COALESCE(@bundles_sort, @max_sort) + 1
WHERE @exists = 0;
