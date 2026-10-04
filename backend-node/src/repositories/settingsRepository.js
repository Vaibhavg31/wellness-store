import { getPool } from '../lib/db.js';

/**
 * Site settings & CMS content — backed by site_settings + 10 child tables.
 * Mirrors backend/lib/Repository/SettingsRepository.php exactly (same
 * columns, same child tables, same merge semantics), with defaults updated
 * to the Chikit brand (the PHP version's defaults were never updated past
 * the original "Wellness Store" template — see backend-node/MIGRATION.md).
 */
const DEFAULTS = {
    siteName: 'Chikit',
    brandName: 'Chikit',
    brandShort: 'Chikit',
    brandTagline: 'Ayurveda and Wellness',
    brandDescription: 'Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.',
    logo: '',
    favicon: '',
    theme: {
        primaryColor: '#602460',
        primaryLight: '#7A3380',
        primaryDark: '#431A43',
        accentColor: '#C08A3E',
        accentLight: '#D8A860',
        tintColor: '#F1E4F2',
        backgroundColor: '#FDF9F4',
        textColor: '#241720',
        fontHeading: '"Lora", Georgia, serif',
        fontBody: '"Poppins", system-ui, sans-serif',
    },
    contact: {
        email: 'hello@chikit.in',
        whatsappNumber: '+910000000000',
        whatsappDisplay: '+91 00000 00000',
        whatsappDefaultMessage: 'Hi! I have a question about a Chikit product.',
        businessHours: 'Mon – Sat: 10:00 AM – 7:00 PM IST',
    },
    social: {
        instagramHandle: 'chikit.ayurveda',
        instagramUrl: 'https://instagram.com/chikit.ayurveda',
        instagramTagline: 'Follow us for Ayurvedic rituals, wellness tips and behind-the-scenes.',
    },
    delivery: { fee: 99, freeThreshold: 1999, returnDays: 7 },
    payments: { codEnabled: true, onlinePaymentEnabled: true },
    services: { emailEnabled: true, otpEnabled: true, googleSignInEnabled: true },
    navLinks: [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: 'Reviews', href: '/reviews' },
        { label: 'About', href: '/about' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Contact', href: '/contact' },
    ],
    sections: {
        hero: true, videoBanner: true, brandMarquee: true, banners: true, bannerSlider: true,
        featured: true, trending: true, categories: true, bundles: true, ritualBuilder: true,
        wellnessJourney: true, bodyMap: true, sourceTrail: true, whyChoose: true, certifiedBanner: true,
        reviews: true, instagram: true, newsletter: true, promoBanner: true,
    },
    promo: { enabled: true, text: '✦ Free delivery on orders above ₹1,999. Use code', code: 'WELCOME10', suffix: 'for 10% off your first order', href: '/shop' },
    hero: {
        badge: 'FSSAI & Lab Tested',
        headline: 'Ancient Wisdom for',
        headlineAccent: 'Modern Living',
        subheadline: 'Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.',
        primaryCta: { label: 'Shop Now', href: '/shop' },
        featuredProductId: '',
        images: [],
        productImageIds: [],
        trustBadges: [
            { icon: 'shield', label: 'Ayurveda Certified' },
            { icon: 'star', label: '4.9★ Rated' },
            { icon: 'sparkles', label: '100% Natural' },
        ],
    },
    videoBanner: { videoUrl: '', poster: '', title: '', subtitle: '', ctaLabel: '', ctaHref: '', fit: 'cover', width: null, height: null },
    marquee: { items: ['FSSAI & GMP Certified', 'Authentic Ayurvedic Formulations', 'Lab Tested Purity', 'Free Delivery Above ₹1999', '7-Day Easy Returns'] },
    featured: { collectionTitle: 'Featured Collection', stylesTitle: 'Trending Now', viewAllLabel: 'View All', productCount: 8 },
    whyChoose: { subtitle: 'Why Choose Us', title: 'Wellness You Can Trust', description: 'From sourcing to lab testing, every step is built around Ayurvedic tradition and transparency.', benefits: [], ctaText: "Stay connected with us on Instagram and WhatsApp. We're always happy to help." },
    certifiedBanner: { badge: 'FSSAI & GMP Certified', title: 'Purity You Can Verify', description: 'Every product is manufactured in certified facilities and third-party lab tested before it reaches you.', ctaLabel: 'See Our Certifications', ctaHref: '/about', image: '' },
    newsletter: { badge: 'Exclusive Access', title: 'Join Our Wellness Circle', description: 'Be the first to hear about new products, offers, and Ayurvedic wellness tips.', buttonLabel: 'Subscribe', disclaimer: 'No spam. Unsubscribe anytime.', successMessage: 'Thank you for subscribing!' },
    instagram: { subtitle: '@chikit.ayurveda', title: 'Follow Our Journey', description: 'Follow us for Ayurvedic rituals, wellness tips and behind-the-scenes.', stripLabel: 'Follow us on Instagram', images: [] },
    about: {
        heroTitle: 'Our Story',
        heroDescription: "Chikit was founded on a simple belief: ancient Ayurvedic wisdom shouldn't mean compromising on purity or modern-day convenience.",
        storyBadge: 'The Beginning',
        storyTitle: 'Ayurveda, Honestly Made',
        storyParagraphs: [],
        storyImage: '',
        missionTitle: 'Our Mission',
        missionText: 'To make authentic, lab-tested Ayurvedic wellness accessible to every household.',
        visionTitle: 'Our Vision',
        visionText: "To become India's most trusted Ayurveda and wellness brand, known for transparency and quality.",
        valuesSubtitle: 'What Drives Us',
        valuesTitle: 'Mission & Vision',
    },
    contactPage: { subtitle: 'Get in Touch', title: 'Contact Us', description: "We'd love to hear from you. Our team is here to help.", faqs: [] },
    footer: { tagline: 'Ayurveda and Wellness', description: 'Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.', newsletterTitle: 'Our Wellness Circle', newsletterDescription: 'Be the first to hear about new products, offers, and Ayurvedic wellness tips.', instagramCardText: 'Wellness tips, product stories & behind-the-scenes.' },
    seo: { title: 'Chikit | Ayurveda and Wellness', description: 'Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.' },
    popup: { enabled: false, type: 'info', title: 'Welcome to Chikit', message: 'Sign up for our newsletter and get 10% off your first order.', image: '', ctaLabel: 'Shop Now', ctaHref: '/shop', couponCode: 'WELCOME10', productId: null, delaySeconds: 2, frequency: 'session' },
};

export class SettingsRepository {
    pool() { return getPool(); }

    async get() {
        let stored;
        try {
            stored = await this.readFromDb();
        } catch {
            return structuredClone(DEFAULTS);
        }

        if (!stored || Object.keys(stored).length === 0) return structuredClone(DEFAULTS);

        const merged = mergeSettings(structuredClone(DEFAULTS), stored);
        // 'sections' key order IS the admin-defined homepage render order — replace wholesale, don't recurse-merge (would lose order).
        if (stored.sections) merged.sections = stored.sections;
        return merged;
    }

    async set(changes) {
        const current = await this.get();
        const updated = mergeSettings(current, changes);
        if (changes.sections) updated.sections = changes.sections;
        await this.writeToDb(updated);
        return updated;
    }

    async readFromDb() {
        const [rows] = await this.pool().query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
        const row = rows[0];
        if (!row) return {};

        const b = (v) => Boolean(v);
        const f = (v) => Number.parseFloat(v);
        const i = (v) => Number.parseInt(v, 10);

        return {
            siteName: row.site_name,
            brandName: row.brand_name,
            brandShort: row.brand_short,
            brandTagline: row.brand_tagline,
            brandDescription: row.brand_description,
            logo: row.logo,
            favicon: row.favicon ?? DEFAULTS.favicon,
            theme: {
                primaryColor: row.theme_primary_color ?? DEFAULTS.theme.primaryColor,
                primaryLight: row.theme_primary_light ?? DEFAULTS.theme.primaryLight,
                primaryDark: row.theme_primary_dark ?? DEFAULTS.theme.primaryDark,
                accentColor: row.theme_accent_color ?? DEFAULTS.theme.accentColor,
                accentLight: row.theme_accent_light ?? DEFAULTS.theme.accentLight,
                tintColor: row.theme_blush_color ?? DEFAULTS.theme.tintColor,
                backgroundColor: row.theme_background_color ?? DEFAULTS.theme.backgroundColor,
                textColor: row.theme_text_color ?? DEFAULTS.theme.textColor,
                fontHeading: row.theme_font_heading ?? DEFAULTS.theme.fontHeading,
                fontBody: row.theme_font_body ?? DEFAULTS.theme.fontBody,
            },
            contact: {
                email: row.contact_email,
                whatsappNumber: row.contact_whatsapp_number,
                whatsappDisplay: row.contact_whatsapp_display,
                whatsappDefaultMessage: row.contact_whatsapp_default_message,
                businessHours: row.contact_business_hours,
            },
            social: {
                instagramHandle: row.social_instagram_handle,
                instagramUrl: row.social_instagram_url,
                instagramTagline: row.social_instagram_tagline,
            },
            delivery: { fee: f(row.delivery_fee), freeThreshold: f(row.delivery_free_threshold), returnDays: i(row.delivery_return_days) },
            payments: { codEnabled: b(row.payments_cod_enabled), onlinePaymentEnabled: b(row.payments_online_payment_enabled) },
            services: { emailEnabled: b(row.services_email_enabled), otpEnabled: b(row.services_otp_enabled), googleSignInEnabled: b(row.services_google_sign_in_enabled) },
            promo: { enabled: b(row.promo_enabled), text: row.promo_text, code: row.promo_code, suffix: row.promo_suffix, href: row.promo_href },
            hero: {
                badge: row.hero_badge,
                headline: row.hero_headline,
                headlineAccent: row.hero_headline_accent,
                subheadline: row.hero_subheadline,
                primaryCta: { label: row.hero_primary_cta_label, href: row.hero_primary_cta_href },
                featuredProductId: row.hero_featured_product_id,
                trustBadges: await this.fetchList('site_hero_trust_badges', (r) => ({ icon: r.icon, label: r.label })),
                images: await this.fetchList('site_hero_orbit_images', (r) => r.url),
                productImageIds: await this.fetchList('site_hero_orbit_products', (r) => r.product_id),
            },
            videoBanner: {
                videoUrl: row.video_banner_url ?? DEFAULTS.videoBanner.videoUrl,
                poster: row.video_banner_poster ?? DEFAULTS.videoBanner.poster,
                title: row.video_banner_title ?? DEFAULTS.videoBanner.title,
                subtitle: row.video_banner_subtitle ?? DEFAULTS.videoBanner.subtitle,
                ctaLabel: row.video_banner_cta_label ?? DEFAULTS.videoBanner.ctaLabel,
                ctaHref: row.video_banner_cta_href ?? DEFAULTS.videoBanner.ctaHref,
                fit: row.video_banner_fit ?? DEFAULTS.videoBanner.fit,
                width: row.video_banner_width !== null && row.video_banner_width !== undefined ? i(row.video_banner_width) : null,
                height: row.video_banner_height !== null && row.video_banner_height !== undefined ? i(row.video_banner_height) : null,
            },
            marquee: { items: await this.fetchList('site_marquee_items', (r) => r.text) },
            featured: { collectionTitle: row.featured_collection_title, stylesTitle: row.featured_styles_title, viewAllLabel: row.featured_view_all_label, productCount: i(row.featured_product_count) },
            whyChoose: {
                subtitle: row.why_choose_subtitle,
                title: row.why_choose_title,
                description: row.why_choose_description,
                ctaText: row.why_choose_cta_text,
                benefits: await this.fetchList('site_why_choose_benefits', (r) => ({ icon: r.icon, title: r.title, description: r.description })),
            },
            certifiedBanner: { badge: row.quality_promise_badge, title: row.quality_promise_title, description: row.quality_promise_description, ctaLabel: row.quality_promise_cta_label, ctaHref: row.quality_promise_cta_href, image: row.quality_promise_image },
            newsletter: { badge: row.newsletter_badge, title: row.newsletter_title, description: row.newsletter_description, buttonLabel: row.newsletter_button_label, disclaimer: row.newsletter_disclaimer, successMessage: row.newsletter_success_message },
            instagram: { subtitle: row.instagram_subtitle, title: row.instagram_title, description: row.instagram_description, stripLabel: row.instagram_strip_label, images: await this.fetchList('site_instagram_images', (r) => r.url) },
            about: {
                heroTitle: row.about_hero_title,
                heroDescription: row.about_hero_description,
                storyBadge: row.about_story_badge,
                storyTitle: row.about_story_title,
                storyParagraphs: await this.fetchList('site_about_story_paragraphs', (r) => r.paragraph),
                storyImage: row.about_story_image,
                missionTitle: row.about_mission_title,
                missionText: row.about_mission_text,
                visionTitle: row.about_vision_title,
                visionText: row.about_vision_text,
                valuesSubtitle: row.about_values_subtitle,
                valuesTitle: row.about_values_title,
            },
            contactPage: { subtitle: row.contact_page_subtitle, title: row.contact_page_title, description: row.contact_page_description, faqs: await this.fetchList('site_contact_faqs', (r) => ({ question: r.question, answer: r.answer })) },
            footer: { tagline: row.footer_tagline, description: row.footer_description, newsletterTitle: row.footer_newsletter_title, newsletterDescription: row.footer_newsletter_description, instagramCardText: row.footer_instagram_card_text },
            seo: { title: row.seo_title, description: row.seo_description },
            popup: {
                enabled: b(row.popup_enabled ?? false),
                type: row.popup_type ?? DEFAULTS.popup.type,
                title: row.popup_title ?? DEFAULTS.popup.title,
                message: row.popup_message ?? DEFAULTS.popup.message,
                image: row.popup_image ?? DEFAULTS.popup.image,
                ctaLabel: row.popup_cta_label ?? DEFAULTS.popup.ctaLabel,
                ctaHref: row.popup_cta_href ?? DEFAULTS.popup.ctaHref,
                couponCode: row.popup_coupon_code ?? DEFAULTS.popup.couponCode,
                productId: row.popup_product_id ?? null,
                delaySeconds: row.popup_delay_seconds !== null && row.popup_delay_seconds !== undefined ? i(row.popup_delay_seconds) : DEFAULTS.popup.delaySeconds,
                frequency: row.popup_frequency ?? DEFAULTS.popup.frequency,
            },
            navLinks: await this.fetchList('site_nav_links', (r) => ({ label: r.label, href: r.href })),
            sections: await this.fetchSections(),
        };
    }

    async fetchList(table, mapper) {
        const [rows] = await this.pool().query(`SELECT * FROM \`${table}\` ORDER BY sort_order ASC`);
        return rows.map(mapper);
    }

    async fetchSections() {
        const [rows] = await this.pool().query('SELECT section_key, is_enabled FROM site_section_toggles ORDER BY sort_order ASC');
        const result = {};
        for (const row of rows) result[row.section_key] = Boolean(row.is_enabled);
        return result;
    }

    async writeToDb(s) {
        const pool = this.pool();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const c = s.contact || {};
        const so = s.social || {};
        const d = s.delivery || {};
        const p = s.payments || {};
        const sv = s.services || {};
        const pr = s.promo || {};
        const h = s.hero || {};
        const fe = s.featured || {};
        const wc = s.whyChoose || {};
        const at = s.certifiedBanner || {};
        const nl = s.newsletter || {};
        const ig = s.instagram || {};
        const ab = s.about || {};
        const cp = s.contactPage || {};
        const fo = s.footer || {};
        const se = s.seo || {};
        const th = s.theme || {};
        const vb = s.videoBanner || {};
        const pu = s.popup || {};
        const pc = h.primaryCta || {};
        const sc = h.secondaryCta || {};

        const sql = `INSERT INTO site_settings (
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
            1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        ) ON DUPLICATE KEY UPDATE
            site_name=VALUES(site_name), brand_name=VALUES(brand_name), brand_short=VALUES(brand_short),
            brand_tagline=VALUES(brand_tagline), brand_description=VALUES(brand_description), logo=VALUES(logo), favicon=VALUES(favicon),
            theme_primary_color=VALUES(theme_primary_color), theme_primary_light=VALUES(theme_primary_light), theme_primary_dark=VALUES(theme_primary_dark),
            theme_accent_color=VALUES(theme_accent_color), theme_accent_light=VALUES(theme_accent_light), theme_blush_color=VALUES(theme_blush_color),
            theme_background_color=VALUES(theme_background_color), theme_text_color=VALUES(theme_text_color),
            theme_font_heading=VALUES(theme_font_heading), theme_font_body=VALUES(theme_font_body),
            contact_email=VALUES(contact_email), contact_whatsapp_number=VALUES(contact_whatsapp_number),
            contact_whatsapp_display=VALUES(contact_whatsapp_display), contact_whatsapp_default_message=VALUES(contact_whatsapp_default_message),
            contact_business_hours=VALUES(contact_business_hours),
            social_instagram_handle=VALUES(social_instagram_handle), social_instagram_url=VALUES(social_instagram_url),
            social_instagram_tagline=VALUES(social_instagram_tagline),
            delivery_fee=VALUES(delivery_fee), delivery_free_threshold=VALUES(delivery_free_threshold), delivery_return_days=VALUES(delivery_return_days),
            payments_cod_enabled=VALUES(payments_cod_enabled), payments_online_payment_enabled=VALUES(payments_online_payment_enabled),
            services_email_enabled=VALUES(services_email_enabled), services_otp_enabled=VALUES(services_otp_enabled),
            services_google_sign_in_enabled=VALUES(services_google_sign_in_enabled),
            promo_enabled=VALUES(promo_enabled), promo_text=VALUES(promo_text), promo_code=VALUES(promo_code),
            promo_suffix=VALUES(promo_suffix), promo_href=VALUES(promo_href),
            hero_badge=VALUES(hero_badge), hero_headline=VALUES(hero_headline), hero_headline_accent=VALUES(hero_headline_accent),
            hero_subheadline=VALUES(hero_subheadline),
            hero_primary_cta_label=VALUES(hero_primary_cta_label), hero_primary_cta_href=VALUES(hero_primary_cta_href),
            hero_secondary_cta_label=VALUES(hero_secondary_cta_label), hero_secondary_cta_href=VALUES(hero_secondary_cta_href),
            hero_featured_product_id=VALUES(hero_featured_product_id), hero_scroll_cue=VALUES(hero_scroll_cue),
            hero_video_url=VALUES(hero_video_url), hero_video_poster=VALUES(hero_video_poster),
            featured_collection_title=VALUES(featured_collection_title), featured_styles_title=VALUES(featured_styles_title),
            featured_view_all_label=VALUES(featured_view_all_label), featured_product_count=VALUES(featured_product_count),
            why_choose_subtitle=VALUES(why_choose_subtitle), why_choose_title=VALUES(why_choose_title),
            why_choose_description=VALUES(why_choose_description), why_choose_cta_text=VALUES(why_choose_cta_text),
            quality_promise_badge=VALUES(quality_promise_badge), quality_promise_title=VALUES(quality_promise_title),
            quality_promise_description=VALUES(quality_promise_description),
            quality_promise_cta_label=VALUES(quality_promise_cta_label), quality_promise_cta_href=VALUES(quality_promise_cta_href),
            quality_promise_image=VALUES(quality_promise_image),
            newsletter_badge=VALUES(newsletter_badge), newsletter_title=VALUES(newsletter_title),
            newsletter_description=VALUES(newsletter_description), newsletter_button_label=VALUES(newsletter_button_label),
            newsletter_disclaimer=VALUES(newsletter_disclaimer), newsletter_success_message=VALUES(newsletter_success_message),
            instagram_subtitle=VALUES(instagram_subtitle), instagram_title=VALUES(instagram_title),
            instagram_description=VALUES(instagram_description), instagram_strip_label=VALUES(instagram_strip_label),
            about_hero_title=VALUES(about_hero_title), about_hero_description=VALUES(about_hero_description),
            about_story_badge=VALUES(about_story_badge), about_story_title=VALUES(about_story_title),
            about_story_image=VALUES(about_story_image), about_mission_title=VALUES(about_mission_title), about_mission_text=VALUES(about_mission_text),
            about_vision_title=VALUES(about_vision_title), about_vision_text=VALUES(about_vision_text),
            about_values_subtitle=VALUES(about_values_subtitle), about_values_title=VALUES(about_values_title),
            contact_page_subtitle=VALUES(contact_page_subtitle), contact_page_title=VALUES(contact_page_title),
            contact_page_description=VALUES(contact_page_description),
            footer_tagline=VALUES(footer_tagline), footer_description=VALUES(footer_description),
            footer_newsletter_title=VALUES(footer_newsletter_title), footer_newsletter_description=VALUES(footer_newsletter_description),
            footer_instagram_card_text=VALUES(footer_instagram_card_text),
            seo_title=VALUES(seo_title), seo_description=VALUES(seo_description),
            video_banner_url=VALUES(video_banner_url), video_banner_poster=VALUES(video_banner_poster),
            video_banner_title=VALUES(video_banner_title), video_banner_subtitle=VALUES(video_banner_subtitle),
            video_banner_cta_label=VALUES(video_banner_cta_label), video_banner_cta_href=VALUES(video_banner_cta_href),
            video_banner_fit=VALUES(video_banner_fit), video_banner_width=VALUES(video_banner_width), video_banner_height=VALUES(video_banner_height),
            popup_enabled=VALUES(popup_enabled), popup_type=VALUES(popup_type), popup_title=VALUES(popup_title),
            popup_message=VALUES(popup_message), popup_image=VALUES(popup_image),
            popup_cta_label=VALUES(popup_cta_label), popup_cta_href=VALUES(popup_cta_href),
            popup_coupon_code=VALUES(popup_coupon_code), popup_product_id=VALUES(popup_product_id),
            popup_delay_seconds=VALUES(popup_delay_seconds), popup_frequency=VALUES(popup_frequency),
            updated_at=VALUES(updated_at)`;

        await pool.query(sql, [
            s.siteName ?? '', s.brandName ?? '', s.brandShort ?? '', s.brandTagline ?? '', s.brandDescription ?? '', s.logo ?? '', s.favicon ?? '',
            th.primaryColor ?? '#602460', th.primaryLight ?? '#7A3380', th.primaryDark ?? '#431A43',
            th.accentColor ?? '#C08A3E', th.accentLight ?? '#D8A860', th.tintColor ?? '#F1E4F2',
            th.backgroundColor ?? '#FDF9F4', th.textColor ?? '#241720',
            th.fontHeading ?? '"Lora", Georgia, serif', th.fontBody ?? '"Poppins", system-ui, sans-serif',
            c.email ?? '', c.whatsappNumber ?? '', c.whatsappDisplay ?? '', c.whatsappDefaultMessage ?? '', c.businessHours ?? '',
            so.instagramHandle ?? '', so.instagramUrl ?? '', so.instagramTagline ?? '',
            Number(d.fee ?? 99), Number(d.freeThreshold ?? 1999), Number.parseInt(d.returnDays ?? 7, 10),
            (p.codEnabled ?? true) ? 1 : 0, (p.onlinePaymentEnabled ?? true) ? 1 : 0,
            (sv.emailEnabled ?? true) ? 1 : 0, (sv.otpEnabled ?? true) ? 1 : 0, (sv.googleSignInEnabled ?? true) ? 1 : 0,
            (pr.enabled ?? true) ? 1 : 0, pr.text ?? '', pr.code ?? '', pr.suffix ?? '', pr.href ?? '',
            h.badge ?? '', h.headline ?? '', h.headlineAccent ?? '', h.subheadline ?? '',
            pc.label ?? '', pc.href ?? '', sc.label ?? '', sc.href ?? '',
            h.featuredProductId ?? null, h.scrollCue ?? '', h.videoUrl ?? '', h.videoPoster ?? '',
            fe.collectionTitle ?? '', fe.stylesTitle ?? '', fe.viewAllLabel ?? '', Number.parseInt(fe.productCount ?? 8, 10),
            wc.subtitle ?? '', wc.title ?? '', wc.description ?? '', wc.ctaText ?? '',
            at.badge ?? '', at.title ?? '', at.description ?? '', at.ctaLabel ?? '', at.ctaHref ?? '', at.image ?? '',
            nl.badge ?? '', nl.title ?? '', nl.description ?? '', nl.buttonLabel ?? '', nl.disclaimer ?? '', nl.successMessage ?? '',
            ig.subtitle ?? '', ig.title ?? '', ig.description ?? '', ig.stripLabel ?? '',
            ab.heroTitle ?? '', ab.heroDescription ?? '', ab.storyBadge ?? '', ab.storyTitle ?? '',
            ab.storyImage ?? '', ab.missionTitle ?? '', ab.missionText ?? '',
            ab.visionTitle ?? '', ab.visionText ?? '', ab.valuesSubtitle ?? '', ab.valuesTitle ?? '',
            cp.subtitle ?? '', cp.title ?? '', cp.description ?? '',
            fo.tagline ?? '', fo.description ?? '', fo.newsletterTitle ?? '', fo.newsletterDescription ?? '', fo.instagramCardText ?? '',
            se.title ?? '', se.description ?? '',
            vb.videoUrl ?? '', vb.poster ?? '', vb.title ?? '', vb.subtitle ?? '',
            vb.ctaLabel ?? '', vb.ctaHref ?? '', vb.fit ?? 'cover',
            vb.width ?? null, vb.height ?? null,
            (pu.enabled ?? false) ? 1 : 0, pu.type ?? 'info', pu.title ?? '', pu.message ?? '', pu.image ?? '',
            pu.ctaLabel ?? '', pu.ctaHref ?? '', pu.couponCode ?? '', pu.productId ?? null,
            Number.parseInt(pu.delaySeconds ?? 2, 10), pu.frequency ?? 'session',
            now,
        ]);

        await this.replaceList('site_nav_links', s.navLinks ?? [], (item) => [item.label ?? '', item.href ?? ''], 'INSERT INTO site_nav_links (label, href, sort_order) VALUES (?, ?, ?)');
        await this.replaceSections(s.sections ?? {});
        await this.replaceList('site_hero_trust_badges', h.trustBadges ?? [], (item) => [item.icon ?? '', item.label ?? ''], 'INSERT INTO site_hero_trust_badges (icon, label, sort_order) VALUES (?, ?, ?)');
        await this.replaceList('site_hero_orbit_images', h.images ?? [], (url) => [url], 'INSERT INTO site_hero_orbit_images (url, sort_order) VALUES (?, ?)');
        await this.replaceList('site_hero_orbit_products', h.productImageIds ?? [], (productId) => [productId], 'INSERT INTO site_hero_orbit_products (product_id, sort_order) VALUES (?, ?)');
        await this.replaceList('site_marquee_items', s.marquee?.items ?? [], (text) => [text], 'INSERT INTO site_marquee_items (text, sort_order) VALUES (?, ?)');
        await this.replaceList('site_why_choose_benefits', wc.benefits ?? [], (item) => [item.icon ?? '', item.title ?? '', item.description ?? ''], 'INSERT INTO site_why_choose_benefits (icon, title, description, sort_order) VALUES (?, ?, ?, ?)');
        await this.replaceList('site_instagram_images', ig.images ?? [], (url) => [url], 'INSERT INTO site_instagram_images (url, sort_order) VALUES (?, ?)');
        await this.replaceList('site_about_story_paragraphs', ab.storyParagraphs ?? [], (para) => [para], 'INSERT INTO site_about_story_paragraphs (paragraph, sort_order) VALUES (?, ?)');
        await this.replaceList('site_contact_faqs', cp.faqs ?? [], (item) => [item.question ?? '', item.answer ?? ''], 'INSERT INTO site_contact_faqs (question, answer, sort_order) VALUES (?, ?, ?)');
    }

    async replaceList(table, items, toParams, insertSql) {
        const pool = this.pool();
        await pool.query(`DELETE FROM \`${table}\``);
        if (!items || items.length === 0) return;
        for (const [i, item] of items.entries()) {
            await pool.query(insertSql, [...toParams(item), i]);
        }
    }

    async replaceSections(sections) {
        const pool = this.pool();
        await pool.query('DELETE FROM site_section_toggles');
        const keys = Object.keys(sections || {});
        if (keys.length === 0) return;
        let i = 0;
        for (const key of keys) {
            await pool.query('INSERT INTO site_section_toggles (section_key, is_enabled, sort_order) VALUES (?, ?, ?)', [key, sections[key] ? 1 : 0, i]);
            i += 1;
        }
    }
}

/** Deep-merge: plain objects recurse; arrays replace entirely. Mirrors SettingsRepository::mergeSettings(). */
function mergeSettings(base, overrides) {
    for (const [key, value] of Object.entries(overrides)) {
        if (Array.isArray(value)) {
            base[key] = value;
        } else if (value && typeof value === 'object') {
            if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
                base[key] = mergeSettings(base[key], value);
            } else {
                base[key] = value;
            }
        } else {
            base[key] = value;
        }
    }
    return base;
}
