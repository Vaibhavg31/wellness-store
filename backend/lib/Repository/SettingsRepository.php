<?php

declare(strict_types=1);

namespace Krivea\Repository;

use Krivea\Database;

/**
 * Site settings & CMS content — backed by site_settings + 10 child tables.
 * Mirrors the original single-document JSON structure; always merges with PHP defaults.
 */
final class SettingsRepository
{
    private array $defaults = [
        'siteName'       => 'Krivea Jewels',
        'brandName'      => 'Krivea Jewels',
        'brandShort'     => 'Krivea',
        'brandTagline'   => 'Krivea Jewels. Wear the Sparkle.',
        'brandDescription' => 'Premium anti-tarnish jewellery crafted for the modern woman, where everyday life sparkles.',
        'logo'           => '/krivea-logo-transparent.png',
        'favicon'        => '',
        'theme' => [
            'primaryColor'    => '#5A0009',
            'primaryLight'    => '#7A000F',
            'primaryDark'     => '#3E0007',
            'accentColor'     => '#D9B26F',
            'accentLight'     => '#E8CC91',
            'blushColor'      => '#F2B8B5',
            'backgroundColor' => '#FDF6F0',
            'textColor'       => '#231414',
            'fontHeading'     => '"Cormorant Garamond", Georgia, serif',
            'fontBody'        => '"Inter", system-ui, sans-serif',
        ],
        'contact' => [
            'email'                   => 'hello@kriveajewels.com',
            'whatsappNumber'          => '+916353259781',
            'whatsappDisplay'         => '+91 63532 59781',
            'whatsappDefaultMessage'  => 'Hello Krivea Jewels! I visited your website and have an enquiry about your jewellery collection. Could you please help me?',
            'businessHours'           => 'Mon – Sat: 10:00 AM – 8:00 PM IST',
        ],
        'social' => [
            'instagramHandle'  => 'krivea.jewels_',
            'instagramUrl'     => 'https://www.instagram.com/krivea.jewels_',
            'instagramTagline' => 'New drops, styling reels & customer love. Join us on Instagram.',
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
            'brandMarquee'      => true,
            'banners'           => true,
            'bannerSlider'      => true,
            'jewelExplorer3D'   => true,
            'dayInHerSparkle'   => true,
            'featured'          => true,
            'trending'          => true,
            'categories'        => true,
            'whyChoose'         => true,
            'antiTarnishBanner' => true,
            'reviews'           => true,
            'instagram'         => true,
            'newsletter'        => true,
            'promoBanner'       => true,
        ],
        'promo' => [
            'enabled' => true,
            'text'    => '✦ Free delivery on orders above ₹1,999. Use code',
            'code'    => 'SPARKLE10',
            'suffix'  => 'for 10% off your first order',
            'href'    => '/shop',
        ],
        'hero' => [
            'badge'               => 'New Heritage Collection 2026',
            'headline'            => 'Wear the',
            'headlineAccent'      => 'Sparkle',
            'subheadline'         => 'Krivea Jewels. Wear the Sparkle. Discover anti-tarnish pieces crafted for everyday elegance.',
            'primaryCta'          => ['label' => 'Shop Now', 'href' => '/shop'],
            'secondaryCta'        => ['label' => 'Featured Piece', 'href' => ''],
            'featuredProductId'   => '',
            'scrollCue'           => 'Explore in 3D ↓',
            'videoUrl'            => 'https://videos.pexels.com/video-files/4963454/4963454-sd_640_360_24fps.mp4',
            'videoPoster'         => 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=85',
            'orbitImages'         => [],
            'orbitProductIds'     => [],
            'trustBadges'         => [
                ['icon' => 'shield',   'label' => 'Anti-Tarnish'],
                ['icon' => 'star',     'label' => '4.9★ Rated'],
                ['icon' => 'sparkles', 'label' => 'Premium Finish'],
            ],
        ],
        'marquee' => [
            'items' => [
                'Anti-Tarnish Technology',
                'Wear the Sparkle',
                'Premium PVD Coating',
                'Hypoallergenic',
                'Lifetime Shine',
                'Luxury Gift Packaging',
                'Free Delivery Above ₹1999',
            ],
        ],
        'featured' => [
            'collectionTitle' => 'Everyday Krivea Collection',
            'stylesTitle'     => 'Krivea Top Styles',
            'viewAllLabel'    => 'View All',
            'productCount'    => 8,
        ],
        'whyChoose' => [
            'subtitle'    => 'The Krivea Difference',
            'title'       => 'Why Choose Krivea',
            'description' => 'Premium anti-tarnish jewellery made for everyday Indian life: shower-safe, skin-friendly, and always sparkling.',
            'benefits'    => [],
            'ctaText'     => "Stay connected with us on Instagram and WhatsApp. We're always happy to help.",
        ],
        'antiTarnishBanner' => [
            'badge'       => 'PVD Technology',
            'title'       => 'Shine That Never Fades',
            'description' => 'Our proprietary Physical Vapour Deposition coating creates an invisible barrier against oxidation, so your jewellery stays radiant through everyday wear, water exposure, and the test of time.',
            'ctaLabel'    => 'Explore the Collection',
            'ctaHref'     => '/shop',
            'image'       => 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=80',
        ],
        'dayInHerSparkle' => [
            'eyebrow'     => 'A Day in Her Sparkle',
            'title'       => 'Still Sparkling, Every Hour',
            'description' => 'One piece, one day, zero tarnish: sunrise to last call.',
            'productId'   => '',
            'ctaLabel'    => 'Shop This Piece',
            'stages'      => [],
        ],
        'newsletter' => [
            'badge'          => 'Exclusive Access',
            'title'          => 'Join the Krivea Circle',
            'description'    => 'Be the first to discover new collections, exclusive offers, and styling tips from our jewellery experts.',
            'buttonLabel'    => 'Subscribe',
            'disclaimer'     => 'No spam. Unsubscribe anytime.',
            'successMessage' => 'Thank you for subscribing! Welcome to the Krivea family.',
        ],
        'instagram' => [
            'subtitle'    => '@krivea.jewels_',
            'title'       => 'Follow Our Journey',
            'description' => 'New drops, styling reels & customer love. Join us on Instagram.',
            'stripLabel'  => 'Follow us on Instagram',
            'images'      => [],
        ],
        'about' => [
            'heroTitle'       => 'Our Story',
            'heroDescription' => 'Born from a passion for timeless beauty and modern innovation, Krivea Jewels redefines affordable luxury with our signature anti-tarnish technology.',
            'storyBadge'      => 'The Beginning',
            'storyTitle'      => 'A Vision of Eternal Shine',
            'storyParagraphs' => [],
            'storyImage'      => 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80',
            'missionTitle'    => 'Our Mission',
            'missionText'     => 'To democratize luxury by creating premium, anti-tarnish jewellery that empowers every woman to express her unique elegance, without compromising on quality.',
            'visionTitle'     => 'Our Vision',
            'visionText'      => "To become India's most trusted anti-tarnish jewellery brand, known for exceptional craftsmanship and innovative technology.",
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
            'tagline'               => 'Krivea Jewels. Wear the Sparkle.',
            'description'           => 'Premium anti-tarnish jewellery crafted for the modern woman, where every day sparkles.',
            'newsletterTitle'       => 'The Krivea Circle',
            'newsletterDescription' => 'Be the first to discover new collections, exclusive offers, and styling inspiration.',
            'instagramCardText'     => 'New drops, styling reels & behind-the-scenes from Krivea.',
        ],
        'seo' => [
            'title'       => 'Krivea Jewels | Premium Anti-Tarnish Jewellery | Wear the Sparkle',
            'description' => 'Premium anti-tarnish jewellery crafted for the modern woman, where everyday life sparkles.',
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
                'blushColor'      => $row['theme_blush_color']      ?? $this->defaults['theme']['blushColor'],
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
                'secondaryCta'      => ['label' => $row['hero_secondary_cta_label'], 'href' => $row['hero_secondary_cta_href']],
                'featuredProductId' => $row['hero_featured_product_id'],
                'scrollCue'         => $row['hero_scroll_cue'],
                'videoUrl'          => $row['hero_video_url'],
                'videoPoster'       => $row['hero_video_poster'],
                'trustBadges'       => $this->fetchList('site_hero_trust_badges', fn($r) => ['icon' => $r['icon'], 'label' => $r['label']]),
                'orbitImages'       => $this->fetchList('site_hero_orbit_images',  fn($r) => $r['url']),
                'orbitProductIds'   => $this->fetchList('site_hero_orbit_products', fn($r) => $r['product_id']),
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
            'antiTarnishBanner' => [
                'badge'       => $row['anti_tarnish_badge'],
                'title'       => $row['anti_tarnish_title'],
                'description' => $row['anti_tarnish_description'],
                'ctaLabel'    => $row['anti_tarnish_cta_label'],
                'ctaHref'     => $row['anti_tarnish_cta_href'],
                'image'       => $row['anti_tarnish_image'],
            ],
            'dayInHerSparkle' => [
                'eyebrow'     => $row['day_sparkle_eyebrow'],
                'title'       => $row['day_sparkle_title'],
                'description' => $row['day_sparkle_description'],
                'productId'   => $row['day_sparkle_product_id'],
                'ctaLabel'    => $row['day_sparkle_cta_label'],
                'stages'      => $this->fetchList('site_day_sparkle_stages', fn($r) => [
                    'id'        => $r['stage_key'],
                    'timeLabel' => $r['time_label'],
                    'label'     => $r['label'],
                    'copy'      => $r['copy'],
                    'image'     => $r['image'],
                ]),
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
            anti_tarnish_badge, anti_tarnish_title, anti_tarnish_description,
            anti_tarnish_cta_label, anti_tarnish_cta_href, anti_tarnish_image,
            day_sparkle_eyebrow, day_sparkle_title, day_sparkle_description,
            day_sparkle_product_id, day_sparkle_cta_label,
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
            ?, ?,
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
            anti_tarnish_badge = VALUES(anti_tarnish_badge), anti_tarnish_title = VALUES(anti_tarnish_title),
            anti_tarnish_description = VALUES(anti_tarnish_description),
            anti_tarnish_cta_label = VALUES(anti_tarnish_cta_label), anti_tarnish_cta_href = VALUES(anti_tarnish_cta_href),
            anti_tarnish_image = VALUES(anti_tarnish_image),
            day_sparkle_eyebrow = VALUES(day_sparkle_eyebrow), day_sparkle_title = VALUES(day_sparkle_title),
            day_sparkle_description = VALUES(day_sparkle_description),
            day_sparkle_product_id = VALUES(day_sparkle_product_id), day_sparkle_cta_label = VALUES(day_sparkle_cta_label),
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
            updated_at = VALUES(updated_at)';

        $c  = $s['contact']  ?? [];
        $so = $s['social']   ?? [];
        $d  = $s['delivery'] ?? [];
        $p  = $s['payments'] ?? [];
        $sv = $s['services'] ?? [];
        $pr = $s['promo']    ?? [];
        $h  = $s['hero']     ?? [];
        $fe = $s['featured'] ?? [];
        $wc = $s['whyChoose']         ?? [];
        $at = $s['antiTarnishBanner'] ?? [];
        $ds = $s['dayInHerSparkle']   ?? [];
        $nl = $s['newsletter']        ?? [];
        $ig = $s['instagram']         ?? [];
        $ab = $s['about']             ?? [];
        $cp = $s['contactPage']       ?? [];
        $fo = $s['footer']            ?? [];
        $se = $s['seo']               ?? [];
        $th = $s['theme']             ?? [];
        $pc = $h['primaryCta']   ?? [];
        $sc = $h['secondaryCta'] ?? [];

        $pdo->prepare($sql)->execute([
            $s['siteName'] ?? '', $s['brandName'] ?? '', $s['brandShort'] ?? '',
            $s['brandTagline'] ?? '', $s['brandDescription'] ?? '', $s['logo'] ?? '', $s['favicon'] ?? '',
            $th['primaryColor'] ?? '#5A0009', $th['primaryLight'] ?? '#7A000F', $th['primaryDark'] ?? '#3E0007',
            $th['accentColor'] ?? '#D9B26F', $th['accentLight'] ?? '#E8CC91', $th['blushColor'] ?? '#F2B8B5',
            $th['backgroundColor'] ?? '#FDF6F0', $th['textColor'] ?? '#231414',
            $th['fontHeading'] ?? '"Cormorant Garamond", Georgia, serif',
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
            $ds['eyebrow'] ?? '', $ds['title'] ?? '', $ds['description'] ?? '',
            $ds['productId'] ?? null, $ds['ctaLabel'] ?? '',
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

        $this->replaceList('site_hero_orbit_images', $h['orbitImages'] ?? [], function (\PDOStatement $stmt, string $url, int $i) {
            $stmt->execute([$url, $i]);
        }, 'INSERT INTO site_hero_orbit_images (url, sort_order) VALUES (?, ?)');

        $this->replaceList('site_hero_orbit_products', $h['orbitProductIds'] ?? [], function (\PDOStatement $stmt, string $productId, int $i) {
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

        $this->replaceList('site_day_sparkle_stages', $ds['stages'] ?? [], function (\PDOStatement $stmt, array $item, int $i) {
            $stmt->execute([
                $item['id'] ?? '', $item['timeLabel'] ?? '', $item['label'] ?? '',
                $item['copy'] ?? '', $item['image'] ?? '', $i,
            ]);
        }, 'INSERT INTO site_day_sparkle_stages (stage_key, time_label, label, copy, image, sort_order) VALUES (?, ?, ?, ?, ?, ?)');

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
