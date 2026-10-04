import {
    BENEFITS,
    BRAND_DESCRIPTION,
    BRAND_NAME,
    BRAND_SHORT,
    BRAND_TAGLINE,
    CONTACT_EMAIL,
    DELIVERY_FEE,
    FAQS,
    FREE_DELIVERY_THRESHOLD,
    INSTAGRAM_HANDLE,
    INSTAGRAM_IMAGES,
    INSTAGRAM_TAGLINE,
    INSTAGRAM_URL,
    NAV_LINKS,
    WHATSAPP_DEFAULT_MESSAGE,
    WHATSAPP_DISPLAY,
    WHATSAPP_NUMBER,
} from '@/constants';
import { HERO_PRODUCT_IMAGES } from '@/data/fallbackProducts';

/** Canonical defaults — merged with API settings; constants remain ultimate fallback. */
export const DEFAULT_SITE_CONTENT = {
    siteName: BRAND_NAME,
    brandName: BRAND_NAME,
    brandShort: BRAND_SHORT,
    brandTagline: BRAND_TAGLINE,
    brandDescription: BRAND_DESCRIPTION,
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
        email: CONTACT_EMAIL,
        whatsappNumber: WHATSAPP_NUMBER,
        whatsappDisplay: WHATSAPP_DISPLAY,
        whatsappDefaultMessage: WHATSAPP_DEFAULT_MESSAGE,
        businessHours: 'Mon – Sat: 10:00 AM – 7:00 PM IST',
    },

    social: {
        instagramHandle: INSTAGRAM_HANDLE,
        instagramUrl: INSTAGRAM_URL,
        instagramTagline: INSTAGRAM_TAGLINE,
    },

    delivery: {
        fee: DELIVERY_FEE,
        freeThreshold: FREE_DELIVERY_THRESHOLD,
        returnDays: 7,
    },

    payments: {
        codEnabled: true,
        onlinePaymentEnabled: true,
    },

    services: {
        emailEnabled: true,
        otpEnabled: true,
        googleSignInEnabled: true,
    },

    navLinks: NAV_LINKS,

    sections: {
        hero: true,
        videoBanner: true,
        brandMarquee: true,
        banners: true,
        bannerSlider: true,
        featured: true,
        trending: true,
        categories: true,
        bundles: true,
        whyChoose: true,
        certifiedBanner: true,
        reviews: true,
        instagram: true,
        newsletter: true,
        promoBanner: true,
    },

    promo: {
        enabled: true,
        text: '✦ Free delivery on orders above ₹1,999. Use code',
        code: 'WELCOME10',
        suffix: 'for 10% off your first order',
        href: '/shop',
    },

    // Site-wide on-load announcement popup — off by default, admin-managed
    // from Content Manager. `type` steers which fields matter: "coupon"
    // shows couponCode, "product" shows productId, "festival"/"info" are
    // just title+message+image+CTA.
    popup: {
        enabled: false,
        type: 'info',
        title: `Welcome to ${BRAND_NAME}`,
        message: 'Sign up for our newsletter and get 10% off your first order.',
        image: '',
        ctaLabel: 'Shop Now',
        ctaHref: '/shop',
        couponCode: 'WELCOME10',
        productId: null,
        delaySeconds: 2,
        frequency: 'session', // 'session' | 'every_visit' | 'once'
    },

    // Renders nothing on the storefront until a video is uploaded — safe to
    // leave the section toggle on by default.
    videoBanner: {
        videoUrl: '',
        poster: '',
        title: '',
        subtitle: '',
        ctaLabel: '',
        ctaHref: '',
        fit: 'cover',
        width: null,
        height: null,
    },

    hero: {
        badge: 'FSSAI & Lab Tested',
        headline: 'Ancient Wisdom for',
        headlineAccent: 'Modern Living',
        subheadline: BRAND_DESCRIPTION,
        primaryCta: { label: 'Shop Now', href: '/shop' },
        featuredProductId: '',
        images: HERO_PRODUCT_IMAGES,
        productImageIds: [],
        trustBadges: [
            { icon: 'shield', label: 'Ayurveda Certified' },
            { icon: 'star', label: '4.9★ Rated' },
            { icon: 'sparkles', label: '100% Natural' },
        ],
    },

    marquee: {
        items: [
            'FSSAI & GMP Certified',
            'Authentic Ayurvedic Formulations',
            'Lab Tested Purity',
            'Free Delivery Above ₹1999',
            '7-Day Easy Returns',
        ],
    },

    featured: {
        collectionTitle: 'Featured Collection',
        stylesTitle: 'Trending Now',
        viewAllLabel: 'View All',
        productCount: 8,
    },

    whyChoose: {
        subtitle: 'Why Choose Us',
        title: 'Ayurveda You Can Trust',
        description: 'From sourcing to lab testing, every step is built around Ayurvedic tradition and transparency.',
        benefits: BENEFITS,
        ctaText: "Stay connected with us on Instagram and WhatsApp. We're always happy to help.",
    },

    certifiedBanner: {
        badge: 'FSSAI & GMP Certified',
        title: 'Purity You Can Verify',
        description: 'Every product is manufactured in certified facilities and third-party lab tested before it reaches you.',
        ctaLabel: 'See Our Certifications',
        ctaHref: '/about',
        image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=700&q=80',
    },

    newsletter: {
        badge: 'Exclusive Access',
        title: 'Join the Chikit Circle',
        description: 'Be the first to hear about new products, offers, and Ayurvedic wellness tips.',
        buttonLabel: 'Subscribe',
        disclaimer: 'No spam. Unsubscribe anytime.',
        successMessage: 'Thank you for subscribing!',
    },

    instagram: {
        subtitle: `@${INSTAGRAM_HANDLE}`,
        title: 'Follow Our Journey',
        description: INSTAGRAM_TAGLINE,
        stripLabel: 'Follow us on Instagram',
        images: INSTAGRAM_IMAGES,
    },

    about: {
        heroTitle: 'Our Story',
        heroDescription: `${BRAND_NAME} was founded on a simple belief: ancient Ayurvedic wisdom shouldn't mean compromising on purity or modern-day convenience.`,
        storyBadge: 'The Beginning',
        storyTitle: 'Ayurveda, Honestly Made',
        storyParagraphs: [
            `${BRAND_NAME} was founded with a simple yet powerful vision: to make authentic, lab-tested Ayurvedic wellness accessible to every household.`,
            'Every product we make is thoughtfully sourced and rigorously tested, combining traditional Ayurvedic knowledge with modern quality standards.',
        ],
        storyImage: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80',
        missionTitle: 'Our Mission',
        missionText: 'To make authentic, lab-tested Ayurvedic wellness accessible to every household.',
        visionTitle: 'Our Vision',
        visionText: "To become India's most trusted Ayurveda and wellness brand, known for transparency and quality.",
        valuesSubtitle: 'What Drives Us',
        valuesTitle: 'Mission & Vision',
    },

    contactPage: {
        subtitle: 'Get in Touch',
        title: 'Contact Us',
        description: "We'd love to hear from you. Our team is here to help.",
        faqs: FAQS,
    },

    footer: {
        tagline: BRAND_TAGLINE,
        description: BRAND_DESCRIPTION,
        newsletterTitle: 'The Chikit Circle',
        newsletterDescription: 'Be the first to hear about new products, offers, and Ayurvedic wellness tips.',
        instagramCardText: 'Wellness tips, product stories & behind-the-scenes.',
    },

    seo: {
        title: 'Chikit | Ayurveda and Wellness',
        description: BRAND_DESCRIPTION,
    },
};
