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
import { HERO_JEWELRY_IMAGES, HERO_VIDEO_POSTER, HERO_VIDEO_URL } from '@/data/fallbackProducts';

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
        primaryColor: '#0F5132',
        primaryLight: '#15803D',
        primaryDark: '#0A3D25',
        accentColor: '#D97706',
        accentLight: '#F59E0B',
        blushColor: '#FDE68A',
        backgroundColor: '#FBF9F4',
        textColor: '#1C1A16',
        fontHeading: '"Cormorant Garamond", Georgia, serif',
        fontBody: '"Inter", system-ui, sans-serif',
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

    // Note: jewelExplorer3D and dayInHerSparkle are intentionally left out —
    // they were built for the original jewelry-brand template and don't fit
    // a wellness/supplements store, so they stay off by default.
    sections: {
        openingIntro: true,
        hero: true,
        videoBanner: true,
        brandMarquee: true,
        banners: true,
        bannerSlider: true,
        featured: true,
        trending: true,
        categories: true,
        bundles: true,
        ritualBuilder: true,
        wellnessJourney: true,
        bodyMap: true,
        sourceTrail: true,
        whyChoose: true,
        antiTarnishBanner: true,
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
        title: 'Welcome to Wellness Store',
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
        headline: 'Wellness, Backed by',
        headlineAccent: 'Science',
        subheadline: BRAND_DESCRIPTION,
        primaryCta: { label: 'Shop Now', href: '/shop' },
        secondaryCta: { label: 'Featured Product', href: '' },
        featuredProductId: '',
        centerImage: '',
        scrollCue: 'Scroll to explore',
        videoUrl: HERO_VIDEO_URL,
        videoPoster: HERO_VIDEO_POSTER,
        orbitImages: HERO_JEWELRY_IMAGES,
        orbitProductIds: [],
        trustBadges: [
            { icon: 'shield', label: 'FSSAI Certified' },
            { icon: 'star', label: '4.9★ Rated' },
            { icon: 'sparkles', label: 'Lab Tested' },
        ],
    },

    marquee: {
        items: [
            'FSSAI & GMP Certified',
            'Lab Tested Purity',
            'No Added Preservatives',
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
        title: 'Wellness You Can Trust',
        description: 'From sourcing to lab testing, every step is built around transparency.',
        benefits: BENEFITS,
        ctaText: "Stay connected with us on Instagram and WhatsApp. We're always happy to help.",
    },

    antiTarnishBanner: {
        badge: 'FSSAI & GMP Certified',
        title: 'Purity You Can Verify',
        description: 'Every product is manufactured in certified facilities and third-party lab tested before it reaches you.',
        ctaLabel: 'See Our Certifications',
        ctaHref: '/about',
        image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=700&q=80',
    },

    newsletter: {
        badge: 'Exclusive Access',
        title: 'Join Our Wellness Circle',
        description: 'Be the first to hear about new products, offers, and wellness tips.',
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
        heroDescription: `${BRAND_NAME} was founded on a simple belief: everyday wellness shouldn't mean compromising on purity or transparency.`,
        storyBadge: 'The Beginning',
        storyTitle: 'Wellness, Honestly Made',
        storyParagraphs: [
            `${BRAND_NAME} was founded with a simple yet powerful vision: to make clean-label, lab-tested wellness products accessible to every household.`,
            'Every product we make is thoughtfully sourced and rigorously tested, combining traditional wellness knowledge with modern quality standards.',
        ],
        storyImage: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80',
        missionTitle: 'Our Mission',
        missionText: 'To make clean-label, lab-tested wellness products accessible to every household.',
        visionTitle: 'Our Vision',
        visionText: "To become India's most trusted wellness brand, known for transparency and quality.",
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
        newsletterTitle: 'Our Wellness Circle',
        newsletterDescription: 'Be the first to hear about new products, offers, and wellness tips.',
        instagramCardText: 'Wellness tips, product stories & behind-the-scenes.',
    },

    seo: {
        title: 'Wellness Store | Clean-Label Supplements & Nutrition',
        description: BRAND_DESCRIPTION,
    },
};
