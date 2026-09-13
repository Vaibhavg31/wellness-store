-- ============================================================================
-- OPTIONAL: fill in a sample video banner so you can see the section in
-- action before uploading your own video.
-- ============================================================================
-- Requires 005_add_video_banner.sql to have been run first.
--
--   mysql -u root wellness_store < backend/migrations/006_preview_video_banner.sql
--
-- The clip is a small (1.1MB), CC0-licensed sample video hosted by MDN
-- (Mozilla) — safe to use, but it's a generic flower close-up, not your
-- brand. Swap it for your own anytime from
-- Content Manager -> Homepage -> Video Banner in the admin panel — that's
-- the normal way to change it; this file is only a one-time preview.
-- ============================================================================

SET NAMES utf8mb4;

UPDATE site_settings SET
  video_banner_url      = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  video_banner_poster   = 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=80',
  video_banner_title    = 'Wellness, Naturally',
  video_banner_subtitle = 'Sample Video Banner',
  video_banner_cta_label = 'Shop Now',
  video_banner_cta_href  = '/shop',
  video_banner_fit      = 'cover',
  video_banner_width    = 960,
  video_banner_height   = 540
WHERE id = 1;
