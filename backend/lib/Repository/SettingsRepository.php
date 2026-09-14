<?php

declare(strict_types=1);

namespace Wellness\Repository;

use Wellness\Database;

/**
 * Site settings & CMS content — backed by site_settings + 10 child tables.
 * Mirrors the original single-document JSON structure; always merges with PHP defaults.
 */
final class SettingsRepository
{
    private array $defaults = [
        'siteName'       => 'Wellness Store',
        'brandName'      => 'Wellness Store',
        'brandShort'     => 'WS',
        'brandTagline'   => 'Everyday Wellness, Honestly Made',
        'brandDescription' => 'Clean-label supplements and nutrition, honestly sourced and lab tested for purity.',
        'logo'           => '',
        'favicon'        => '',
        'theme' => [
            'primaryColor'    => '#0F5132',
            'primaryLight'    => '#15803D',
            'primaryDark'     => '#0A3D25',
            'accentColor'     => '#D97706',
            'accentLight'     => '#F59E0B',
            'tintColor'       => '#DCEEE1',
            'backgroundColor' => '#FBF9F4',
            'textColor'       => '#1C1A16',
            'fontHeading'     => '"Manrope", system-ui, sans-serif',
            'fontBody'        => '"Inter", system-ui, sans-serif',
        ],
        'contact' => [
            'email'                   => 'hello@wellnessstore.example',
            'whatsappNumber'          => '+910000000000',
            'whatsappDisplay'         => '+91 00000 00000',
            'whatsappDefaultMessage'  => 'Hi! I have a question about a product.',
            'businessHours'           => 'Mon – Sat: 10:00 AM – 7:00 PM IST',
        ],
        'social' => [
            'instagramHandle'  => 'wellnessstore',
            'instagramUrl'     => 'https://instagram.com/wellnessstore',
            'instagramTagline' => 'Follow us for wellness tips and behind-the-scenes.',
        ],
        'delivery' => [
            'fee'           => 99,
            'freeThreshold' => 1999,
            'returnDays'    => 7,
        ],
        'payments' => [
            'codEnabled'           => true,
            'onlinePaymentEnabled' => true,
        ],
        'services' => [
            'emailEnabled'        => true,
            'otpEnabled'          => true,
            'googleSignInEnabled' => true,
        ],
        'navLinks' => [
            ['label' => 'Home',     'href' => '/'],
            ['label' => 'Shop',     'href' => '/shop'],
            ['label' => 'Reviews',  'href' => '/reviews'],
            ['label' => 'About',    'href' => '/about'],
            ['label' => 'FAQ',      'href' => '/faq'],
            ['label' => 'Contact',  'href' => '/contact'],
        ],
        'sections' => [
            'hero'              => true,
            'videoBanner'       => true,
            'brandMarquee'      => true,
            'banners'           => true,
            'bannerSlider'      => true,
            'featured'          => true,
            'trending'          => true,
            'categories'        => true,
            'bundles'           => true,
            'ritualBuilder'     => true,
            'wellnessJourney'   => true,
            'bodyMap'           => true,
            'sourceTrail'       => true,
            'whyChoose'         => true,
            'certifiedBanner'   => true,
            'reviews'           => true,
            'instagram'         => true,
            'newsletter'        => true,
            'promoBanner'       => true,
        ],
        'promo' => [
            'enabled' => true,
            'text'    => '✦ Free delivery on orders above ₹999. Use code',
            'code'    => 'WELCOME10',
            'suffix'  => 'for 10% off your first order',
            'href'    => '/shop',
        ],
        'hero' => [
            'badge'               => 'FSSAI & Lab Tested',
            'headline'            => 'Wellness, Backed by',
            'headlineAccent'      => 'Science',
            'subheadline'         => 'Clean-label supplements and nutrition, honestly sourced and lab tested for purity.',
            'primaryCta'          => ['label' => 'Shop Now', 'href' => '/shop'],
            'featuredProductId'   => '',
            'images'              => [],
            'productImageIds'     => [],
            'trustBadges'         => [
                ['icon' => 'shield',   'label' => 'FSSAI Certified'],
                ['icon' => 'star',     'label' => '4.9★ Rated'],
                ['icon' => 'sparkles', 'label' => 'Lab Tested'],
            ],
        ],
        // Renders nothing on the storefront until a video is uploaded —
        // safe to leave the section toggle on by default.
        'videoBanner' => [
            'videoUrl'  => '',
            'poster'    => '',
            'title'     => '',
            'subtitle'  => '',
            'ctaLabel'  => '',
            'ctaHref'   => '',
            'fit'       => 'cover', // 'cover' fills the frame (may crop); 'contain' shows the whole video letterboxed
            'width'     => null,    // detected pixel width of the uploaded video
            'height'    => null,    // detected pixel height of the uploaded video
        ],
        'marquee' => [
            'items' => [
                'FSSAI & GMP Certified',
                'Lab Tested Purity',
                'No Added Preservatives',
                'Free Delivery Above ₹999',
                '7-Day Easy Returns',
            ],
        ],
        'featured' => [
            'collectionTitle' => 'Featured Collection',
            'stylesTitle'     => 'Trending Now',
            'viewAllLabel'    => 'View All',
            'productCount'    => 8,
        ],
        'whyChoose' => [
            'subtitle'    => 'Why Choose Us',
            'title'       => 'Wellness You Can Trust',
            'description' => 'From sourcing to lab testing, every step is built around transparency.',
            'benefits'    => [],
            'ctaText'     => "Stay connected with us on Instagram and WhatsApp. We're always happy to help.",
        ],
        'certifiedBanner' => [
            'badge'       => 'FSSAI & GMP Certified',
            'title'       => 'Purity You Can Verify',
            'description' => 'Every product is manufactured in certified facilities and third-party lab tested before it reaches you.',
            'ctaLabel'    => 'See Our Certifications',
            'ctaHref'     => '/about',
            'image'       => '',
        ],
        'newsletter' => [
            'badge'          => 'Exclusive Access',
            'title'          => 'Join Our Wellness Circle',
            'description'    => 'Be the first to hear about new products, offers, and wellness tips.',
            'buttonLabel'    => 'Subscribe',
            'disclaimer'     => 'No spam. Unsubscribe anytime.',
            'successMessage' => 'Thank you for subscribing!',
        ],
        'instagram' => [
            'subtitle'    => '@wellnessstore',
            'title'       => 'Follow Our Journey',
            'description' => 'Wellness tips, product stories & customer love. Join us on Instagram.',
            'stripLabel'  => 'Follow us on Instagram',
            'images'      => [],
        ],
        'about' => [
            'heroTitle'       => 'Our Story',
            'heroDescription' => 'Wellness Store was founded on a simple belief: everyday wellness shouldn\'t mean compromising on purity or transparency.',
            'storyBadge'      => 'The Beginning',
            'storyTitle'      => 'Wellness, Honestly Made',
            'storyParagraphs' => [],
            'storyImage'      => '',
            'missionTitle'    => 'Our Mission',
            'missionText'     => 'To make clean-label, lab-tested wellness products accessible to every household.',
            'visionTitle'     => 'Our Vision',
            'visionText'      => "To become India's most trusted wellness brand, known for transparency and quality.",
            'valuesSubtitle'  => 'What Drives Us',
            'valuesTitle'     => 'Mission & Vision',
        ],
        'contactPage' => [
            'subtitle'    => 'Get in Touch',
            'title'       => 'Contact Us',
            'description' => "We'd love to hear from you. Our team is here to help.",
            'faqs'        => [],
        ],
        'footer' => [
            'tagline'               => 'Everyday Wellness, Honestly Made',
            'description'           => 'Clean-label supplements and nutrition, honestly sourced and lab tested for purity.',
            'newsletterTitle'       => 'Our Wellness Circle',
            'newsletterDescription' => 'Be the first to hear about new products, offers, and wellness tips.',
            'instagramCardText'     => 'Wellness tips, product stories & behind-the-scenes.',
        ],
        'seo' => [
            'title'       => 'Wellness Store | Clean-Label Supplements & Nutrition',
            'description' => 'Clean-label supplements and nutrition, honestly sourced and lab tested for purity.',
        ],
        // Site-wide on-load announcement popup — off by default; an admin
        // has to explicitly enable it from Content Manager. `type` steers
        // which fields the admin form and the storefront modal treat as
        // relevant ("coupon" shows couponCode, "product" shows productId).
        'popup' => [
            'enabled'       => false,
            'type'          => 'info', // 'info' | 'coupon' | 'festival' | 'product'
            'title'         => 'Welcome to Wellness Store',
            'message'       => 'Sign up for our newsletter and get 10% off your first order.',
            'image'         => '',
            'ctaLabel'      => 'Shop Now',
            'ctaHref'       => '/shop',
            'couponCode'    => 'WELCOME10',
            'productId'     => null,
            'delaySeconds'  => 2,
            'frequency'     => 'session', // 'session' | 'every_visit' | 'once'
        ],
    ];

    private function pdo(): \PDO
    {
        return Database::pdo();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    public function get(): array
    {
        try {
            $stored = $this->readFromDb();
        } catch (\Throwable) {
            return $this->defaults;
        }

        if (empty($stored)) {
            return $this->defaults;
        }
        $merged = $this->mergeSettings($this->defaults, $stored);
        // 'sections' key order IS the admin-defined homepage render order (see
        // fetchSections()) — a key-by-key recursive merge would silently fall back
        // to the defaults' fixed order, so replace it wholesale instead.
        if (isset($stored['sections'])) {
            $merged['sections'] = $stored['sections'];
        }
        return $merged;
    }

    public function set(array $changes): array
    {
        $current = $this->get();
        $updated = $this->mergeSettings($current, $changes);
        // Same reasoning as get(): a key-by-key recursive merge updates each
        // section's enabled/disabled value correctly but — because PHP keeps
        // an existing key's original position when only its value changes —
        // silently keeps $current's OLD order, discarding whatever new order
        // the admin just dragged into $changes. This was the exact bug where
        // saving a reordered section list reported "saved" but the order
        // reverted: the values saved fine, only the order was thrown away.
        if (isset($changes['sections'])) {
            $updated['sections'] = $changes['sections'];
        }
        $this->writeToDb($updated);
        return $updated;
    }

    // -------------------------------------------------------------------------
    // DB read
    // -------------------------------------------------------------------------

    private function readFromDb(): array
    {
        $row = $this->pdo()->query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1')->fetch();
        if (!$row) {
            return [];
        }

        $b = fn($v) => (bool) $v;
        $f = fn($v) => (float) $v;
        $i = fn($v) => (int) $v;

        return [
            'siteName'         => $row['site_name'],
            'brandName'        => $row['brand_name'],
            'brandShort'       => $row['brand_short'],
            'brandTagline'     => $row['brand_tagline'],
            'brandDescription' => $row['brand_description'],
            'logo'             => $row['logo'],
            // Fall back to defaults for columns from migration 002 — keeps this
            // endpoint working (not corrupted by PHP warnings) on a database that
            // hasn't been migrated yet, instead of failing every admin page load.
            'favicon'          => $row['favicon'] ?? $this->defaults['favicon'],
            'theme' => [
                'primaryColor'    => $row['theme_primary_color']    ?? $this->defaults['theme']['primaryColor'],
                'primaryLight'    => $row['theme_primary_light']    ?? $this->defaults['theme']['primaryLight'],
                'primaryDark'     => $row['theme_primary_dark']     ?? $this->defaults['theme']['primaryDark'],
                'accentColor'     => $row['theme_accent_color']     ?? $this->defaults['theme']['accentColor'],
                'accentLight'     => $row['theme_accent_light']     ?? $this->defaults['theme']['accentLight'],
                'tintColor'       => $row['theme_blush_color']      ?? $this->defaults['theme']['tintColor'],
                'backgroundColor' => $row['theme_background_color'] ?? $this->defaults['theme']['backgroundColor'],
                'textColor'       => $row['theme_text_color']       ?? $this->defaults['theme']['textColor'],
                'fontHeading'     => $row['theme_font_heading']     ?? $this->defaults['theme']['fontHeading'],
                'fontBody'        => $row['theme_font_body']        ?? $this->defaults['theme']['fontBody'],
            ],
            'contact' => [
                'email'                  => $row['contact_email'],
                'whatsappNumber'         => $row['contact_whatsapp_number'],
                'whatsappDisplay'        => $row['contact_whatsapp_display'],
                'whatsappDefaultMessage' => $row['contact_whatsapp_default_message'],
                'businessHours'          => $row['contact_business_hours'],
            ],
            'social' => [
                'instagramHandle'  => $row['social_instagram_handle'],
                'instagramUrl'     => $row['social_instagram_url'],
                'instagramTagline' => $row['social_instagram_tagline'],
            ],
            'delivery' => [
                'fee'           => $f($row['delivery_fee']),
                'freeThreshold' => $f($row['delivery_free_threshold']),
                'returnDays'    => $i($row['delivery_return_days']),
            ],
            'payments' => [
                'codEnabled'           => $b($row['payments_cod_enabled']),
                'onlinePaymentEnabled' => $b($row['payments_online_payment_enabled']),
            ],
            'services' => [
                'emailEnabled'        => $b($row['services_email_enabled']),
                'otpEnabled'          => $b($row['services_otp_enabled']),
                'googleSignInEnabled' => $b($row['services_google_sign_in_enabled']),
            ],
            'promo' => [
                'enabled' => $b($row['promo_enabled']),
                'text'    => $row['promo_text'],
                'code'    => $row['promo_code'],
                'suffix'  => $row['promo_suffix'],
                'href'    => $row['promo_href'],
            ],
            'hero' => [
                'badge'             => $row['hero_badge'],
                'headline'          => $row['hero_headline'],
                'headlineAccent'    => $row['hero_headline_accent'],
                'subheadline'       => $row['hero_subheadline'],
                'primaryCta'        => ['label' => $row['hero_primary_cta_label'],   'href' => $row['hero_primary_cta_href']],
                'featuredProductId' => $row['hero_featured_product_id'],
                'trustBadges'       => $this->fetchList('site_hero_trust_badges', fn($r) => ['icon' => $r['icon'], 'label' => $r['label']]),
                'images'            => $this->fetchList('site_hero_orbit_images',  fn($r) => $r['url']),
                'productImageIds'   => $this->fetchList('site_hero_orbit_products', fn($r) => $r['product_id']),
            ],
            // Falls back to defaults for columns from migration 005 — keeps
            // this endpoint working on a database that hasn't been migrated
            // yet, same reasoning as favicon/theme above.
            'videoBanner' => [
                'videoUrl' => $row['video_banner_url']    ?? $this->defaults['videoBanner']['videoUrl'],
                'poster'   => $row['video_banner_poster'] ?? $this->defaults['videoBanner']['poster'],
                'title'    => $row['video_banner_title']    ?? $this->defaults['videoBanner']['title'],
                'subtitle' => $row['video_banner_subtitle'] ?? $this->defaults['videoBanner']['subtitle'],
                'ctaLabel' => $row['video_banner_cta_label'] ?? $this->defaults['videoBanner']['ctaLabel'],
                'ctaHref'  => $row['video_banner_cta_href']  ?? $this->defaults['videoBanner']['ctaHref'],
                'fit'      => $row['video_banner_fit'] ?? $this->defaults['videoBanner']['fit'],
                'width'    => isset($row['video_banner_width'])  ? $i($row['video_banner_width'])  : null,
                'height'   => isset($row['video_banner_height']) ? $i($row['video_banner_height']) : null,
            ],
            'marquee' => [
                'items' => $this->fetchList('site_marquee_items', fn($r) => $r['text']),
            ],
            'featured' => [
                'collectionTitle' => $row['featured_collection_title'],
                'stylesTitle'     => $row['featured_styles_title'],
                'viewAllLabel'    => $row['featured_view_all_label'],
                'productCount'    => $i($row['featured_product_count']),
            ],
            'whyChoose' => [
                'subtitle'    => $row['why_choose_subtitle'],
                'title'       => $row['why_choose_title'],
                'description' => $row['why_choose_description'],
                'ctaText'     => $row['why_choose_cta_text'],
                'benefits'    => $this->fetchList('site_why_choose_benefits', fn($r) => [
                    'icon'        => $r['icon'],
                    'title'       => $r['title'],
                    'description' => $r['description'],
                ]),
            ],
            'certifiedBanner' => [
                'badge'       => $row['quality_promise_badge'],
                'title'       => $row['quality_promise_title'],
                'description' => $row['quality_promise_description'],
                'ctaLabel'    => $row['quality_promise_cta_label'],
                'ctaHref'     => $row['quality_promise_cta_href'],
                'image'       => $row['quality_promise_image'],
            ],
            'newsletter' => [
                'badge'          => $row['newsletter_badge'],
                'title'          => $row['newsletter_title'],
                'description'    => $row['newsletter_description'],
                'buttonLabel'    => $row['newsletter_button_label'],
                'disclaimer'     => $row['newsletter_disclaimer'],
                'successMessage' => $row['newsletter_success_message'],
            ],
            'instagram' => [
                'subtitle'    => $row['instagram_subtitle'],
                'title'       => $row['instagram_title'],
                'description' => $row['instagram_description'],
                'stripLabel'  => $row['instagram_strip_label'],
                'images'      => $this->fetchList('site_instagram_images', fn($r) => $r['url']),
            ],
            'about' => [
                'heroTitle'       => $row['about_hero_title'],
                'heroDescription' => $row['about_hero_description'],
                'storyBadge'      => $row['about_story_badge'],
                'storyTitle'      => $row['about_story_title'],
                'storyParagraphs' => $this->fetchList('site_about_story_paragraphs', fn($r) => $r['paragraph']),
                'storyImage'      => $row['about_story_image'],
                'missionTitle'    => $row['about_mission_title'],
                'missionText'     => $row['about_mission_text'],
                'visionTitle'     => $row['about_vision_title'],
                'visionText'      => $row['about_vision_text'],
                'valuesSubtitle'  => $row['about_values_subtitle'],
                'valuesTitle'     => $row['about_values_title'],
            ],
            'contactPage' => [
                'subtitle'    => $row['contact_page_subtitle'],
                'title'       => $row['contact_page_title'],
                'description' => $row['contact_page_description'],
                'faqs'        => $this->fetchList('site_contact_faqs', fn($r) => ['question' => $r['question'], 'answer' => $r['answer']]),
            ],
            'footer' => [
                'tagline'               => $row['footer_tagline'],
                'description'           => $row['footer_description'],
                'newsletterTitle'       => $row['footer_newsletter_title'],
                'newsletterDescription' => $row['footer_newsletter_description'],
                'instagramCardText'     => $row['footer_instagram_card_text'],
            ],
            'seo' => [
                'title'       => $row['seo_title'],
                'description' => $row['seo_description'],
            ],
            'popup' => [
                'enabled'      => $b($row['popup_enabled'] ?? false),
                'type'         => $row['popup_type']         ?? $this->defaults['popup']['type'],
                'title'        => $row['popup_title']        ?? $this->defaults['popup']['title'],
                'message'      => $row['popup_message']      ?? $this->defaults['popup']['message'],
                'image'        => $row['popup_image']        ?? $this->defaults['popup']['image'],
                'ctaLabel'     => $row['popup_cta_label']    ?? $this->defaults['popup']['ctaLabel'],
                'ctaHref'      => $row['popup_cta_href']     ?? $this->defaults['popup']['ctaHref'],
                'couponCode'   => $row['popup_coupon_code']  ?? $this->defaults['popup']['couponCode'],
                'productId'    => $row['popup_product_id']   ?? null,
                'delaySeconds' => isset($row['popup_delay_seconds']) ? $i($row['popup_delay_seconds']) : $this->defaults['popup']['delaySeconds'],
                'frequency'    => $row['popup_frequency']    ?? $this->defaults['popup']['frequency'],
            ],
            'navLinks' => $this->fetchList('site_nav_links',  fn($r) => ['label' => $r['label'], 'href' => $r['href']]),
            'sections'  => $this->fetchSections(),
        ];
    }

    private function fetchList(string $table, callable $mapper): array
    {
        $stmt = $this->pdo()->query("SELECT * FROM `{$table}` ORDER BY sort_order ASC");
        return array_map($mapper, $stmt->fetchAll());
    }

    private function fetchSections(): array
    {
        // Ordered by sort_order so the JSON object's key order (preserved by both
        // PHP associative arrays and JS objects) IS the admin-defined section order —
        // the frontend renders sections by iterating this object, no separate field needed.
        $stmt = $this->pdo()->query('SELECT section_key, is_enabled FROM site_section_toggles ORDER BY sort_order ASC');
        $rows = $stmt->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            $result[$row['section_key']] = (bool) $row['is_enabled'];
        }
        return $result;
    }

    // -------------------------------------------------------------------------
    // DB write
    // -------------------------------------------------------------------------

    private function writeToDb(array $s): void
    {
        $pdo = $this->pdo();
        $now = gmdate('Y-m-d H:i:s');

        // Upsert singleton row
        $sql = 'INSERT INTO site_settings (
            id,
            site_name, brand_name, brand_short, brand_tagline, brand_description, logo, favicon,
            theme_primary_color, theme_primary_light, theme_primary_dark,
            theme_accent_color, theme_accent_light, theme_blush_color,
            theme_background_color, theme_text_color, theme_font_heading, theme_font_body,
            contact_email, contact_whatsapp_number, contact_whatsapp_display,
            contact_whatsapp_default_message, contact_business_hours,
            social_instagram_handle, social_instagram_url, social_instagram_tagline,
            delivery_fee, delivery_free_threshold, delivery_return_days,
            payments_cod_enabled, payments_online_payment_enabled,
            services_email_enabled, services_otp_enabled, services_google_sign_in_enabled,
            promo_enabled, promo_text, promo_code, promo_suffix, promo_href,
            hero_badge, hero_headline, hero_headline_accent, hero_subheadline,
            hero_primary_cta_label, hero_primary_cta_href,
            hero_secondary_cta_label, hero_secondary_cta_href,
            hero_featured_product_id, hero_scroll_cue, hero_video_url, hero_video_poster,
            featured_collection_title, featured_styles_title, featured_view_all_label, featured_product_count,
            why_choose_subtitle, why_choose_title, why_choose_description, why_choose_cta_text,
            quality_promise_badge, quality_promise_title, quality_promise_description,
            quality_promise_cta_label, quality_promise_cta_href, quality_promise_image,
            newsletter_badge, newsletter_title, newsletter_description,
            newsletter_button_label, newsletter_disclaimer, newsletter_success_message,
            instagram_subtitle, instagram_title, instagram_description, instagram_strip_label,
            about_hero_title, about_hero_description, about_story_badge, about_story_title,
            about_story_image, about_mission_title, about_mission_text,
            about_vision_title, about_vision_text, about_values_subtitle, about_values_title,
            contact_page_subtitle, contact_page_title, contact_page_description,
            footer_tagline, footer_description, footer_newsletter_title,
            footer_newsletter_description, footer_instagram_card_text,
            seo_title, seo_description,
            video_banner_url, video_banner_poster, video_banner_title, video_banner_subtitle,
            video_banner_cta_label, video_banner_cta_href, video_banner_fit,
            video_banner_width, video_banner_height,
            popup_enabled, popup_type, popup_title, popup_message, popup_image,
            popup_cta_label, popup_cta_href, popup_coupon_code, popup_product_id,
            popup_delay_seconds, popup_frequency,
            updated_at
        ) VALUES (
            1,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?
        ) ON DUPLICATE KEY UPDATE
            site_name = VALUES(site_name), brand_name = VALUES(brand_name),
            brand_short = VALUES(brand_short), brand_tagline = VALUES(brand_tagline),
            brand_description = VALUES(brand_description), logo = VALUES(logo), favicon = VALUES(favicon),
            theme_primary_color = VALUES(theme_primary_color), theme_primary_light = VALUES(theme_primary_light),
            theme_primary_dark = VALUES(theme_primary_dark), theme_accent_color = VALUES(theme_accent_color),
            theme_accent_light = VALUES(theme_accent_light), theme_blush_color = VALUES(theme_blush_color),
            theme_background_color = VALUES(theme_background_color), theme_text_color = VALUES(theme_text_color),
            theme_font_heading = VALUES(theme_font_heading), theme_font_body = VALUES(theme_font_body),
            contact_email = VALUES(contact_email), contact_whatsapp_number = VALUES(contact_whatsapp_number),
            contact_whatsapp_display = VALUES(contact_whatsapp_display),
            contact_whatsapp_default_message = VALUES(contact_whatsapp_default_message),
            contact_business_hours = VALUES(contact_business_hours),
            social_instagram_handle = VALUES(social_instagram_handle),
            social_instagram_url = VALUES(social_instagram_url),
            social_instagram_tagline = VALUES(social_instagram_tagline),
            delivery_fee = VALUES(delivery_fee), delivery_free_threshold = VALUES(delivery_free_threshold),
            delivery_return_days = VALUES(delivery_return_days),
            payments_cod_enabled = VALUES(payments_cod_enabled),
            payments_online_payment_enabled = VALUES(payments_online_payment_enabled),
            services_email_enabled = VALUES(services_email_enabled),
            services_otp_enabled = VALUES(services_otp_enabled),
            services_google_sign_in_enabled = VALUES(services_google_sign_in_enabled),
            promo_enabled = VALUES(promo_enabled), promo_text = VALUES(promo_text),
            promo_code = VALUES(promo_code), promo_suffix = VALUES(promo_suffix), promo_href = VALUES(promo_href),
            hero_badge = VALUES(hero_badge), hero_headline = VALUES(hero_headline),
            hero_headline_accent = VALUES(hero_headline_accent), hero_subheadline = VALUES(hero_subheadline),
            hero_primary_cta_label = VALUES(hero_primary_cta_label), hero_primary_cta_href = VALUES(hero_primary_cta_href),
            hero_secondary_cta_label = VALUES(hero_secondary_cta_label), hero_secondary_cta_href = VALUES(hero_secondary_cta_href),
            hero_featured_product_id = VALUES(hero_featured_product_id), hero_scroll_cue = VALUES(hero_scroll_cue),
            hero_video_url = VALUES(hero_video_url), hero_video_poster = VALUES(hero_video_poster),
            featured_collection_title = VALUES(featured_collection_title),
            featured_styles_title = VALUES(featured_styles_title),
            featured_view_all_label = VALUES(featured_view_all_label),
            featured_product_count = VALUES(featured_product_count),
            why_choose_subtitle = VALUES(why_choose_subtitle), why_choose_title = VALUES(why_choose_title),
            why_choose_description = VALUES(why_choose_description), why_choose_cta_text = VALUES(why_choose_cta_text),
            quality_promise_badge = VALUES(quality_promise_badge), quality_promise_title = VALUES(quality_promise_title),
            quality_promise_description = VALUES(quality_promise_description),
            quality_promise_cta_label = VALUES(quality_promise_cta_label), quality_promise_cta_href = VALUES(quality_promise_cta_href),
            quality_promise_image = VALUES(quality_promise_image),
            newsletter_badge = VALUES(newsletter_badge), newsletter_title = VALUES(newsletter_title),
            newsletter_description = VALUES(newsletter_description),
            newsletter_button_label = VALUES(newsletter_button_label),
            newsletter_disclaimer = VALUES(newsletter_disclaimer),
            newsletter_success_message = VALUES(newsletter_success_message),
            instagram_subtitle = VALUES(instagram_subtitle), instagram_title = VALUES(instagram_title),
            instagram_description = VALUES(instagram_description), instagram_strip_label = VALUES(instagram_strip_label),
            about_hero_title = VALUES(about_hero_title), about_hero_description = VALUES(about_hero_description),
            about_story_badge = VALUES(about_story_badge), about_story_title = VALUES(about_story_title),
            about_story_image = VALUES(about_story_image), about_mission_title = VALUES(about_mission_title),
            about_mission_text = VALUES(about_mission_text), about_vision_title = VALUES(about_vision_title),
            about_vision_text = VALUES(about_vision_text), about_values_subtitle = VALUES(about_values_subtitle),
            about_values_title = VALUES(about_values_title),
            contact_page_subtitle = VALUES(contact_page_subtitle), contact_page_title = VALUES(contact_page_title),
            contact_page_description = VALUES(contact_page_description),
            footer_tagline = VALUES(footer_tagline), footer_description = VALUES(footer_description),
            footer_newsletter_title = VALUES(footer_newsletter_title),
            footer_newsletter_description = VALUES(footer_newsletter_description),
            footer_instagram_card_text = VALUES(footer_instagram_card_text),
            seo_title = VALUES(seo_title), seo_description = VALUES(seo_description),
            video_banner_url = VALUES(video_banner_url), video_banner_poster = VALUES(video_banner_poster),
            video_banner_title = VALUES(video_banner_title), video_banner_subtitle = VALUES(video_banner_subtitle),
            video_banner_cta_label = VALUES(video_banner_cta_label), video_banner_cta_href = VALUES(video_banner_cta_href),
            video_banner_fit = VALUES(video_banner_fit),
            video_banner_width = VALUES(video_banner_width), video_banner_height = VALUES(video_banner_height),
            popup_enabled = VALUES(popup_enabled), popup_type = VALUES(popup_type),
            popup_title = VALUES(popup_title), popup_message = VALUES(popup_message), popup_image = VALUES(popup_image),
            popup_cta_label = VALUES(popup_cta_label), popup_cta_href = VALUES(popup_cta_href),
            popup_coupon_code = VALUES(popup_coupon_code), popup_product_id = VALUES(popup_product_id),
            popup_delay_seconds = VALUES(popup_delay_seconds), popup_frequency = VALUES(popup_frequency),
            updated_at = VALUES(updated_at)';

        $c  = $s['contact']  ?? [];
        $so = $s['social']   ?? [];
        $d  = $s['delivery'] ?? [];
        $p  = $s['payments'] ?? [];
        $sv = $s['services'] ?? [];
        $pr = $s['promo']    ?? [];
        $h  = $s['hero']     ?? [];
        $fe = $s['featured'] ?? [];
        $wc = $s['whyChoose']       ?? [];
        $at = $s['certifiedBanner'] ?? [];
        $nl = $s['newsletter']        ?? [];
        $ig = $s['instagram']         ?? [];
        $ab = $s['about']             ?? [];
        $cp = $s['contactPage']       ?? [];
        $fo = $s['footer']            ?? [];
        $se = $s['seo']               ?? [];
        $th = $s['theme']             ?? [];
        $vb = $s['videoBanner']       ?? [];
        $pu = $s['popup']             ?? [];
        $pc = $h['primaryCta']   ?? [];
        $sc = $h['secondaryCta'] ?? [];

        $pdo->prepare($sql)->execute([
            $s['siteName'] ?? '', $s['brandName'] ?? '', $s['brandShort'] ?? '',
            $s['brandTagline'] ?? '', $s['brandDescription'] ?? '', $s['logo'] ?? '', $s['favicon'] ?? '',
            $th['primaryColor'] ?? '#0F5132', $th['primaryLight'] ?? '#15803D', $th['primaryDark'] ?? '#0A3D25',
            $th['accentColor'] ?? '#D97706', $th['accentLight'] ?? '#F59E0B', $th['tintColor'] ?? '#DCEEE1',
            $th['backgroundColor'] ?? '#FBF9F4', $th['textColor'] ?? '#1C1A16',
            $th['fontHeading'] ?? '"Manrope", system-ui, sans-serif',
            $th['fontBody'] ?? '"Inter", system-ui, sans-serif',
            $c['email'] ?? '', $c['whatsappNumber'] ?? '', $c['whatsappDisplay'] ?? '',
            $c['whatsappDefaultMessage'] ?? '', $c['businessHours'] ?? '',
            $so['instagramHandle'] ?? '', $so['instagramUrl'] ?? '', $so['instagramTagline'] ?? '',
            (float) ($d['fee'] ?? 99), (float) ($d['freeThreshold'] ?? 1999), (int) ($d['returnDays'] ?? 7),
            ($p['codEnabled'] ?? true) ? 1 : 0,
            ($p['onlinePaymentEnabled'] ?? true) ? 1 : 0,
            ($sv['emailEnabled'] ?? true) ? 1 : 0,
            ($sv['otpEnabled'] ?? true) ? 1 : 0,
            ($sv['googleSignInEnabled'] ?? true) ? 1 : 0,
            ($pr['enabled'] ?? true) ? 1 : 0,
            $pr['text'] ?? '', $pr['code'] ?? '', $pr['suffix'] ?? '', $pr['href'] ?? '',
            $h['badge'] ?? '', $h['headline'] ?? '', $h['headlineAccent'] ?? '', $h['subheadline'] ?? '',
            $pc['label'] ?? '', $pc['href'] ?? '',
            $sc['label'] ?? '', $sc['href'] ?? '',
            $h['featuredProductId'] ?? null, $h['scrollCue'] ?? '',
            $h['videoUrl'] ?? '', $h['videoPoster'] ?? '',
            $fe['collectionTitle'] ?? '', $fe['stylesTitle'] ?? '',
            $fe['viewAllLabel'] ?? '', (int) ($fe['productCount'] ?? 8),
            $wc['subtitle'] ?? '', $wc['title'] ?? '',
            $wc['description'] ?? '', $wc['ctaText'] ?? '',
            $at['badge'] ?? '', $at['title'] ?? '', $at['description'] ?? '',
            $at['ctaLabel'] ?? '', $at['ctaHref'] ?? '', $at['image'] ?? '',
            $nl['badge'] ?? '', $nl['title'] ?? '', $nl['description'] ?? '',
            $nl['buttonLabel'] ?? '', $nl['disclaimer'] ?? '', $nl['successMessage'] ?? '',
            $ig['subtitle'] ?? '', $ig['title'] ?? '',
            $ig['description'] ?? '', $ig['stripLabel'] ?? '',
            $ab['heroTitle'] ?? '', $ab['heroDescription'] ?? '',
            $ab['storyBadge'] ?? '', $ab['storyTitle'] ?? '',
            $ab['storyImage'] ?? '', $ab['missionTitle'] ?? '', $ab['missionText'] ?? '',
            $ab['visionTitle'] ?? '', $ab['visionText'] ?? '',
            $ab['valuesSubtitle'] ?? '', $ab['valuesTitle'] ?? '',
            $cp['subtitle'] ?? '', $cp['title'] ?? '', $cp['description'] ?? '',
            $fo['tagline'] ?? '', $fo['description'] ?? '',
            $fo['newsletterTitle'] ?? '', $fo['newsletterDescription'] ?? '',
            $fo['instagramCardText'] ?? '',
            $se['title'] ?? '', $se['description'] ?? '',
            $vb['videoUrl'] ?? '', $vb['poster'] ?? '', $vb['title'] ?? '', $vb['subtitle'] ?? '',
            $vb['ctaLabel'] ?? '', $vb['ctaHref'] ?? '', $vb['fit'] ?? 'cover',
            isset($vb['width']) && $vb['width'] !== null ? (int) $vb['width'] : null,
            isset($vb['height']) && $vb['height'] !== null ? (int) $vb['height'] : null,
            ($pu['enabled'] ?? false) ? 1 : 0, $pu['type'] ?? 'info',
            $pu['title'] ?? '', $pu['message'] ?? '', $pu['image'] ?? '',
            $pu['ctaLabel'] ?? '', $pu['ctaHref'] ?? '', $pu['couponCode'] ?? '',
            isset($pu['productId']) && $pu['productId'] !== null ? $pu['productId'] : null,
            (int) ($pu['delaySeconds'] ?? 2), $pu['frequency'] ?? 'session',
            $now,
        ]);

        // Replace child lists
        $this->replaceList('site_nav_links', $s['navLinks'] ?? [], function (\PDOStatement $stmt, array $item, int $i) {
            $stmt->execute([$item['label'] ?? '', $item['href'] ?? '', $i]);
        }, 'INSERT INTO site_nav_links (label, href, sort_order) VALUES (?, ?, ?)');

        $this->replaceSections($s['sections'] ?? []);

        $this->replaceList('site_hero_trust_badges', $h['trustBadges'] ?? [], function (\PDOStatement $stmt, array $item, int $i) {
            $stmt->execute([$item['icon'] ?? '', $item['label'] ?? '', $i]);
        }, 'INSERT INTO site_hero_trust_badges (icon, label, sort_order) VALUES (?, ?, ?)');

        $this->replaceList('site_hero_orbit_images', $h['images'] ?? [], function (\PDOStatement $stmt, string $url, int $i) {
            $stmt->execute([$url, $i]);
        }, 'INSERT INTO site_hero_orbit_images (url, sort_order) VALUES (?, ?)');

        $this->replaceList('site_hero_orbit_products', $h['productImageIds'] ?? [], function (\PDOStatement $stmt, string $productId, int $i) {
            $stmt->execute([$productId, $i]);
        }, 'INSERT INTO site_hero_orbit_products (product_id, sort_order) VALUES (?, ?)');

        $this->replaceList('site_marquee_items', $s['marquee']['items'] ?? [], function (\PDOStatement $stmt, string $text, int $i) {
            $stmt->execute([$text, $i]);
        }, 'INSERT INTO site_marquee_items (text, sort_order) VALUES (?, ?)');

        $this->replaceList('site_why_choose_benefits', $wc['benefits'] ?? [], function (\PDOStatement $stmt, array $item, int $i) {
            $stmt->execute([$item['icon'] ?? '', $item['title'] ?? '', $item['description'] ?? '', $i]);
        }, 'INSERT INTO site_why_choose_benefits (icon, title, description, sort_order) VALUES (?, ?, ?, ?)');

        $this->replaceList('site_instagram_images', $ig['images'] ?? [], function (\PDOStatement $stmt, string $url, int $i) {
            $stmt->execute([$url, $i]);
        }, 'INSERT INTO site_instagram_images (url, sort_order) VALUES (?, ?)');

        $this->replaceList('site_about_story_paragraphs', $ab['storyParagraphs'] ?? [], function (\PDOStatement $stmt, string $para, int $i) {
            $stmt->execute([$para, $i]);
        }, 'INSERT INTO site_about_story_paragraphs (paragraph, sort_order) VALUES (?, ?)');

        $this->replaceList('site_contact_faqs', $cp['faqs'] ?? [], function (\PDOStatement $stmt, array $item, int $i) {
            $stmt->execute([$item['question'] ?? '', $item['answer'] ?? '', $i]);
        }, 'INSERT INTO site_contact_faqs (question, answer, sort_order) VALUES (?, ?, ?)');
    }

    private function replaceList(string $table, array $items, callable $inserter, string $insertSql): void
    {
        $pdo = $this->pdo();
        $pdo->exec("DELETE FROM `{$table}`");
        if (!$items) {
            return;
        }
        $stmt = $pdo->prepare($insertSql);
        foreach (array_values($items) as $i => $item) {
            $inserter($stmt, $item, $i);
        }
    }

    private function replaceSections(array $sections): void
    {
        $pdo = $this->pdo();
        $pdo->exec('DELETE FROM site_section_toggles');
        if (!$sections) {
            return;
        }
        $stmt = $pdo->prepare('INSERT INTO site_section_toggles (section_key, is_enabled, sort_order) VALUES (?, ?, ?)');
        $i = 0;
        foreach ($sections as $key => $enabled) {
            $stmt->execute([$key, $enabled ? 1 : 0, $i]);
            $i++;
        }
    }

    // -------------------------------------------------------------------------
    // Deep-merge: associative arrays recurse; lists replace entirely.
    // -------------------------------------------------------------------------
    private function mergeSettings(array $base, array $overrides): array
    {
        foreach ($overrides as $key => $value) {
            if (is_array($value)) {
                if (array_is_list($value)) {
                    $base[$key] = $value;
                } elseif (isset($base[$key]) && is_array($base[$key])) {
                    $base[$key] = $this->mergeSettings($base[$key], $value);
                } else {
                    $base[$key] = $value;
                }
            } else {
                $base[$key] = $value;
            }
        }
        return $base;
    }
}
