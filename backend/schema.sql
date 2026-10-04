-- ============================================================================
-- WELLNESS STORE — DATABASE SCHEMA
-- ============================================================================
-- A schema built for a wellness / supplements / nutrition D2C brand
-- (Kapiva / OZiva style).
--
-- Import: mysql -u root wellness_store < backend/schema.sql
-- (or paste into phpMyAdmin on an empty `wellness_store` database)
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
CREATE TABLE `categories` (
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

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` varchar(64) NOT NULL,
  `title` varchar(500) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) NOT NULL,
  `discount` int(11) NOT NULL DEFAULT 0 COMMENT 'Percent discount; may be admin override',
  `category_id` varchar(64) NOT NULL,
  `rating` decimal(2,1) NOT NULL DEFAULT 0.0,
  `review_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
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
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product catalog';

-- ----------------------------------------------------------------------------
-- product_images
-- ----------------------------------------------------------------------------
CREATE TABLE `product_images` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `url` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_images_product_id` (`product_id`),
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Primary product gallery images';

-- ----------------------------------------------------------------------------
-- product_variants  (one product, multiple buyable options — sizes, pack
-- counts, or durations, e.g. "Small/Medium/Large" or "1/3/6 Month Supply")
-- ----------------------------------------------------------------------------
CREATE TABLE `product_variants` (
  `id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `label` varchar(150) NOT NULL COMMENT 'e.g. "Large", "250ml", "3 Month Supply"',
  `net_quantity` varchar(100) DEFAULT NULL COMMENT 'e.g. 200g, 60 capsules, 500ml — this variant''s size/pack label',
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

-- ----------------------------------------------------------------------------
-- product_badges
-- ----------------------------------------------------------------------------
CREATE TABLE `product_badges` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `badge` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_badges_product_id` (`product_id`),
  CONSTRAINT `fk_product_badges_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Per-product trust badges (e.g. FSSAI Certified, Lab Tested, No Added Sugar)';

-- ----------------------------------------------------------------------------
-- product_tags
-- ----------------------------------------------------------------------------
CREATE TABLE `product_tags` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `tag` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_tags_product_id` (`product_id`),
  CONSTRAINT `fk_product_tags_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Display tags on product cards (e.g. New, Best Seller, Sale)';

-- ----------------------------------------------------------------------------
-- product_features
-- ----------------------------------------------------------------------------
CREATE TABLE `product_features` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `feature` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_features_product_id` (`product_id`),
  CONSTRAINT `fk_product_features_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bullet-point feature list on product detail pages';

-- ----------------------------------------------------------------------------
-- product_ingredients  (wellness-specific)
-- ----------------------------------------------------------------------------
CREATE TABLE `product_ingredients` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `benefit` text DEFAULT NULL COMMENT 'Short benefit description, e.g. Ashwagandha - Reduces stress & supports recovery',
  `image` varchar(2048) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_ingredients_product_id` (`product_id`),
  CONSTRAINT `fk_product_ingredients_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Key ingredients shown on product detail pages with their benefits';

-- ----------------------------------------------------------------------------
-- product_nutrition_facts  (wellness-specific)
-- ----------------------------------------------------------------------------
CREATE TABLE `product_nutrition_facts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
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

-- ----------------------------------------------------------------------------
-- product_how_to_use  (wellness-specific: dosage / usage instructions)
-- ----------------------------------------------------------------------------
CREATE TABLE `product_how_to_use` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `step_number` int(11) NOT NULL DEFAULT 1,
  `instruction` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_how_to_use_product_id` (`product_id`),
  CONSTRAINT `fk_product_how_to_use_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Step-by-step dosage / usage instructions per product';

-- ----------------------------------------------------------------------------
-- product_faqs  (wellness-specific: per-product FAQ)
-- ----------------------------------------------------------------------------
CREATE TABLE `product_faqs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product_faqs_product_id` (`product_id`),
  CONSTRAINT `fk_product_faqs_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product-specific FAQ entries shown on the PDP';

-- ----------------------------------------------------------------------------
-- bundles  (e.g. "Complete Wellness Kit" — buy 3 products together and save)
-- ----------------------------------------------------------------------------
CREATE TABLE `bundles` (
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

-- ----------------------------------------------------------------------------
-- bundle_items
-- ----------------------------------------------------------------------------
CREATE TABLE `bundle_items` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `bundle_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_bundle_items_bundle_id` (`bundle_id`),
  KEY `idx_bundle_items_product_id` (`product_id`),
  CONSTRAINT `fk_bundle_items_bundle` FOREIGN KEY (`bundle_id`) REFERENCES `bundles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Products (and quantities) that make up a bundle';

-- ----------------------------------------------------------------------------
-- coupons
-- ----------------------------------------------------------------------------
CREATE TABLE `coupons` (
  `id` varchar(64) NOT NULL,
  `code` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('percent','flat','free_delivery') NOT NULL DEFAULT 'percent',
  `value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `max_discount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Cap for percent coupons; 0 = no cap',
  `max_uses` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = unlimited global uses',
  `max_uses_per_user` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = unlimited per user',
  `usage_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
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

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
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
  `role` enum('customer','admin') NOT NULL DEFAULT 'customer',
  `is_blocked` tinyint(1) NOT NULL DEFAULT 0,
  `blocked_at` datetime(6) DEFAULT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `last_used_address_id` varchar(64) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer and admin accounts';

-- ----------------------------------------------------------------------------
-- user_addresses
-- ----------------------------------------------------------------------------
CREATE TABLE `user_addresses` (
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

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
CREATE TABLE `orders` (
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
  `razorpay_amount` int(10) UNSIGNED DEFAULT NULL COMMENT 'Amount in paise',
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

-- ----------------------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------------------
CREATE TABLE `order_items` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` varchar(64) NOT NULL,
  `product_id` varchar(64) DEFAULT NULL COMMENT 'NULL or custom-* when not a catalog product',
  `variant_id` varchar(64) DEFAULT NULL COMMENT 'product_variants.id at time of purchase; NULL when the product has no variants',
  `variant_label` varchar(150) DEFAULT NULL COMMENT 'Snapshot of the variant label (e.g. "3 Month Supply") so it survives later edits/deletes',
  `bundle_id` varchar(64) DEFAULT NULL COMMENT 'bundles.id when this line was purchased as part of a bundle offer',
  `bundle_title` varchar(255) DEFAULT NULL COMMENT 'Snapshot of the bundle title so it survives later edits/deletes',
  `title` varchar(500) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `image` varchar(2048) DEFAULT NULL,
  `is_subscription` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Subscribe & Save line item',
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items on an order with price snapshot at time of purchase';

-- ----------------------------------------------------------------------------
-- order_shipping
-- ----------------------------------------------------------------------------
CREATE TABLE `order_shipping` (
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

-- ----------------------------------------------------------------------------
-- order_status_history
-- ----------------------------------------------------------------------------
CREATE TABLE `order_status_history` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` varchar(64) NOT NULL,
  `status` varchar(50) NOT NULL,
  `changed_at` datetime(6) NOT NULL,
  `changed_by` enum('system','admin','customer') NOT NULL DEFAULT 'system',
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_status_history_order_id` (`order_id`),
  CONSTRAINT `fk_order_status_history_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail of order status transitions';

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
CREATE TABLE `reviews` (
  `id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `user_id` varchar(64) DEFAULT NULL COMMENT 'Reviewer''s account — reviews require sign-in, so this is set on every new review',
  `rating` tinyint(3) UNSIGNED NOT NULL DEFAULT 5,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'True when the reviewer has a non-cancelled order containing this product',
  `comment` text NOT NULL,
  `images` text DEFAULT NULL COMMENT 'JSON array of /uploads/... photo paths the reviewer attached',
  `avatar` varchar(2048) DEFAULT NULL,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_product` (`user_id`, `product_id`),
  KEY `idx_reviews_product_id` (`product_id`),
  KEY `idx_reviews_is_approved` (`is_approved`),
  KEY `idx_reviews_user_id` (`user_id`),
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product reviews';

-- ----------------------------------------------------------------------------
-- promo_banners
-- ----------------------------------------------------------------------------
CREATE TABLE `promo_banners` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `subtitle` varchar(500) DEFAULT NULL,
  `image` varchar(2048) NOT NULL,
  `cta_label` varchar(100) DEFAULT NULL,
  `cta_href` varchar(500) DEFAULT NULL,
  `display_target` enum('slider','stacked','both','product') NOT NULL DEFAULT 'both' COMMENT 'slider/stacked/both for homepage sections, product for a single product page',
  `product_id` varchar(64) DEFAULT NULL COMMENT 'Set together with display_target=product to scope this banner to one product page instead of the homepage',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 99,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_promo_banners_product_id` (`product_id`),
  CONSTRAINT `fk_promo_banners_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Homepage and product-page promotional banners';

-- ----------------------------------------------------------------------------
-- newsletter_subscribers
-- ----------------------------------------------------------------------------
CREATE TABLE `newsletter_subscribers` (
  `id` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `source` varchar(100) NOT NULL DEFAULT 'website',
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_newsletter_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Newsletter email subscribers';

-- ----------------------------------------------------------------------------
-- feedback
-- ----------------------------------------------------------------------------
CREATE TABLE `feedback` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contact page feedback messages';

-- ----------------------------------------------------------------------------
-- auth / security infra
-- ----------------------------------------------------------------------------
CREATE TABLE `email_verification_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_email_verification_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One-time email address verification tokens';

CREATE TABLE `password_reset_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_password_reset_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One-time password reset tokens';

CREATE TABLE `otp_logs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
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

CREATE TABLE `rate_limits` (
  `rate_key` varchar(255) NOT NULL,
  `count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `reset_at` datetime(6) NOT NULL,
  PRIMARY KEY (`rate_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Login/OTP/registration rate limiter counters';

-- Catalog of files uploaded through the admin panel (Media Library page).
-- Missing from schema.sql / earlier migrations, which made GET /api/media fail with a 500.
CREATE TABLE `media_library` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(500) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size_bytes` int(10) unsigned DEFAULT NULL,
  `width` int(10) unsigned DEFAULT NULL,
  `height` int(10) unsigned DEFAULT NULL,
  `alt_text` varchar(255) NOT NULL DEFAULT '',
  `uploaded_by` varchar(100) NOT NULL DEFAULT 'admin',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_media_url` (`url`(255)),
  KEY `idx_media_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin media library';

-- ----------------------------------------------------------------------------
-- site content / CMS tables
-- ----------------------------------------------------------------------------
CREATE TABLE `site_about_story_paragraphs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `paragraph` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='About page story body paragraphs';

CREATE TABLE `site_contact_faqs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='FAQ entries for the site-wide FAQ / contact page';

CREATE TABLE `site_hero_orbit_images` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `url` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Orbiting product images on homepage hero';

CREATE TABLE `site_hero_orbit_products` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Manually chosen products for homepage hero orbit';

CREATE TABLE `site_hero_trust_badges` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `icon` varchar(50) NOT NULL COMMENT 'Icon key e.g. shield, star, leaf, flask',
  `label` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trust badges displayed on homepage hero';

CREATE TABLE `site_instagram_images` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `url` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Instagram section grid images';

CREATE TABLE `site_marquee_items` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `text` varchar(500) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Scrolling brand marquee text items';

CREATE TABLE `site_nav_links` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `href` varchar(2048) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main navigation links';

CREATE TABLE `site_section_toggles` (
  `section_key` varchar(64) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`section_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Homepage section visibility flags, in admin-defined display order';

CREATE TABLE `site_why_choose_benefits` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `icon` varchar(50) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='"Why choose us" benefit tiles on homepage';

CREATE TABLE `site_settings` (
  `id` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
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
  `theme_blush_color` varchar(20) NOT NULL DEFAULT '#DCEEE1' COMMENT 'JSON-facing key: theme.tintColor (gentle backgrounds / decorative blobs) — column name kept for compatibility',
  `theme_background_color` varchar(20) NOT NULL DEFAULT '#FBF9F4',
  `theme_text_color` varchar(20) NOT NULL DEFAULT '#1C1A16',
  `theme_font_heading` varchar(255) NOT NULL DEFAULT '"Manrope", system-ui, sans-serif',
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
  `delivery_return_days` int(10) UNSIGNED NOT NULL DEFAULT 7,
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
  `featured_product_count` int(10) UNSIGNED NOT NULL DEFAULT 8,
  `why_choose_subtitle` varchar(255) NOT NULL,
  `why_choose_title` varchar(255) NOT NULL,
  `why_choose_description` text NOT NULL,
  `why_choose_cta_text` text NOT NULL,
  `quality_promise_badge` varchar(255) NOT NULL COMMENT 'JSON-facing key: certifiedBanner.badge, e.g. FSSAI & GMP Certified',
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
  `video_banner_fit` varchar(20) NOT NULL DEFAULT 'cover' COMMENT '"cover" (fills the banner, may crop) or "contain" (shows the whole frame, letterboxed)',
  `video_banner_width` int(10) UNSIGNED DEFAULT NULL COMMENT 'Detected pixel width of the uploaded video, for reserving layout space without shift',
  `video_banner_height` int(10) UNSIGNED DEFAULT NULL COMMENT 'Detected pixel height of the uploaded video',
  `popup_enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Site-wide on-load announcement popup — off by default, admin opts in',
  `popup_type` varchar(20) NOT NULL DEFAULT 'info' COMMENT '"info", "coupon", "festival", or "product"',
  `popup_title` varchar(255) NOT NULL DEFAULT '',
  `popup_message` text NOT NULL,
  `popup_image` text NOT NULL,
  `popup_cta_label` varchar(255) NOT NULL DEFAULT '',
  `popup_cta_href` text NOT NULL,
  `popup_coupon_code` varchar(50) NOT NULL DEFAULT '',
  `popup_product_id` varchar(64) DEFAULT NULL,
  `popup_delay_seconds` int(10) UNSIGNED NOT NULL DEFAULT 2,
  `popup_frequency` varchar(20) NOT NULL DEFAULT 'session' COMMENT '"session" (once per browser session), "every_visit", or "once" (once ever, per browser)',
  `extras_json` longtext DEFAULT NULL COMMENT 'JSON: newer storefront options',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Single-row site-wide CMS settings';

COMMIT;
