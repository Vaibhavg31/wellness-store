-- =====================================================================================================
-- Chikit storefront database — one file: structure + starter shop content.
--
-- HOW TO USE (any one of these):
--   1. phpMyAdmin:  Import tab -> choose this file -> Go. (No need to create the database first.)
--   2. Terminal:    mysql -u root -p < database/chikit.sql
--   3. npm:         npm run db:setup          (reads the connection from config.json)
--
-- Safe to run more than once: tables are created only if missing and rows are inserted only if absent, so
-- existing data is never overwritten or dropped.
--
-- Contains: every table (empty where private/runtime), plus starter content — categories, products with their
-- details, bundles, coupons (WELCOME10 / WELCOMEBACK10), banners, sample reviews and all site/homepage settings.
-- Contains NO customer data: no users, orders, addresses, subscribers, tokens or logs.
-- Database name: wellness_store (matches config.json -> DB_NAME). Charset utf8mb4.
-- =====================================================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

CREATE DATABASE IF NOT EXISTS `wellness_store` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `wellness_store`;

-- ---------------------------------------------------------------------------------------------------------------
-- STRUCTURE
-- ---------------------------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `bundle_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bundle_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_bundle_items_bundle_id` (`bundle_id`),
  KEY `idx_bundle_items_product_id` (`product_id`),
  CONSTRAINT `fk_bundle_items_bundle` FOREIGN KEY (`bundle_id`) REFERENCES `bundles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Products (and quantities) that make up a bundle';
CREATE TABLE IF NOT EXISTS `bundles` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subtitle` varchar(255) DEFAULT NULL COMMENT 'e.g. "Frequently Bought Together", "Complete your routine"',
  `description` text DEFAULT NULL,
  `image` varchar(2048) DEFAULT NULL COMMENT 'Optional cover image; falls back to a collage of item images',
  `discount_type` enum('percent','flat') NOT NULL DEFAULT 'percent',
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Percent off (0-100) or a flat rupee amount off the combined item price',
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bundles_is_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Multi-product bundle offers — price is computed live from current item prices minus the discount, so it never drifts out of sync';
CREATE TABLE IF NOT EXISTS `categories` (
  `id` varchar(64) NOT NULL,
  `slug` varchar(64) NOT NULL,
  `label` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(2048) DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 99,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_is_published` (`is_published`),
  KEY `idx_categories_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product categories for shop navigation and filtering (e.g. Protein, Ayurveda, Immunity)';
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` varchar(64) NOT NULL,
  `code` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('percent','flat','free_delivery') NOT NULL DEFAULT 'percent',
  `value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `max_discount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Cap for percent coupons; 0 = no cap',
  `max_uses` int(10) unsigned NOT NULL DEFAULT 0 COMMENT '0 = unlimited global uses',
  `max_uses_per_user` int(10) unsigned NOT NULL DEFAULT 0 COMMENT '0 = unlimited per user',
  `usage_count` int(10) unsigned NOT NULL DEFAULT 0,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `show_on_website` tinyint(1) NOT NULL DEFAULT 1,
  `auto_apply` tinyint(1) NOT NULL DEFAULT 0,
  `audience` enum('everyone','new_customers','returning_customers') NOT NULL DEFAULT 'everyone' COMMENT 'Who this coupon is open to -- checked against the signed-in customer''s past order history',
  `min_previous_orders` int(10) unsigned NOT NULL DEFAULT 1 COMMENT 'Only meaningful when audience = returning_customers -- how many non-cancelled past orders the customer must already have',
  `starts_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Discount and free-delivery coupon codes';
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_email_verification_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One-time email address verification tokens';
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contact page feedback messages';
CREATE TABLE IF NOT EXISTS `media_library` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(500) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size_bytes` int(10) unsigned DEFAULT NULL,
  `width` int(10) unsigned DEFAULT NULL,
  `height` int(10) unsigned DEFAULT NULL,
  `alt_text` varchar(255) NOT NULL DEFAULT '',
  `uploaded_by` varchar(100) NOT NULL DEFAULT 'admin',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_media_url` (`url`(255)),
  KEY `idx_media_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin media library';
CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
  `id` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `source` varchar(100) NOT NULL DEFAULT 'website',
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_newsletter_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Newsletter email subscribers';
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` varchar(64) NOT NULL,
  `product_id` varchar(64) DEFAULT NULL COMMENT 'NULL or custom-* when not a catalog product',
  `variant_id` varchar(64) DEFAULT NULL COMMENT 'product_variants.id at time of purchase; NULL when the product has no variants',
  `variant_label` varchar(150) DEFAULT NULL COMMENT 'Snapshot of the variant label (e.g. "3 Month Supply") so it survives later edits/deletes',
  `title` varchar(500) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(10) unsigned NOT NULL DEFAULT 1,
  `image` varchar(2048) DEFAULT NULL,
  `is_subscription` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Subscribe & Save line item',
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `bundle_id` varchar(64) DEFAULT NULL COMMENT 'bundles.id when this line was purchased as part of a bundle offer',
  `bundle_title` varchar(255) DEFAULT NULL COMMENT 'Snapshot of the bundle title so it survives later edits/deletes',
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items on an order with price snapshot at time of purchase';
CREATE TABLE IF NOT EXISTS `order_shipping` (
  `order_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `landmark` varchar(255) DEFAULT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) DEFAULT NULL,
  `pincode` varchar(10) NOT NULL,
  PRIMARY KEY (`order_id`),
  CONSTRAINT `fk_order_shipping_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Shipping address snapshot captured at order placement';
CREATE TABLE IF NOT EXISTS `order_status_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` varchar(64) NOT NULL,
  `status` varchar(50) NOT NULL,
  `changed_at` datetime(6) NOT NULL,
  `changed_by` enum('system','admin','customer') NOT NULL DEFAULT 'system',
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_status_history_order_id` (`order_id`),
  CONSTRAINT `fk_order_status_history_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail of order status transitions';
CREATE TABLE IF NOT EXISTS `orders` (
  `id` varchar(64) NOT NULL,
  `order_source` enum('website','direct') NOT NULL DEFAULT 'website',
  `user_id` varchar(64) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_saved` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `status` enum('placed','confirmed','packed','shipped','delivered','cancelled','returned','out_for_delivery') NOT NULL DEFAULT 'placed',
  `payment` enum('cod','razorpay','offline','pending') NOT NULL,
  `payment_status` enum('cod','pending','paid','failed') NOT NULL DEFAULT 'pending',
  `coupon_code` varchar(50) DEFAULT NULL,
  `coupon_id` varchar(64) DEFAULT NULL,
  `coupon_type` enum('percent','flat','free_delivery') DEFAULT NULL,
  `razorpay_order_id` varchar(100) DEFAULT NULL,
  `razorpay_payment_id` varchar(100) DEFAULT NULL,
  `razorpay_signature` varchar(128) DEFAULT NULL,
  `razorpay_amount` int(10) unsigned DEFAULT NULL COMMENT 'Amount in paise',
  `tracking_number` varchar(255) DEFAULT NULL,
  `carrier` varchar(255) DEFAULT NULL,
  `estimated_delivery` varchar(255) DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `refund_status` varchar(50) DEFAULT NULL,
  `refunded_at` datetime(6) DEFAULT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `cancelled_at` datetime(6) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer and admin-created orders';
CREATE TABLE IF NOT EXISTS `otp_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `logged_at` datetime(6) NOT NULL,
  `action` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `skip_verify` tinyint(1) DEFAULT NULL,
  `otp_mode` varchar(20) DEFAULT NULL,
  `http_code` int(11) DEFAULT NULL,
  `msg91_code` varchar(20) DEFAULT NULL,
  `request_id` varchar(100) DEFAULT NULL,
  `server_ip` varchar(45) DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response`)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTP send/verify debug and audit log';
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_password_reset_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One-time password reset tokens';
CREATE TABLE IF NOT EXISTS `product_badges` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `badge` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_badges_product_id` (`product_id`),
  CONSTRAINT `fk_product_badges_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Per-product trust badges (e.g. FSSAI Certified, Lab Tested, No Added Sugar)';
CREATE TABLE IF NOT EXISTS `product_faqs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_faqs_product_id` (`product_id`),
  CONSTRAINT `fk_product_faqs_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product-specific FAQ entries shown on the PDP';
CREATE TABLE IF NOT EXISTS `product_features` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `feature` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_features_product_id` (`product_id`),
  CONSTRAINT `fk_product_features_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bullet-point feature list on product detail pages';
CREATE TABLE IF NOT EXISTS `product_how_to_use` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `step_number` int(11) NOT NULL DEFAULT 1,
  `instruction` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_how_to_use_product_id` (`product_id`),
  CONSTRAINT `fk_product_how_to_use_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Step-by-step dosage / usage instructions per product';
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `url` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_images_product_id` (`product_id`),
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Primary product gallery images';
CREATE TABLE IF NOT EXISTS `product_ingredients` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `benefit` text DEFAULT NULL COMMENT 'Short benefit description, e.g. Ashwagandha - Reduces stress & supports recovery',
  `image` varchar(2048) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_ingredients_product_id` (`product_id`),
  CONSTRAINT `fk_product_ingredients_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Key ingredients shown on product detail pages with their benefits';
CREATE TABLE IF NOT EXISTS `product_nutrition_facts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `serving_size` varchar(100) DEFAULT NULL COMMENT 'e.g. 30g (1 scoop) — repeated per row for display simplicity',
  `nutrient_name` varchar(100) NOT NULL COMMENT 'e.g. Protein, Carbohydrates, Calories, Sugar, Sodium',
  `value_per_serving` varchar(50) NOT NULL COMMENT 'e.g. 24g, 110kcal',
  `daily_value_percent` varchar(20) DEFAULT NULL COMMENT 'e.g. 12% (RDA), NULL if not applicable',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_nutrition_product_id` (`product_id`),
  CONSTRAINT `fk_product_nutrition_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nutrition label / supplement facts panel, one row per nutrient';
CREATE TABLE IF NOT EXISTS `product_tags` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `tag` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_tags_product_id` (`product_id`),
  CONSTRAINT `fk_product_tags_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Display tags on product cards (e.g. New, Best Seller, Sale)';
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `label` varchar(150) NOT NULL COMMENT 'e.g. "1 Month Supply", "3 Month Supply"',
  `net_quantity` varchar(100) DEFAULT NULL COMMENT 'e.g. 200g, 60 capsules, 500ml — this variant''s pack size',
  `image` varchar(2048) DEFAULT NULL COMMENT 'Optional override photo (e.g. a different color/flavor); NULL = reuse the product''s own photos',
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` int(11) NOT NULL DEFAULT 0 COMMENT 'Percent discount; may be admin override',
  `stock` int(11) NOT NULL DEFAULT 0,
  `sku` varchar(100) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Pre-selected variant on the product page',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_variants_product_id` (`product_id`),
  CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Optional pack-size/duration variants for a product (e.g. 1/3/6 month supply), each with its own price and stock';
CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(64) NOT NULL,
  `title` varchar(500) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) NOT NULL,
  `discount` int(11) NOT NULL DEFAULT 0 COMMENT 'Percent discount; may be admin override',
  `category_id` varchar(64) NOT NULL,
  `rating` decimal(2,1) NOT NULL DEFAULT 0.0,
  `review_count` int(10) unsigned NOT NULL DEFAULT 0,
  `description` text NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `net_quantity` varchar(100) DEFAULT NULL COMMENT 'e.g. 200g, 60 capsules, 500ml',
  `form` enum('powder','capsule','tablet','liquid','gummy','oil','bar','other') NOT NULL DEFAULT 'other',
  `flavor` varchar(100) DEFAULT NULL,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 1,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `is_ayurvedic` tinyint(1) NOT NULL DEFAULT 0,
  `fssai_license_no` varchar(50) DEFAULT NULL,
  `subscription_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `subscription_discount_percent` int(11) NOT NULL DEFAULT 0,
  `is_new` tinyint(1) NOT NULL DEFAULT 0,
  `is_best_seller` tinyint(1) NOT NULL DEFAULT 0,
  `is_trending_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `orbit_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Cycles through the center of the homepage Orbit Ring when true',
  `orbit_sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Display order within the curated Orbit Ring list (lower first)',
  `show_trust_badges` tinyint(1) NOT NULL DEFAULT 1,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `cod_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `online_payment_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_products_category_id` (`category_id`),
  KEY `idx_products_is_published` (`is_published`),
  KEY `idx_products_is_best_seller` (`is_best_seller`),
  KEY `idx_products_is_new` (`is_new`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product catalog';
CREATE TABLE IF NOT EXISTS `promo_banners` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `subtitle` varchar(500) DEFAULT NULL,
  `image` varchar(2048) NOT NULL,
  `mobile_image` varchar(2048) DEFAULT NULL COMMENT 'Optional phone-sized artwork',
  `cta_label` varchar(100) DEFAULT NULL,
  `cta_href` varchar(500) DEFAULT NULL,
  `display_target` enum('slider','stacked','both','product') NOT NULL DEFAULT 'both',
  `product_id` varchar(64) DEFAULT NULL COMMENT 'Set together with display_target=product to scope this banner to one product page instead of the homepage',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 99,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_promo_banners_product_id` (`product_id`),
  CONSTRAINT `fk_promo_banners_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Homepage promotional banners';
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `rate_key` varchar(255) NOT NULL,
  `count` int(10) unsigned NOT NULL DEFAULT 0,
  `reset_at` datetime(6) NOT NULL,
  PRIMARY KEY (`rate_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Login/OTP/registration rate limiter counters';
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL COMMENT 'Reviewer account id -- reviews require sign-in, so this is set on every new review',
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `rating` tinyint(3) unsigned NOT NULL DEFAULT 5,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'True when the reviewer has a non-cancelled order containing this product',
  `comment` text NOT NULL,
  `avatar` varchar(2048) DEFAULT NULL,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  `images` text DEFAULT NULL COMMENT 'JSON array of /uploads/... photo paths the reviewer attached',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_product` (`user_id`,`product_id`),
  KEY `idx_reviews_product_id` (`product_id`),
  KEY `idx_reviews_is_approved` (`is_approved`),
  KEY `idx_reviews_user_id` (`user_id`),
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product reviews';
CREATE TABLE IF NOT EXISTS `site_about_story_paragraphs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `paragraph` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='About page story body paragraphs';
CREATE TABLE IF NOT EXISTS `site_contact_faqs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='FAQ entries for the site-wide FAQ / contact page';
CREATE TABLE IF NOT EXISTS `site_hero_orbit_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Orbiting product images on homepage hero';
CREATE TABLE IF NOT EXISTS `site_hero_orbit_products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Manually chosen products for homepage hero orbit';
CREATE TABLE IF NOT EXISTS `site_hero_trust_badges` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `icon` varchar(50) NOT NULL COMMENT 'Icon key e.g. shield, star, leaf, flask',
  `label` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trust badges displayed on homepage hero';
CREATE TABLE IF NOT EXISTS `site_instagram_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Instagram section grid images';
CREATE TABLE IF NOT EXISTS `site_marquee_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `text` varchar(500) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Scrolling brand marquee text items';
CREATE TABLE IF NOT EXISTS `site_nav_links` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `href` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main navigation links';
CREATE TABLE IF NOT EXISTS `site_section_toggles` (
  `section_key` varchar(64) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`section_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Homepage section visibility flags';
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `site_name` varchar(255) NOT NULL,
  `brand_name` varchar(255) NOT NULL,
  `brand_short` varchar(100) NOT NULL,
  `brand_tagline` varchar(500) NOT NULL,
  `brand_description` text NOT NULL,
  `logo` text NOT NULL,
  `favicon` text NOT NULL,
  `theme_primary_color` varchar(20) NOT NULL DEFAULT '#0F5132',
  `theme_primary_light` varchar(20) NOT NULL DEFAULT '#15803D',
  `theme_primary_dark` varchar(20) NOT NULL DEFAULT '#0A3D25',
  `theme_accent_color` varchar(20) NOT NULL DEFAULT '#D97706',
  `theme_accent_light` varchar(20) NOT NULL DEFAULT '#F59E0B',
  `theme_blush_color` varchar(20) NOT NULL DEFAULT '#FDE68A',
  `theme_background_color` varchar(20) NOT NULL DEFAULT '#FBF9F4',
  `theme_text_color` varchar(20) NOT NULL DEFAULT '#1C1A16',
  `theme_font_heading` varchar(255) NOT NULL DEFAULT '"Fraunces", Georgia, serif',
  `theme_font_body` varchar(255) NOT NULL DEFAULT '"Inter", system-ui, sans-serif',
  `contact_email` varchar(255) NOT NULL,
  `contact_whatsapp_number` varchar(20) NOT NULL,
  `contact_whatsapp_display` varchar(50) NOT NULL,
  `contact_whatsapp_default_message` text NOT NULL,
  `contact_business_hours` varchar(255) NOT NULL,
  `social_instagram_handle` varchar(100) NOT NULL,
  `social_instagram_url` text NOT NULL,
  `social_instagram_tagline` text NOT NULL,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT 49.00,
  `delivery_free_threshold` decimal(10,2) NOT NULL DEFAULT 999.00,
  `delivery_return_days` int(10) unsigned NOT NULL DEFAULT 7,
  `payments_cod_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `payments_online_payment_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `services_email_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `services_otp_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `services_google_sign_in_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `promo_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `promo_text` text NOT NULL,
  `promo_code` varchar(50) NOT NULL,
  `promo_suffix` text NOT NULL,
  `promo_href` text NOT NULL,
  `hero_badge` varchar(255) NOT NULL,
  `hero_headline` varchar(255) NOT NULL,
  `hero_headline_accent` varchar(255) NOT NULL,
  `hero_subheadline` text NOT NULL,
  `hero_primary_cta_label` varchar(255) NOT NULL,
  `hero_primary_cta_href` text NOT NULL,
  `hero_secondary_cta_label` varchar(255) NOT NULL,
  `hero_secondary_cta_href` text NOT NULL,
  `hero_featured_product_id` varchar(64) DEFAULT NULL,
  `hero_scroll_cue` varchar(255) NOT NULL,
  `hero_video_url` text NOT NULL,
  `hero_video_poster` text NOT NULL,
  `featured_collection_title` varchar(255) NOT NULL,
  `featured_styles_title` varchar(255) NOT NULL,
  `featured_view_all_label` varchar(100) NOT NULL,
  `featured_product_count` int(10) unsigned NOT NULL DEFAULT 8,
  `why_choose_subtitle` varchar(255) NOT NULL,
  `why_choose_title` varchar(255) NOT NULL,
  `why_choose_description` text NOT NULL,
  `why_choose_cta_text` text NOT NULL,
  `quality_promise_badge` varchar(255) NOT NULL COMMENT 'Wellness equivalent of the jewelry anti-tarnish badge, e.g. FSSAI & GMP Certified',
  `quality_promise_title` varchar(255) NOT NULL,
  `quality_promise_description` text NOT NULL,
  `quality_promise_cta_label` varchar(255) NOT NULL,
  `quality_promise_cta_href` text NOT NULL,
  `quality_promise_image` text NOT NULL,
  `newsletter_badge` varchar(255) NOT NULL,
  `newsletter_title` varchar(255) NOT NULL,
  `newsletter_description` text NOT NULL,
  `newsletter_button_label` varchar(100) NOT NULL,
  `newsletter_disclaimer` varchar(255) NOT NULL,
  `newsletter_success_message` varchar(500) NOT NULL,
  `instagram_subtitle` varchar(255) NOT NULL,
  `instagram_title` varchar(255) NOT NULL,
  `instagram_description` text NOT NULL,
  `instagram_strip_label` varchar(255) NOT NULL,
  `about_hero_title` varchar(255) NOT NULL,
  `about_hero_description` text NOT NULL,
  `about_story_badge` varchar(255) NOT NULL,
  `about_story_title` varchar(255) NOT NULL,
  `about_story_image` text NOT NULL,
  `about_mission_title` varchar(255) NOT NULL,
  `about_mission_text` text NOT NULL,
  `about_vision_title` varchar(255) NOT NULL,
  `about_vision_text` text NOT NULL,
  `about_values_subtitle` varchar(255) NOT NULL,
  `about_values_title` varchar(255) NOT NULL,
  `contact_page_subtitle` varchar(255) NOT NULL,
  `contact_page_title` varchar(255) NOT NULL,
  `contact_page_description` text NOT NULL,
  `footer_tagline` varchar(500) NOT NULL,
  `footer_description` text NOT NULL,
  `footer_newsletter_title` varchar(255) NOT NULL,
  `footer_newsletter_description` text NOT NULL,
  `footer_instagram_card_text` text NOT NULL,
  `seo_title` varchar(255) NOT NULL,
  `seo_description` text NOT NULL,
  `video_banner_url` text DEFAULT NULL,
  `video_banner_poster` text DEFAULT NULL,
  `video_banner_title` varchar(255) DEFAULT NULL,
  `video_banner_subtitle` varchar(255) DEFAULT NULL,
  `video_banner_cta_label` varchar(255) DEFAULT NULL,
  `video_banner_cta_href` text DEFAULT NULL,
  `video_banner_fit` varchar(20) NOT NULL DEFAULT 'cover',
  `video_banner_width` int(10) unsigned DEFAULT NULL,
  `video_banner_height` int(10) unsigned DEFAULT NULL,
  `popup_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `popup_type` varchar(20) NOT NULL DEFAULT 'info',
  `popup_title` varchar(255) NOT NULL DEFAULT '',
  `popup_message` text NOT NULL,
  `popup_image` text NOT NULL,
  `popup_cta_label` varchar(255) NOT NULL DEFAULT '',
  `popup_cta_href` text NOT NULL,
  `popup_coupon_code` varchar(50) NOT NULL DEFAULT '',
  `popup_product_id` varchar(64) DEFAULT NULL,
  `popup_delay_seconds` int(10) unsigned NOT NULL DEFAULT 2,
  `popup_frequency` varchar(20) NOT NULL DEFAULT 'session',
  `extras_json` longtext DEFAULT NULL COMMENT 'JSON: newer storefront options',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Single-row site-wide CMS settings';
CREATE TABLE IF NOT EXISTS `site_why_choose_benefits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `icon` varchar(50) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='"Why choose us" benefit tiles on homepage';
CREATE TABLE IF NOT EXISTS `user_addresses` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `label` varchar(50) DEFAULT NULL COMMENT 'e.g. Home, Work',
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `landmark` varchar(255) DEFAULT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) DEFAULT NULL,
  `pincode` varchar(10) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_addresses_user_id` (`user_id`),
  CONSTRAINT `fk_user_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Saved shipping addresses per customer';
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar` varchar(2048) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `phone_verified_at` datetime(6) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL COMMENT 'NULL when signed up via Google OAuth only',
  `google_id` varchar(255) DEFAULT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email_verified_at` datetime(6) DEFAULT NULL,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `role` enum('customer','admin') NOT NULL DEFAULT 'customer',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_blocked` tinyint(1) NOT NULL DEFAULT 0,
  `blocked_at` datetime(6) DEFAULT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `last_used_address_id` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer and admin accounts';

-- ---------------------------------------------------------------------------------------------------------------
-- STARTER CONTENT
-- ---------------------------------------------------------------------------------------------------------------

-- categories
INSERT IGNORE INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES ('digestive-health','digestive-health','Digestive Health','Ayurvedic juices and formulations for gut health and everyday digestion.','https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&q=80',1,7);
INSERT IGNORE INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES ('immunity','immunity','Immunity','Daily immunity boosters built on trusted herbs and clinically studied actives.','https://images.unsplash.com/photo-1584362917165-526a968579e8?w=600&q=80',1,3);
INSERT IGNORE INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES ('personal-care','personal-care','Personal Care','Natural, dermatologically-tested skin and hair care essentials.','https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80',1,6);
INSERT IGNORE INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES ('protein','protein','Protein & Fitness','Whey, plant protein and fitness essentials to fuel recovery and muscle growth.','https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80',1,1);
INSERT IGNORE INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES ('superfoods','superfoods','Superfoods','Nutrient-dense superfood powders and blends for daily wellness.','https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&q=80',1,9);
INSERT IGNORE INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES ('vitamins','vitamins','Vitamins & Supplements','Targeted vitamins, minerals and multivitamins for everyday nutritional gaps.','https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&q=80',1,5);
INSERT IGNORE INTO `categories` (`id`, `slug`, `label`, `description`, `image`, `is_published`, `sort_order`) VALUES ('weight-management','weight-management','Weight Management','Clean-label formulas to support metabolism and healthy weight goals.','https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80',1,4);

-- products
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-aloevera-juice-001','Aloe Vera Digestive Juice','WS-ALV-001',499.00,999.00,50,'digestive-health',4.5,156,'Cold-extracted aloe vera juice traditionally used to support digestion, gut comfort, and healthy skin from within.',22,'1L','liquid','Original',1,1,1,'11523011000455',0,0,0,1,0,0,0,1,1,1,1,'2026-01-20 10:00:00.000000','2026-10-04 12:08:26.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-biotin-001','Biotin Hair, Skin & Nails Gummies','WS-BIO-001',599.00,799.00,31,'vitamins',4.6,142,'5000mcg biotin gummies with zinc and vitamin E to support healthy hair, skin and nails from within.',130,'60 gummies','gummy','Orange',1,1,0,'11523011000459',1,8,1,1,0,1,2,1,1,1,1,'2026-03-05 10:00:00.000000','2026-10-04 12:08:34.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-facewash-001','Neem & Tea Tree Face Wash','WS-NTT-001',349.00,449.00,22,'personal-care',4.6,124,'A gentle, sulphate-free face wash with neem and tea tree oil that clears everyday impurities without stripping your skin.',200,'150ml','liquid',NULL,1,1,0,NULL,0,0,1,1,0,0,0,1,1,1,1,'2026-03-10 10:00:00.000000','2026-03-10 10:00:00.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-fatburner-001','Green Coffee Weight Management Capsules','WS-GCF-001',799.00,1099.00,27,'weight-management',4.4,62,'Green coffee bean extract standardised for chlorogenic acid to support metabolism as part of a balanced diet and active lifestyle.',45,'90 capsules','capsule',NULL,1,1,0,'11523011000454',0,0,0,0,0,0,0,1,1,1,1,'2026-03-01 10:00:00.000000','2026-03-01 10:00:00.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-hairoil-001','Onion Black Seed Hair Oil','WS-OBS-001',449.00,599.00,25,'personal-care',4.5,88,'A cold-pressed onion and black seed hair oil blend that strengthens roots and reduces hair fall with regular use.',90,'200ml','oil',NULL,1,1,1,NULL,0,0,0,0,0,1,3,1,1,1,1,'2026-03-15 10:00:00.000000','2026-09-14 09:42:13.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-immunity-001','Immunity Booster Juice','WS-IMM-001',399.00,549.00,27,'immunity',4.6,178,'A daily shot of giloy, amla, and tulsi crafted to strengthen natural immunity without any added preservatives or artificial colour.',80,'1L','liquid','Original',1,1,1,'11523011000452',0,0,1,0,1,0,0,1,1,1,1,'2026-02-01 10:00:00.000000','2026-02-01 10:00:00.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-multivitamin-001','Daily Multivitamin Gummies','WS-MVG-001',549.00,749.00,33,'vitamins',4.5,96,'13 essential vitamins and minerals packed into a tasty mixed-fruit gummy — no gelatin, no artificial sweeteners.',150,'60 gummies','gummy','Mixed Fruit',1,1,0,'11523011000453',1,8,1,0,0,1,0,1,1,1,1,'2026-02-15 10:00:00.000000','2026-09-14 09:44:36.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-protein-001','Plant Protein Isolate','WS-PRO-001',1899.00,2499.00,28,'protein',4.7,214,'A 100% plant-based protein isolate blending pea and brown rice protein for complete amino acid coverage. Zero added sugar, easy to digest, and formulated for daily post-workout recovery.',60,'1kg (33 servings)','powder','Chocolate',1,1,0,'11523011000450',1,10,1,1,1,1,1,1,1,1,1,'2026-01-05 10:00:00.000000','2026-09-14 09:43:56.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-superfood-greens-001','Daily Greens Superfood Blend','WS-DGB-001',999.00,1299.00,23,'superfoods',4.5,67,'A blend of spirulina, wheatgrass, moringa and 8 other greens to help fill everyday nutrition gaps in one daily scoop.',70,'200g (40 servings)','powder','Unflavoured',1,1,0,'11523011000458',1,10,1,0,0,0,0,1,1,1,1,'2026-02-20 10:00:00.000000','2026-02-20 10:00:00.000000');
INSERT IGNORE INTO `products` (`id`, `title`, `sku`, `price`, `original_price`, `discount`, `category_id`, `rating`, `review_count`, `description`, `stock`, `net_quantity`, `form`, `flavor`, `is_vegetarian`, `is_vegan`, `is_ayurvedic`, `fssai_license_no`, `subscription_enabled`, `subscription_discount_percent`, `is_new`, `is_best_seller`, `is_trending_pinned`, `orbit_featured`, `orbit_sort_order`, `show_trust_badges`, `is_published`, `cod_enabled`, `online_payment_enabled`, `created_at`, `updated_at`) VALUES ('ws-triphala-001','Triphala Digestive Tablets','WS-TRI-001',299.00,399.00,25,'digestive-health',4.6,203,'A classic Ayurvedic blend of Amalaki, Bibhitaki and Haritaki to support regular digestion and gentle detoxification.',140,'60 tablets','tablet',NULL,1,1,1,'11523011000456',1,10,0,1,0,0,0,1,1,1,1,'2026-01-25 10:00:00.000000','2026-10-04 04:18:05.000000');

-- product_images
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (5,'ws-immunity-001','https://images.unsplash.com/photo-1584362917165-526a968579e8?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (7,'ws-fatburner-001','https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (8,'ws-facewash-001','https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (9,'ws-hairoil-001','https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (11,'ws-triphala-001','https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (13,'ws-superfood-greens-001','https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (17,'ws-aloevera-juice-001','https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (18,'ws-protein-001','https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (19,'ws-multivitamin-001','https://images.unsplash.com/photo-1635342219731-4ae2bf39e1e9?w=800&q=80',0);
INSERT IGNORE INTO `product_images` (`id`, `product_id`, `url`, `sort_order`) VALUES (20,'ws-biotin-001','https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800&q=80',0);

-- product_tags
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (1,'ws-protein-001','Best Seller',0);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (2,'ws-protein-001','New',1);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (4,'ws-immunity-001','New',0);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (5,'ws-multivitamin-001','New',0);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (6,'ws-facewash-001','Best Seller',0);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (7,'ws-facewash-001','New',1);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (9,'ws-triphala-001','Best Seller',0);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (11,'ws-superfood-greens-001','New',0);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (12,'ws-biotin-001','New',0);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (13,'ws-biotin-001','Best Seller',1);
INSERT IGNORE INTO `product_tags` (`id`, `product_id`, `tag`, `sort_order`) VALUES (16,'ws-aloevera-juice-001','Best Seller',0);

-- product_badges
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (1,'ws-protein-001','FSSAI Certified',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (2,'ws-protein-001','Lab Tested',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (3,'ws-protein-001','No Added Sugar',2);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (4,'ws-protein-001','100% Vegan',3);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (8,'ws-immunity-001','No Preservatives',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (9,'ws-immunity-001','FSSAI Certified',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (10,'ws-multivitamin-001','No Gelatin',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (11,'ws-multivitamin-001','FSSAI Certified',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (12,'ws-fatburner-001','Lab Tested',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (13,'ws-facewash-001','Sulphate Free',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (14,'ws-facewash-001','Dermatologically Tested',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (15,'ws-hairoil-001','Cold Pressed',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (16,'ws-hairoil-001','No Mineral Oil',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (19,'ws-triphala-001','FSSAI Certified',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (20,'ws-triphala-001','100% Ayurvedic',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (23,'ws-superfood-greens-001','FSSAI Certified',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (24,'ws-superfood-greens-001','100% Vegan',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (25,'ws-biotin-001','FSSAI Certified',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (26,'ws-biotin-001','No Gelatin',1);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (31,'ws-aloevera-juice-001','FSSAI Certified',0);
INSERT IGNORE INTO `product_badges` (`id`, `product_id`, `badge`, `sort_order`) VALUES (32,'ws-aloevera-juice-001','No Added Sugar',1);

-- product_variants
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374306089-b04f96','ws-protein-001','1 Month Supply','1kg (33 servings)',NULL,1899.00,2499.00,24,60,'WS-PRO-1M',0,0,'2026-09-14 08:59:11.000000','2026-09-14 08:59:11.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374306093-ef6ff7','ws-protein-001','2 Month Supply','2kg (66 servings)','https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80',3599.00,4998.00,28,40,'WS-PRO-2M',1,1,'2026-09-14 08:59:11.000000','2026-09-14 08:59:11.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374306097-df125c','ws-protein-001','3 Month Supply','3kg (99 servings)','https://images.unsplash.com/photo-1693996045899-7cf0ac0229c7?w=800&q=80',5099.00,7497.00,32,25,'WS-PRO-3M',0,2,'2026-09-14 08:59:11.000000','2026-09-14 08:59:11.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374327039-0b1475','ws-multivitamin-001','1 Month Supply','60 gummies',NULL,549.00,749.00,27,150,'WS-MV-1M',0,0,'2026-09-14 08:59:30.000000','2026-09-14 08:59:30.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374327042-b3f641','ws-multivitamin-001','2 Month Supply','120 gummies','https://images.unsplash.com/photo-1635342219731-4ae2bf39e1e9?w=800&q=80',999.00,1498.00,33,89,'WS-MV-2M',1,1,'2026-09-14 08:59:30.000000','2026-09-14 08:59:30.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374327046-33c942','ws-multivitamin-001','3 Month Supply','180 gummies','https://images.unsplash.com/photo-1617627191898-1408bf607b4d?w=800&q=80',1399.00,2247.00,38,50,'WS-MV-3M',0,2,'2026-09-14 08:59:30.000000','2026-09-14 08:59:30.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374327265-572be6','ws-biotin-001','1 Month Supply','60 gummies',NULL,599.00,799.00,25,130,'WS-BIO-1M',0,0,'2026-09-14 08:59:30.000000','2026-09-14 08:59:30.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374327268-e18a75','ws-biotin-001','2 Month Supply','120 gummies','https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800&q=80',1099.00,1598.00,31,80,'WS-BIO-2M',1,1,'2026-09-14 08:59:30.000000','2026-09-14 08:59:30.000000');
INSERT IGNORE INTO `product_variants` (`id`, `product_id`, `label`, `net_quantity`, `image`, `price`, `original_price`, `discount`, `stock`, `sku`, `is_default`, `sort_order`, `created_at`, `updated_at`) VALUES ('variant-1789374327271-9dfbdd','ws-biotin-001','3 Month Supply','180 gummies','https://images.unsplash.com/photo-1675437434916-fd6d0b03749d?w=800&q=80',1549.00,2397.00,35,45,'WS-BIO-3M',0,2,'2026-09-14 08:59:30.000000','2026-09-14 08:59:30.000000');

-- product_features
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (1,'ws-protein-001','24g Protein per Serving',0);
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (2,'ws-protein-001','Pea + Brown Rice Blend',1);
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (3,'ws-protein-001','Zero Added Sugar',2);
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (4,'ws-protein-001','Easy to Digest Formula',3);
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (8,'ws-facewash-001','Sulphate-Free Cleansing',0);
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (9,'ws-facewash-001','Neem + Tea Tree Oil',1);
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (13,'ws-triphala-001','Amalaki, Bibhitaki & Haritaki Blend',0);
INSERT IGNORE INTO `product_features` (`id`, `product_id`, `feature`, `sort_order`) VALUES (14,'ws-triphala-001','Supports Regular Digestion',1);

-- product_ingredients
INSERT IGNORE INTO `product_ingredients` (`id`, `product_id`, `name`, `benefit`, `image`, `sort_order`) VALUES (1,'ws-protein-001','Pea Protein Isolate','Rich in BCAAs, supports lean muscle recovery.','https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=300&q=80',0);
INSERT IGNORE INTO `product_ingredients` (`id`, `product_id`, `name`, `benefit`, `image`, `sort_order`) VALUES (2,'ws-protein-001','Brown Rice Protein','Complements pea protein for a complete amino acid profile.',NULL,1);
INSERT IGNORE INTO `product_ingredients` (`id`, `product_id`, `name`, `benefit`, `image`, `sort_order`) VALUES (4,'ws-immunity-001','Giloy','Traditionally used to support the body\'s natural defence.',NULL,0);
INSERT IGNORE INTO `product_ingredients` (`id`, `product_id`, `name`, `benefit`, `image`, `sort_order`) VALUES (5,'ws-immunity-001','Amla','Rich source of natural Vitamin C.',NULL,1);
INSERT IGNORE INTO `product_ingredients` (`id`, `product_id`, `name`, `benefit`, `image`, `sort_order`) VALUES (6,'ws-immunity-001','Tulsi','Adaptogenic herb known for immune and respiratory support.',NULL,2);

-- product_nutrition_facts
INSERT IGNORE INTO `product_nutrition_facts` (`id`, `product_id`, `serving_size`, `nutrient_name`, `value_per_serving`, `daily_value_percent`, `sort_order`) VALUES (1,'ws-protein-001','30g (1 scoop)','Energy','112 kcal',NULL,0);
INSERT IGNORE INTO `product_nutrition_facts` (`id`, `product_id`, `serving_size`, `nutrient_name`, `value_per_serving`, `daily_value_percent`, `sort_order`) VALUES (2,'ws-protein-001','30g (1 scoop)','Protein','24g','43%',1);
INSERT IGNORE INTO `product_nutrition_facts` (`id`, `product_id`, `serving_size`, `nutrient_name`, `value_per_serving`, `daily_value_percent`, `sort_order`) VALUES (3,'ws-protein-001','30g (1 scoop)','Carbohydrates','3.2g',NULL,2);
INSERT IGNORE INTO `product_nutrition_facts` (`id`, `product_id`, `serving_size`, `nutrient_name`, `value_per_serving`, `daily_value_percent`, `sort_order`) VALUES (4,'ws-protein-001','30g (1 scoop)','Total Sugar','0.5g',NULL,3);
INSERT IGNORE INTO `product_nutrition_facts` (`id`, `product_id`, `serving_size`, `nutrient_name`, `value_per_serving`, `daily_value_percent`, `sort_order`) VALUES (5,'ws-protein-001','30g (1 scoop)','Fat','1.8g',NULL,4);

-- product_how_to_use
INSERT IGNORE INTO `product_how_to_use` (`id`, `product_id`, `step_number`, `instruction`) VALUES (1,'ws-protein-001',1,'Take 1 scoop (30g) with 200-250ml of water or milk.');
INSERT IGNORE INTO `product_how_to_use` (`id`, `product_id`, `step_number`, `instruction`) VALUES (2,'ws-protein-001',2,'Shake well and consume within 30 minutes post-workout.');
INSERT IGNORE INTO `product_how_to_use` (`id`, `product_id`, `step_number`, `instruction`) VALUES (3,'ws-protein-001',3,'Can also be taken between meals to meet daily protein needs.');
INSERT IGNORE INTO `product_how_to_use` (`id`, `product_id`, `step_number`, `instruction`) VALUES (6,'ws-immunity-001',1,'Shake well. Take 30ml undiluted, preferably on an empty stomach in the morning.');

-- product_faqs
INSERT IGNORE INTO `product_faqs` (`id`, `product_id`, `question`, `answer`, `sort_order`) VALUES (1,'ws-protein-001','Is this suitable for vegetarians?','Yes, this is a 100% plant-based, vegan-friendly protein with no animal-derived ingredients.',0);
INSERT IGNORE INTO `product_faqs` (`id`, `product_id`, `question`, `answer`, `sort_order`) VALUES (2,'ws-protein-001','When should I take this?','Best taken within 30 minutes after a workout, or any time of day to meet your daily protein target.',1);

-- bundles
INSERT IGNORE INTO `bundles` (`id`, `title`, `subtitle`, `description`, `image`, `discount_type`, `discount_value`, `is_published`, `sort_order`, `created_at`, `updated_at`) VALUES ('bundle-1789371907322-605be5','Gut Health Reset','Frequently Bought Together','Cold-pressed aloe vera juice and classic triphala tablets - a simple daily pair for digestion and gut comfort.',NULL,'percent',15.00,1,0,'2026-09-14 07:45:07.000000','2026-10-04 12:08:17.000000');
INSERT IGNORE INTO `bundles` (`id`, `title`, `subtitle`, `description`, `image`, `discount_type`, `discount_value`, `is_published`, `sort_order`, `created_at`, `updated_at`) VALUES ('bundle-1789371922356-d7e60f','Daily Immunity and Vitality Kit','Complete your daily routine','A multivitamin, an immunity booster, and biotin gummies - everyday defence and vitality in one kit.',NULL,'percent',15.00,1,1,'2026-09-14 07:45:22.000000','2026-09-14 07:45:22.000000');
INSERT IGNORE INTO `bundles` (`id`, `title`, `subtitle`, `description`, `image`, `discount_type`, `discount_value`, `is_published`, `sort_order`, `created_at`, `updated_at`) VALUES ('bundle-1789371922524-749ffd','Glow and Grow Hair-Skin Duo','Everyday skin & hair care','Onion black seed hair oil and a gentle neem-tea tree face wash - a simple everyday hair and skin routine.',NULL,'percent',12.00,1,2,'2026-09-14 07:45:22.000000','2026-09-14 07:45:22.000000');

-- bundle_items
INSERT IGNORE INTO `bundle_items` (`id`, `bundle_id`, `product_id`, `quantity`, `sort_order`) VALUES (1,'bundle-1789371907322-605be5','ws-aloevera-juice-001',1,0);
INSERT IGNORE INTO `bundle_items` (`id`, `bundle_id`, `product_id`, `quantity`, `sort_order`) VALUES (2,'bundle-1789371907322-605be5','ws-triphala-001',1,1);
INSERT IGNORE INTO `bundle_items` (`id`, `bundle_id`, `product_id`, `quantity`, `sort_order`) VALUES (3,'bundle-1789371922356-d7e60f','ws-multivitamin-001',1,0);
INSERT IGNORE INTO `bundle_items` (`id`, `bundle_id`, `product_id`, `quantity`, `sort_order`) VALUES (4,'bundle-1789371922356-d7e60f','ws-immunity-001',1,1);
INSERT IGNORE INTO `bundle_items` (`id`, `bundle_id`, `product_id`, `quantity`, `sort_order`) VALUES (5,'bundle-1789371922356-d7e60f','ws-biotin-001',1,2);
INSERT IGNORE INTO `bundle_items` (`id`, `bundle_id`, `product_id`, `quantity`, `sort_order`) VALUES (6,'bundle-1789371922524-749ffd','ws-hairoil-001',1,0);
INSERT IGNORE INTO `bundle_items` (`id`, `bundle_id`, `product_id`, `quantity`, `sort_order`) VALUES (7,'bundle-1789371922524-749ffd','ws-facewash-001',1,1);

-- coupons
INSERT IGNORE INTO `coupons` (`id`, `code`, `title`, `description`, `type`, `value`, `min_order_amount`, `max_discount`, `max_uses`, `max_uses_per_user`, `usage_count`, `is_enabled`, `show_on_website`, `auto_apply`, `audience`, `min_previous_orders`, `starts_at`, `expires_at`, `created_at`, `updated_at`) VALUES ('coupon-1789387945092-6a0151','WELCOMEBACK10','Welcome Back - 10% Off','A thank-you for returning customers','percent',10.00,0.00,0.00,0,0,0,1,1,1,'returning_customers',1,NULL,NULL,'2026-09-14 12:12:25.000000','2026-09-14 12:17:03.000000');
INSERT IGNORE INTO `coupons` (`id`, `code`, `title`, `description`, `type`, `value`, `min_order_amount`, `max_discount`, `max_uses`, `max_uses_per_user`, `usage_count`, `is_enabled`, `show_on_website`, `auto_apply`, `audience`, `min_previous_orders`, `starts_at`, `expires_at`, `created_at`, `updated_at`) VALUES ('coupon-welcome10','WELCOME10','Welcome Offer','10% off on your first order','percent',10.00,499.00,150.00,0,1,0,1,1,0,'everyone',1,NULL,NULL,'2026-01-01 00:00:00.000000','2026-01-01 00:00:00.000000');

-- promo_banners
INSERT IGNORE INTO `promo_banners` (`id`, `title`, `subtitle`, `image`, `mobile_image`, `cta_label`, `cta_href`, `display_target`, `product_id`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES ('banner-1','Immunity Season Sale','Up to 30% off on immunity essentials','https://images.unsplash.com/photo-1584362917165-526a968579e8?w=1200&q=80',NULL,'Shop Now','/shop?category=immunity','both',NULL,1,1,'2026-08-01 00:00:00.000000','2026-08-01 00:00:00.000000');
INSERT IGNORE INTO `promo_banners` (`id`, `title`, `subtitle`, `image`, `mobile_image`, `cta_label`, `cta_href`, `display_target`, `product_id`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES ('banner-1789373208108-6c797b','Combo Offer','Pair it with Triphala and save more','https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=1200&q=80',NULL,'View Gut Health Kit','/shop?category=digestive-health','product','ws-aloevera-juice-001',1,1,'2026-09-14 08:06:48.000000','2026-09-14 08:06:48.000000');

-- reviews
INSERT IGNORE INTO `reviews` (`id`, `product_id`, `user_id`, `name`, `email`, `rating`, `is_verified_purchase`, `comment`, `avatar`, `is_approved`, `created_at`, `images`) VALUES ('review-1','ws-protein-001',NULL,'Rohan Mehta','rohan@example.com',5,0,'Mixes well and doesn\'t upset my stomach like whey used to. Chocolate flavour is genuinely tasty.','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',1,'2026-06-10 10:00:00.000000',NULL);
INSERT IGNORE INTO `reviews` (`id`, `product_id`, `user_id`, `name`, `email`, `rating`, `is_verified_purchase`, `comment`, `avatar`, `is_approved`, `created_at`, `images`) VALUES ('review-3','ws-immunity-001',NULL,'Arjun Verma','arjun@example.com',4,0,'Taste takes getting used to but I feel like I fall sick less often since starting this.',NULL,1,'2026-07-02 10:00:00.000000',NULL);

-- site_settings
INSERT IGNORE INTO `site_settings` (`id`, `site_name`, `brand_name`, `brand_short`, `brand_tagline`, `brand_description`, `logo`, `favicon`, `theme_primary_color`, `theme_primary_light`, `theme_primary_dark`, `theme_accent_color`, `theme_accent_light`, `theme_blush_color`, `theme_background_color`, `theme_text_color`, `theme_font_heading`, `theme_font_body`, `contact_email`, `contact_whatsapp_number`, `contact_whatsapp_display`, `contact_whatsapp_default_message`, `contact_business_hours`, `social_instagram_handle`, `social_instagram_url`, `social_instagram_tagline`, `delivery_fee`, `delivery_free_threshold`, `delivery_return_days`, `payments_cod_enabled`, `payments_online_payment_enabled`, `services_email_enabled`, `services_otp_enabled`, `services_google_sign_in_enabled`, `promo_enabled`, `promo_text`, `promo_code`, `promo_suffix`, `promo_href`, `hero_badge`, `hero_headline`, `hero_headline_accent`, `hero_subheadline`, `hero_primary_cta_label`, `hero_primary_cta_href`, `hero_secondary_cta_label`, `hero_secondary_cta_href`, `hero_featured_product_id`, `hero_scroll_cue`, `hero_video_url`, `hero_video_poster`, `featured_collection_title`, `featured_styles_title`, `featured_view_all_label`, `featured_product_count`, `why_choose_subtitle`, `why_choose_title`, `why_choose_description`, `why_choose_cta_text`, `quality_promise_badge`, `quality_promise_title`, `quality_promise_description`, `quality_promise_cta_label`, `quality_promise_cta_href`, `quality_promise_image`, `newsletter_badge`, `newsletter_title`, `newsletter_description`, `newsletter_button_label`, `newsletter_disclaimer`, `newsletter_success_message`, `instagram_subtitle`, `instagram_title`, `instagram_description`, `instagram_strip_label`, `about_hero_title`, `about_hero_description`, `about_story_badge`, `about_story_title`, `about_story_image`, `about_mission_title`, `about_mission_text`, `about_vision_title`, `about_vision_text`, `about_values_subtitle`, `about_values_title`, `contact_page_subtitle`, `contact_page_title`, `contact_page_description`, `footer_tagline`, `footer_description`, `footer_newsletter_title`, `footer_newsletter_description`, `footer_instagram_card_text`, `seo_title`, `seo_description`, `video_banner_url`, `video_banner_poster`, `video_banner_title`, `video_banner_subtitle`, `video_banner_cta_label`, `video_banner_cta_href`, `video_banner_fit`, `video_banner_width`, `video_banner_height`, `popup_enabled`, `popup_type`, `popup_title`, `popup_message`, `popup_image`, `popup_cta_label`, `popup_cta_href`, `popup_coupon_code`, `popup_product_id`, `popup_delay_seconds`, `popup_frequency`, `extras_json`, `updated_at`) VALUES (1,'Chikit','Chikit','Chikit','Ayurveda and Wellness','Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.','','','#602460','#7A3380','#431A43','#C08A3E','#D8A860','#F1E4F2','#FDF9F4','#241720','\"Lora\", Georgia, serif','\"Poppins\", system-ui, sans-serif','hello@chikit.in','910000000000','+91 00000 00000','Hi! I have a question about a product.','Mon-Sat, 10am-7pm IST','chikit.ayurveda','https://instagram.com/chikit.ayurveda','Follow us for Ayurvedic rituals, wellness tips and behind-the-scenes',49.00,999.00,7,1,1,1,1,1,1,'Use code','WELCOME10','for 10% off your first order','/shop','FSSAI & Lab Tested','Ancient Wisdom for','Modern Living','Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.','Shop Now','/shop','','','ws-protein-001','','','','Featured Collection','Trending Now','View All',8,'Why Choose Us','Ayurveda You Can Trust','From sourcing to lab testing, every step is built around Ayurvedic tradition and transparency.','Learn more about our process','FSSAI & GMP Certified','Purity You Can Verify','Every product is manufactured in certified facilities and third-party lab tested before it reaches you.','See Our Certifications','/about','','Exclusive Access','Join the Chikit Circle','Be the first to hear about new products, offers, and wellness tips.','Subscribe','No spam. Unsubscribe anytime.','Thank you for subscribing!','@chikit.ayurveda','Follow Our Journey','Wellness tips, product stories & customer love. Join us on Instagram.','Follow us on Instagram','Our Story','Chikit was founded on a simple belief: ancient Ayurvedic wisdom shouldn\'t mean compromising on purity or modern-day convenience.','The Beginning','Ayurveda, Honestly Made','','Our Mission','To make authentic, lab-tested Ayurvedic wellness accessible to every household.','Our Vision','To become India\'s most trusted Ayurveda and wellness brand, known for transparency and quality.','What Drives Us','Mission & Vision','Get in Touch','Contact Us','We\'d love to hear from you. Our team is here to help.','Ayurveda and Wellness','Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.','The Chikit Circle','Be the first to hear about new products, offers, and Ayurvedic wellness tips.','Ayurvedic tips, product stories & behind-the-scenes.','Chikit | Ayurveda and Wellness','Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.','https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=80','Wellness, Naturally','Ayurveda in motion','Shop Now','/shop','cover',960,540,0,'info','Spin & Win','Try your luck for a discount on your first order.','','Start shopping','/shop','WELCOME10','ws-aloevera-juice-001',2,'session','{\"delivery\":{\"minDays\":0,\"maxDays\":0},\"disclaimer\":\"These statements have not been evaluated by the FSSAI. This product is not intended to diagnose, treat, cure or prevent any disease and is not a substitute for medical advice. Results may vary from person to person.\",\"announcements\":[],\"restockReminderDays\":30,\"expertChat\":true,\"concerns\":[{\"label\":\"Digestion\",\"search\":\"digest\",\"image\":\"\"},{\"label\":\"Hair & Skin\",\"search\":\"hair\",\"image\":\"\"},{\"label\":\"Immunity\",\"search\":\"immun\",\"image\":\"\"},{\"label\":\"Face care\",\"search\":\"face\",\"image\":\"\"}],\"popup\":{\"categorySlug\":\"\",\"startsAt\":\"\",\"endsAt\":\"\",\"pages\":\"all\"},\"spin\":{\"cooldownDays\":30,\"segments\":[{\"label\":\"10% OFF\",\"couponId\":\"coupon-welcome10\",\"weight\":25},{\"label\":\"Better luck next time\",\"couponId\":\"\",\"weight\":35},{\"label\":\"10% OFF\",\"couponId\":\"coupon-welcome10\",\"weight\":10},{\"label\":\"Try again\",\"couponId\":\"\",\"weight\":30}]},\"shelves\":{\"mode\":\"auto\",\"limit\":8,\"items\":[]},\"nav\":{\"mode\":\"categories\",\"showAll\":true,\"maxVisible\":6},\"offerTab\":{\"enabled\":false,\"tabLabel\":\"Get 10% OFF\",\"side\":\"right\",\"couponId\":\"coupon-welcome10\",\"title\":\"Unlock 10% off your first order\",\"subtitle\":\"Join the Chikit circle and we will send your code right away.\",\"steps\":[\"Enter your email\",\"Get your coupon code instantly\",\"Use it at checkout\"],\"requireEmail\":true,\"buttonLabel\":\"Unlock my code\",\"delaySeconds\":3,\"pages\":\"all\"}}','2026-10-04 19:16:59');

-- site_section_toggles
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('banners',1,5);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('bannerSlider',1,0);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('brandMarquee',1,4);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('bundles',1,10);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('categories',1,14);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('categoryShelves',1,2);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('certifiedBanner',1,9);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('featured',1,6);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('hero',1,1);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('instagram',0,12);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('newsletter',1,13);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('promoBanner',1,15);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('reviews',1,11);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('trending',1,7);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('videoBanner',1,3);
INSERT IGNORE INTO `site_section_toggles` (`section_key`, `is_enabled`, `sort_order`) VALUES ('whyChoose',1,8);

-- site_nav_links
INSERT IGNORE INTO `site_nav_links` (`id`, `label`, `href`, `sort_order`) VALUES (439,'Home','/',0);
INSERT IGNORE INTO `site_nav_links` (`id`, `label`, `href`, `sort_order`) VALUES (440,'Shop','/shop',1);
INSERT IGNORE INTO `site_nav_links` (`id`, `label`, `href`, `sort_order`) VALUES (441,'Reviews','/reviews',2);
INSERT IGNORE INTO `site_nav_links` (`id`, `label`, `href`, `sort_order`) VALUES (442,'About','/about',3);
INSERT IGNORE INTO `site_nav_links` (`id`, `label`, `href`, `sort_order`) VALUES (443,'FAQ','/faq',4);
INSERT IGNORE INTO `site_nav_links` (`id`, `label`, `href`, `sort_order`) VALUES (444,'Contact','/contact',5);

-- site_marquee_items
INSERT IGNORE INTO `site_marquee_items` (`id`, `text`, `sort_order`) VALUES (366,'FSSAI & GMP Certified',0);
INSERT IGNORE INTO `site_marquee_items` (`id`, `text`, `sort_order`) VALUES (367,'Lab Tested Purity',1);
INSERT IGNORE INTO `site_marquee_items` (`id`, `text`, `sort_order`) VALUES (368,'No Added Preservatives',2);
INSERT IGNORE INTO `site_marquee_items` (`id`, `text`, `sort_order`) VALUES (369,'Free Delivery Above ₹999',3);
INSERT IGNORE INTO `site_marquee_items` (`id`, `text`, `sort_order`) VALUES (370,'7-Day Easy Returns',4);

-- site_instagram_images
INSERT IGNORE INTO `site_instagram_images` (`id`, `url`, `sort_order`) VALUES (293,'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80',0);
INSERT IGNORE INTO `site_instagram_images` (`id`, `url`, `sort_order`) VALUES (294,'https://images.unsplash.com/photo-1611072172377-64f6764f5e77?w=400&q=80',1);
INSERT IGNORE INTO `site_instagram_images` (`id`, `url`, `sort_order`) VALUES (295,'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400&q=80',2);
INSERT IGNORE INTO `site_instagram_images` (`id`, `url`, `sort_order`) VALUES (296,'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&q=80',3);

-- site_hero_orbit_images
INSERT IGNORE INTO `site_hero_orbit_images` (`id`, `url`, `sort_order`) VALUES (293,'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1200&q=90',0);
INSERT IGNORE INTO `site_hero_orbit_images` (`id`, `url`, `sort_order`) VALUES (294,'https://images.unsplash.com/photo-1611072172377-64f6764f5e77?w=1200&q=90',1);
INSERT IGNORE INTO `site_hero_orbit_images` (`id`, `url`, `sort_order`) VALUES (295,'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=1200&q=90',2);
INSERT IGNORE INTO `site_hero_orbit_images` (`id`, `url`, `sort_order`) VALUES (296,'https://images.unsplash.com/photo-1550572017-edd951b55104?w=1200&q=90',3);

-- site_hero_trust_badges
INSERT IGNORE INTO `site_hero_trust_badges` (`id`, `icon`, `label`, `sort_order`) VALUES (220,'shield','FSSAI Certified',0);
INSERT IGNORE INTO `site_hero_trust_badges` (`id`, `icon`, `label`, `sort_order`) VALUES (221,'flask','Lab Tested',1);
INSERT IGNORE INTO `site_hero_trust_badges` (`id`, `icon`, `label`, `sort_order`) VALUES (222,'leaf','100% Natural',2);

-- site_about_story_paragraphs
INSERT IGNORE INTO `site_about_story_paragraphs` (`id`, `paragraph`, `sort_order`) VALUES (147,'Chikit was founded with a simple yet powerful vision: to make authentic, lab-tested Ayurvedic wellness accessible to every household.',0);
INSERT IGNORE INTO `site_about_story_paragraphs` (`id`, `paragraph`, `sort_order`) VALUES (148,'Every formulation is developed with FSSAI-certified manufacturing partners, lab-tested for purity, and built around ingredients you can actually pronounce.',1);

-- site_contact_faqs
INSERT IGNORE INTO `site_contact_faqs` (`id`, `question`, `answer`, `sort_order`) VALUES (293,'Are your products FSSAI certified?','Yes. Every product is manufactured in FSSAI-licensed facilities and carries its license number on the pack and product page.',0);
INSERT IGNORE INTO `site_contact_faqs` (`id`, `question`, `answer`, `sort_order`) VALUES (294,'Are your supplements lab tested?','Yes, each batch is third-party lab tested for purity, heavy metals, and label-claim accuracy.',1);
INSERT IGNORE INTO `site_contact_faqs` (`id`, `question`, `answer`, `sort_order`) VALUES (295,'What is your return policy?','We offer a 7-day return policy on unopened, unused products in original packaging.',2);
INSERT IGNORE INTO `site_contact_faqs` (`id`, `question`, `answer`, `sort_order`) VALUES (296,'Do you offer Subscribe & Save?','Yes, select products support recurring delivery with an extra subscriber discount — look for the Subscribe & Save option on the product page.',3);

-- site_why_choose_benefits
INSERT IGNORE INTO `site_why_choose_benefits` (`id`, `icon`, `title`, `description`, `sort_order`) VALUES (293,'flask','Lab Tested Purity','Every batch is third-party tested for purity and label-claim accuracy.',0);
INSERT IGNORE INTO `site_why_choose_benefits` (`id`, `icon`, `title`, `description`, `sort_order`) VALUES (294,'shield','FSSAI & GMP Certified','Manufactured in certified facilities that meet strict quality standards.',1);
INSERT IGNORE INTO `site_why_choose_benefits` (`id`, `icon`, `title`, `description`, `sort_order`) VALUES (295,'leaf','Clean Label Ingredients','No unnecessary fillers, artificial colours, or hidden additives.',2);
INSERT IGNORE INTO `site_why_choose_benefits` (`id`, `icon`, `title`, `description`, `sort_order`) VALUES (296,'truck','Fast, Reliable Delivery','Pan-India delivery with real-time order tracking.',3);

SET FOREIGN_KEY_CHECKS = 1;
