-- ============================================================================
-- MIGRATION: Rename the "antiTarnishBanner" homepage section to
-- "certifiedBanner". The rendered copy was already fine (FSSAI/GMP claims,
-- "Purity You Can Verify") — only the jewelry-flavored section key/component
-- name needed to change (AntiTarnishBanner.jsx -> CertifiedBanner.jsx).
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run (an already-renamed or already-missing row makes this a no-op). A
-- fresh install from backend/schema.sql + seed.sql already has the
-- `certifiedBanner` row directly.
--
--   mysql -u root wellness_store < backend/migrations/012_rename_anti_tarnish_banner_section.sql
-- ============================================================================

SET NAMES utf8mb4;

-- Guarded so this can't collide with a `certifiedBanner` row that (for
-- whatever reason) already exists alongside the legacy `antiTarnishBanner`
-- one — section_key is the primary key, so an unguarded rename could violate
-- it in that edge case.
UPDATE site_section_toggles
SET section_key = 'certifiedBanner'
WHERE section_key = 'antiTarnishBanner'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT section_key FROM site_section_toggles) AS existing
    WHERE existing.section_key = 'certifiedBanner'
  );
