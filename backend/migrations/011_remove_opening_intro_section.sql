-- ============================================================================
-- MIGRATION: Remove "Opening Intro" — a cinematic figure section shown
-- before the hero banner (jewelry-brand-era three.js figure rig). The
-- component and its section renderer are gone from the codebase; this drops
-- its now-orphaned site_section_toggles row so it no longer shows up as a
-- dead entry in the admin's Homepage Sections list.
-- ============================================================================
-- Run this once against your EXISTING `wellness_store` database — safe to
-- re-run (DELETE of an already-missing row is a no-op). A fresh install from
-- backend/schema.sql + seed.sql never has this row to begin with.
--
--   mysql -u root wellness_store < backend/migrations/011_remove_opening_intro_section.sql
-- ============================================================================

SET NAMES utf8mb4;

DELETE FROM site_section_toggles WHERE section_key = 'openingIntro';
