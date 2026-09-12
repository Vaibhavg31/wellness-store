-- ============================================================================
-- WELLNESS STORE — DEMO SEED DATA
-- ============================================================================
-- Run AFTER schema.sql on the same empty `wellness_store` database.
-- Placeholder brand content ("Wellness Store") — replace with your real
-- brand name/copy/images later; structure and IDs are safe to keep.
-- ============================================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES
('protein', 'protein', 'Protein & Fitness', 'Whey, plant protein and fitness essentials to fuel recovery and muscle growth.', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80', 1, 1),
('ayurveda', 'ayurveda', 'Ayurveda', 'Traditional Ayurvedic formulations for everyday wellness, immunity and balance.', 'https://images.unsplash.com/photo-1611072172377-64f6764f5e77?w=600&q=80', 1, 2),
('immunity', 'immunity', 'Immunity', 'Daily immunity boosters built on trusted herbs and clinically studied actives.', 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=600&q=80', 1, 3),
('weight-management', 'weight-management', 'Weight Management', 'Clean-label formulas to support metabolism and healthy weight goals.', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80', 1, 4),
('vitamins', 'vitamins', 'Vitamins & Supplements', 'Targeted vitamins, minerals and multivitamins for everyday nutritional gaps.', 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&q=80', 1, 5),
('personal-care', 'personal-care', 'Personal Care', 'Natural, dermatologically-tested skin and hair care essentials.', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80', 1, 6);

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
INSERT INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES
('ws-protein-001', 'Plant Protein Isolate', 'WS-PRO-001', 1899.00, 2499.00, 24, 'protein', 4.7, 214, 'A 100% plant-based protein isolate blending pea and brown rice protein for complete amino acid coverage. Zero added sugar, easy to digest, and formulated for daily post-workout recovery.', 60, '1kg (33 servings)', 'powder', 'Chocolate', 1, 1, 0, '11523011000450', 1, 10, 1, 1, 1, 1, 1, 1, 1, '2026-01-05 10:00:00.000000', '2026-08-20 10:00:00.000000'),
('ws-ashwagandha-001', 'Ashwagandha KSM-66 Capsules', 'WS-ASH-001', 649.00, 899.00, 28, 'ayurveda', 4.8, 341, 'Clinically studied KSM-66 Ashwagandha root extract that helps the body manage stress, supports restful sleep, and aids recovery — backed by full-spectrum root-only extraction.', 120, '60 capsules', 'capsule', NULL, 1, 1, 1, '11523011000451', 1, 12, 0, 1, 1, 1, 1, 1, 1, '2026-01-10 10:00:00.000000', '2026-08-18 10:00:00.000000'),
('ws-immunity-001', 'Immunity Booster Juice', 'WS-IMM-001', 399.00, 549.00, 27, 'immunity', 4.6, 178, 'A daily shot of giloy, amla, and tulsi crafted to strengthen natural immunity without any added preservatives or artificial colour.', 80, '1L', 'liquid', 'Original', 1, 1, 1, '11523011000452', 0, 0, 1, 0, 1, 1, 1, 1, 1, '2026-02-01 10:00:00.000000', '2026-02-01 10:00:00.000000'),
('ws-multivitamin-001', 'Daily Multivitamin Gummies', 'WS-MVG-001', 549.00, 749.00, 27, 'vitamins', 4.5, 96, '13 essential vitamins and minerals packed into a tasty mixed-fruit gummy — no gelatin, no artificial sweeteners.', 150, '60 gummies', 'gummy', 'Mixed Fruit', 1, 1, 0, '11523011000453', 1, 8, 1, 0, 0, 1, 1, 1, 1, '2026-02-15 10:00:00.000000', '2026-02-15 10:00:00.000000'),
('ws-fatburner-001', 'Green Coffee Weight Management Capsules', 'WS-GCF-001', 799.00, 1099.00, 27, 'weight-management', 4.4, 62, 'Green coffee bean extract standardised for chlorogenic acid to support metabolism as part of a balanced diet and active lifestyle.', 45, '90 capsules', 'capsule', NULL, 1, 1, 0, '11523011000454', 0, 0, 0, 0, 0, 1, 1, 1, 1, '2026-03-01 10:00:00.000000', '2026-03-01 10:00:00.000000'),
('ws-facewash-001', 'Neem & Tea Tree Face Wash', 'WS-NTT-001', 349.00, 449.00, 22, 'personal-care', 4.6, 124, 'A gentle, sulphate-free face wash with neem and tea tree oil that clears everyday impurities without stripping your skin.', 200, '150ml', 'liquid', NULL, 1, 1, 0, NULL, 0, 0, 1, 1, 0, 1, 1, 1, 1, '2026-03-10 10:00:00.000000', '2026-03-10 10:00:00.000000');

-- ----------------------------------------------------------------------------
-- product_images
-- ----------------------------------------------------------------------------
INSERT INTO `product_images` (`product_id`, `url`, `sort_order`) VALUES
('ws-protein-001', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80', 0),
('ws-protein-001', 'https://images.unsplash.com/photo-1579722820258-996fdb4dc7de?w=800&q=80', 1),
('ws-ashwagandha-001', 'https://images.unsplash.com/photo-1611072172377-64f6764f5e77?w=800&q=80', 0),
('ws-ashwagandha-001', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80', 1),
('ws-immunity-001', 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=800&q=80', 0),
('ws-multivitamin-001', 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=800&q=80', 0),
('ws-fatburner-001', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80', 0),
('ws-facewash-001', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80', 0);

-- ----------------------------------------------------------------------------
-- product_badges
-- ----------------------------------------------------------------------------
INSERT INTO `product_badges` (`product_id`, `badge`, `sort_order`) VALUES
('ws-protein-001', 'FSSAI Certified', 0),
('ws-protein-001', 'Lab Tested', 1),
('ws-protein-001', 'No Added Sugar', 2),
('ws-protein-001', '100% Vegan', 3),
('ws-ashwagandha-001', 'FSSAI Certified', 0),
('ws-ashwagandha-001', '100% Ayurvedic', 1),
('ws-ashwagandha-001', 'Clinically Studied Extract', 2),
('ws-immunity-001', 'No Preservatives', 0),
('ws-immunity-001', 'FSSAI Certified', 1),
('ws-multivitamin-001', 'No Gelatin', 0),
('ws-multivitamin-001', 'FSSAI Certified', 1),
('ws-fatburner-001', 'Lab Tested', 0),
('ws-facewash-001', 'Sulphate Free', 0),
('ws-facewash-001', 'Dermatologically Tested', 1);

-- ----------------------------------------------------------------------------
-- product_tags
-- ----------------------------------------------------------------------------
INSERT INTO `product_tags` (`product_id`, `tag`, `sort_order`) VALUES
('ws-protein-001', 'Best Seller', 0),
('ws-protein-001', 'New', 1),
('ws-ashwagandha-001', 'Best Seller', 0),
('ws-immunity-001', 'New', 0),
('ws-multivitamin-001', 'New', 0),
('ws-facewash-001', 'Best Seller', 0),
('ws-facewash-001', 'New', 1);

-- ----------------------------------------------------------------------------
-- product_features
-- ----------------------------------------------------------------------------
INSERT INTO `product_features` (`product_id`, `feature`, `sort_order`) VALUES
('ws-protein-001', '24g Protein per Serving', 0),
('ws-protein-001', 'Pea + Brown Rice Blend', 1),
('ws-protein-001', 'Zero Added Sugar', 2),
('ws-protein-001', 'Easy to Digest Formula', 3),
('ws-ashwagandha-001', 'KSM-66 Full-Spectrum Root Extract', 0),
('ws-ashwagandha-001', '5% Withanolides Standardised', 1),
('ws-ashwagandha-001', 'Supports Stress & Sleep', 2),
('ws-facewash-001', 'Sulphate-Free Cleansing', 0),
('ws-facewash-001', 'Neem + Tea Tree Oil', 1);

-- ----------------------------------------------------------------------------
-- product_ingredients
-- ----------------------------------------------------------------------------
INSERT INTO `product_ingredients` (`product_id`, `name`, `benefit`, `image`, `sort_order`) VALUES
('ws-protein-001', 'Pea Protein Isolate', 'Rich in BCAAs, supports lean muscle recovery.', 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=300&q=80', 0),
('ws-protein-001', 'Brown Rice Protein', 'Complements pea protein for a complete amino acid profile.', NULL, 1),
('ws-ashwagandha-001', 'Ashwagandha (KSM-66)', 'Adaptogen that helps the body manage everyday stress.', 'https://images.unsplash.com/photo-1611072172377-64f6764f5e77?w=300&q=80', 0),
('ws-immunity-001', 'Giloy', 'Traditionally used to support the body''s natural defence.', NULL, 0),
('ws-immunity-001', 'Amla', 'Rich source of natural Vitamin C.', NULL, 1),
('ws-immunity-001', 'Tulsi', 'Adaptogenic herb known for immune and respiratory support.', NULL, 2);

-- ----------------------------------------------------------------------------
-- product_nutrition_facts
-- ----------------------------------------------------------------------------
INSERT INTO `product_nutrition_facts` (`product_id`, `serving_size`, `nutrient_name`, `value_per_serving`, `daily_value_percent`, `sort_order`) VALUES
('ws-protein-001', '30g (1 scoop)', 'Energy', '112 kcal', NULL, 0),
('ws-protein-001', '30g (1 scoop)', 'Protein', '24g', '43%', 1),
('ws-protein-001', '30g (1 scoop)', 'Carbohydrates', '3.2g', NULL, 2),
('ws-protein-001', '30g (1 scoop)', 'Total Sugar', '0.5g', NULL, 3),
('ws-protein-001', '30g (1 scoop)', 'Fat', '1.8g', NULL, 4),
('ws-ashwagandha-001', '2 capsules', 'Ashwagandha Root Extract (KSM-66)', '600mg', NULL, 0),
('ws-ashwagandha-001', '2 capsules', 'Withanolides', '30mg', NULL, 1);

-- ----------------------------------------------------------------------------
-- product_how_to_use
-- ----------------------------------------------------------------------------
INSERT INTO `product_how_to_use` (`product_id`, `step_number`, `instruction`) VALUES
('ws-protein-001', 1, 'Take 1 scoop (30g) with 200-250ml of water or milk.'),
('ws-protein-001', 2, 'Shake well and consume within 30 minutes post-workout.'),
('ws-protein-001', 3, 'Can also be taken between meals to meet daily protein needs.'),
('ws-ashwagandha-001', 1, 'Take 1 capsule twice daily after meals, or as directed by a physician.'),
('ws-ashwagandha-001', 2, 'For best results, use consistently for 8-12 weeks.'),
('ws-immunity-001', 1, 'Shake well. Take 30ml undiluted, preferably on an empty stomach in the morning.');

-- ----------------------------------------------------------------------------
-- product_faqs
-- ----------------------------------------------------------------------------
INSERT INTO `product_faqs` (`product_id`, `question`, `answer`, `sort_order`) VALUES
('ws-protein-001', 'Is this suitable for vegetarians?', 'Yes, this is a 100% plant-based, vegan-friendly protein with no animal-derived ingredients.', 0),
('ws-protein-001', 'When should I take this?', 'Best taken within 30 minutes after a workout, or any time of day to meet your daily protein target.', 1),
('ws-ashwagandha-001', 'How long until I notice results?', 'Most users report noticeable benefits in stress management and sleep quality within 4-6 weeks of consistent use.', 0),
('ws-ashwagandha-001', 'Is it safe for daily long-term use?', 'Yes, KSM-66 Ashwagandha is well studied for safety with continued daily use; consult your physician if you are on other medication.', 1);

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
INSERT INTO `reviews` (`id`, `product_id`, `name`, `email`, `rating`, `comment`, `avatar`, `is_approved`, `created_at`) VALUES
('review-1', 'ws-protein-001', 'Rohan Mehta', 'rohan@example.com', 5, 'Mixes well and doesn''t upset my stomach like whey used to. Chocolate flavour is genuinely tasty.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', 1, '2026-06-10 10:00:00.000000'),
('review-2', 'ws-ashwagandha-001', 'Sneha Kulkarni', 'sneha@example.com', 5, 'Noticed calmer evenings and better sleep within a few weeks. Will repurchase.', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&q=80', 1, '2026-06-20 10:00:00.000000'),
('review-3', 'ws-immunity-001', 'Arjun Verma', 'arjun@example.com', 4, 'Taste takes getting used to but I feel like I fall sick less often since starting this.', NULL, 1, '2026-07-02 10:00:00.000000');

-- ----------------------------------------------------------------------------
-- coupons
-- ----------------------------------------------------------------------------
INSERT INTO `coupons` (`id`, `code`, `title`, `description`, `type`, `value`, `min_order_amount`, `max_discount`, `max_uses`, `max_uses_per_user`, `usage_count`, `is_enabled`, `show_on_website`, `auto_apply`, `starts_at`, `expires_at`, `created_at`, `updated_at`) VALUES
('coupon-welcome10', 'WELCOME10', 'Welcome Offer', '10% off on your first order', 'percent', 10.00, 499.00, 150.00, 0, 1, 0, 1, 1, 0, NULL, NULL, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000');

-- ----------------------------------------------------------------------------
-- promo_banners
-- ----------------------------------------------------------------------------
INSERT INTO `promo_banners` (`id`, `title`, `subtitle`, `image`, `cta_label`, `cta_href`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES
('banner-1', 'Immunity Season Sale', 'Up to 30% off on immunity essentials', 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=1200&q=80', 'Shop Now', '/shop?category=immunity', 1, 1, '2026-08-01 00:00:00.000000', '2026-08-01 00:00:00.000000');

-- ----------------------------------------------------------------------------
-- site_nav_links
-- ----------------------------------------------------------------------------
INSERT INTO `site_nav_links` (`label`, `href`, `sort_order`) VALUES
('Home', '/', 0),
('Shop', '/shop', 1),
('Reviews', '/reviews', 2),
('About', '/about', 3),
('FAQ', '/faq', 4),
('Contact', '/contact', 5);

-- ----------------------------------------------------------------------------
-- site_marquee_items
-- ----------------------------------------------------------------------------
INSERT INTO `site_marquee_items` (`text`, `sort_order`) VALUES
('FSSAI & GMP Certified', 0),
('Lab Tested Purity', 1),
('No Added Preservatives', 2),
('Free Delivery Above ₹999', 3),
('7-Day Easy Returns', 4);

-- ----------------------------------------------------------------------------
-- site_hero_trust_badges
-- ----------------------------------------------------------------------------
INSERT INTO `site_hero_trust_badges` (`icon`, `label`, `sort_order`) VALUES
('shield', 'FSSAI Certified', 0),
('flask', 'Lab Tested', 1),
('leaf', '100% Natural', 2);

-- ----------------------------------------------------------------------------
-- site_hero_orbit_images
-- ----------------------------------------------------------------------------
INSERT INTO `site_hero_orbit_images` (`url`, `sort_order`) VALUES
('https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1200&q=90', 0),
('https://images.unsplash.com/photo-1611072172377-64f6764f5e77?w=1200&q=90', 1),
('https://images.unsplash.com/photo-1584362917165-526a968579e8?w=1200&q=90', 2),
('https://images.unsplash.com/photo-1550572017-edd951b55104?w=1200&q=90', 3);

-- ----------------------------------------------------------------------------
-- site_instagram_images
-- ----------------------------------------------------------------------------
INSERT INTO `site_instagram_images` (`url`, `sort_order`) VALUES
('https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80', 0),
('https://images.unsplash.com/photo-1611072172377-64f6764f5e77?w=400&q=80', 1),
('https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400&q=80', 2),
('https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&q=80', 3);

-- ----------------------------------------------------------------------------
-- site_about_story_paragraphs
-- ----------------------------------------------------------------------------
INSERT INTO `site_about_story_paragraphs` (`paragraph`, `sort_order`) VALUES
('Wellness Store was founded on a simple belief: everyday wellness shouldn''t mean compromising on purity or transparency.', 0),
('Every formulation is developed with FSSAI-certified manufacturing partners, lab-tested for purity, and built around ingredients you can actually pronounce.', 1);

-- ----------------------------------------------------------------------------
-- site_contact_faqs
-- ----------------------------------------------------------------------------
INSERT INTO `site_contact_faqs` (`question`, `answer`, `sort_order`) VALUES
('Are your products FSSAI certified?', 'Yes. Every product is manufactured in FSSAI-licensed facilities and carries its license number on the pack and product page.', 0),
('Are your supplements lab tested?', 'Yes, each batch is third-party lab tested for purity, heavy metals, and label-claim accuracy.', 1),
('What is your return policy?', 'We offer a 7-day return policy on unopened, unused products in original packaging.', 2),
('Do you offer Subscribe & Save?', 'Yes, select products support recurring delivery with an extra subscriber discount — look for the Subscribe & Save option on the product page.', 3);

-- ----------------------------------------------------------------------------
-- site_why_choose_benefits
-- ----------------------------------------------------------------------------
INSERT INTO `site_why_choose_benefits` (`icon`, `title`, `description`, `sort_order`) VALUES
('flask', 'Lab Tested Purity', 'Every batch is third-party tested for purity and label-claim accuracy.', 0),
('shield', 'FSSAI & GMP Certified', 'Manufactured in certified facilities that meet strict quality standards.', 1),
('leaf', 'Clean Label Ingredients', 'No unnecessary fillers, artificial colours, or hidden additives.', 2),
('truck', 'Fast, Reliable Delivery', 'Pan-India delivery with real-time order tracking.', 3);

-- ----------------------------------------------------------------------------
-- site_section_toggles
-- ----------------------------------------------------------------------------
INSERT INTO `site_section_toggles` (`section_key`, `is_enabled`) VALUES
('hero', 1),
('brandMarquee', 1),
('categories', 1),
('featured', 1),
('trending', 1),
('whyChoose', 1),
('qualityBanner', 1),
('banners', 1),
('reviews', 1),
('instagram', 0),
('newsletter', 1),
('promoBanner', 1);

-- ----------------------------------------------------------------------------
-- site_settings  (single row)
-- ----------------------------------------------------------------------------
INSERT INTO `site_settings` (
  `id`, `site_name`, `brand_name`, `brand_short`, `brand_tagline`, `brand_description`, `logo`,
  `contact_email`, `contact_whatsapp_number`, `contact_whatsapp_display`, `contact_whatsapp_default_message`, `contact_business_hours`,
  `social_instagram_handle`, `social_instagram_url`, `social_instagram_tagline`,
  `delivery_fee`, `delivery_free_threshold`, `delivery_return_days`,
  `payments_cod_enabled`, `payments_online_payment_enabled`,
  `services_email_enabled`, `services_otp_enabled`, `services_google_sign_in_enabled`,
  `promo_enabled`, `promo_text`, `promo_code`, `promo_suffix`, `promo_href`,
  `hero_badge`, `hero_headline`, `hero_headline_accent`, `hero_subheadline`,
  `hero_primary_cta_label`, `hero_primary_cta_href`, `hero_secondary_cta_label`, `hero_secondary_cta_href`,
  `hero_featured_product_id`, `hero_scroll_cue`, `hero_video_url`, `hero_video_poster`,
  `featured_collection_title`, `featured_styles_title`, `featured_view_all_label`, `featured_product_count`,
  `why_choose_subtitle`, `why_choose_title`, `why_choose_description`, `why_choose_cta_text`,
  `quality_promise_badge`, `quality_promise_title`, `quality_promise_description`, `quality_promise_cta_label`, `quality_promise_cta_href`
) VALUES (
  1, 'Wellness Store', 'Wellness Store', 'WS', 'Everyday Wellness, Honestly Made', 'Wellness Store is a placeholder wellness/nutrition D2C brand template — swap in your real brand name, copy and imagery.', '',
  'hello@wellnessstore.example', '910000000000', '+91 00000 00000', 'Hi! I have a question about a product.', 'Mon-Sat, 10am-7pm IST',
  'wellnessstore', 'https://instagram.com/wellnessstore', 'Follow us for wellness tips and behind-the-scenes',
  49.00, 999.00, 7,
  1, 1,
  1, 1, 1,
  1, 'Use code', 'WELCOME10', 'for 10% off your first order', '/shop',
  'FSSAI & Lab Tested', 'Wellness, Backed by', 'Science', 'Clean-label supplements and nutrition, honestly sourced and lab tested for purity.',
  'Shop Now', '/shop', 'Our Story', '/about',
  'ws-protein-001', 'Scroll to explore', '', '',
  'Featured Collection', 'Trending Now', 'View All', 8,
  'Why Choose Us', 'Wellness You Can Trust', 'From sourcing to lab testing, every step is built around transparency.', 'Learn more about our process',
  'FSSAI & GMP Certified', 'Purity You Can Verify', 'Every product is manufactured in certified facilities and third-party lab tested before it reaches you.', 'See Our Certifications', '/about'
);

COMMIT;
