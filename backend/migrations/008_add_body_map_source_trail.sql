-- ============================================================================
-- MIGRATION: Add two new homepage sections — Body Map (scroll-driven zone
-- callouts on an anatomical figure) and The Source Trail (scroll-through
-- ingredient sourcing map) — placed right after Wellness Journey.
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run. A fresh install from backend/schema.sql + seed.sql already has
-- these rows.
--
--   mysql -u root wellness_store < backend/migrations/008_add_body_map_source_trail.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @wj_sort := (SELECT sort_order FROM site_section_toggles WHERE section_key = 'wellnessJourney' LIMIT 1);
SET @max_sort := (SELECT COALESCE(MAX(sort_order), 0) FROM site_section_toggles);
SET @base_sort := COALESCE(@wj_sort, @max_sort, 0);

-- Make room right after wellnessJourney for the two new rows.
UPDATE site_section_toggles
SET sort_order = sort_order + 2
WHERE sort_order > @base_sort;

INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'bodyMap', 1, @base_sort + 1
WHERE NOT EXISTS (SELECT 1 FROM site_section_toggles WHERE section_key = 'bodyMap');

INSERT INTO site_section_toggles (section_key, is_enabled, sort_order)
SELECT 'sourceTrail', 1, @base_sort + 2
WHERE NOT EXISTS (SELECT 1 FROM site_section_toggles WHERE section_key = 'sourceTrail');
