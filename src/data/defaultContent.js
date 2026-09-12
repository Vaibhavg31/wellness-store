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
    logo: '/krivea-logo-transparent.png',
    favicon: '',

    theme: {
        primaryColor: '#5A0009',
        primaryLight: '#7A000F',
        primaryDark: '#3E0007',
        accentColor: '#D9B26F',
        accentLight: '#E8CC91',
        blushColor: '#F2B8B5',
        backgroundColor: '#FDF6F0',
        textColor: '#231414',
        fontHeading: '"Cormorant Garamond", Georgia, serif',
        fontBody: '"Inter", system-ui, sans-serif',
    },

    contact: {
        email: CONTACT_EMAIL,
        whatsappNumber: WHATSAPP_NUMBER,
        whatsappDisplay: WHATSAPP_DISPLAY,
        whatsappDefaultMessage: WHATSAPP_DEFAULT_MESSAGE,
        businessHours: 'Mon – Sat: 10:00 AM – 8:00 PM IST',
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
        brandMarquee: true,
        banners: true,
        bannerSlider: true,
        jewelExplorer3D: true,
        dayInHerSparkle: true,
        featured: true,
        trending: true,
        categories: true,
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
        code: 'SPARKLE10',
        suffix: 'for 10% off your first order',
        href: '/shop',
    },

    hero: {
        badge: 'New Heritage Collection 2026',
        headline: 'Wear the',
        headlineAccent: 'Sparkle',
        subheadline: `${BRAND_TAGLINE} Discover anti-tarnish pieces crafted for everyday elegance.`,
        primaryCta: { label: 'Shop Now', href: '/shop' },
        secondaryCta: { label: 'Featured Piece', href: '' },
        featuredProductId: '',
        centerImage: '',
        scrollCue: 'Explore in 3D ↓',
        videoUrl: HERO_VIDEO_URL,
        videoPoster: HERO_VIDEO_POSTER,
        orbitImages: HERO_JEWELRY_IMAGES,
        orbitProductIds: [],
        trustBadges: [
            { icon: 'shield', label: 'Anti-Tarnish' },
            { icon: 'star', label: '4.9★ Rated' },
            { icon: 'sparkles', label: 'Premium Finish' },
        ],
    },

    marquee: {
        items: [
            'Anti-Tarnish Technology',
            'Wear the Sparkle',
            'Premium PVD Coating',
            'Hypoallergenic',
            'Lifetime Shine',
            'Luxury Gift Packaging',
            'Free Delivery Above ₹1999',
        ],
    },

    featured: {
        collectionTitle: 'Everyday Krivea Collection',
        stylesTitle: 'Krivea Top Styles',
        viewAllLabel: 'View All',
        productCount: 8,
    },

    whyChoose: {
        subtitle: 'The Krivea Difference',
        title: 'Why Choose Krivea',
        description: 'Premium anti-tarnish jewellery made for everyday Indian life: shower-safe, skin-friendly, and always sparkling.',
        benefits: BENEFITS,
        ctaText: "Stay connected with us on Instagram and WhatsApp. We're always happy to help.",
    },

    antiTarnishBanner: {
        badge: 'PVD Technology',
        title: 'Shine That Never Fades',
        description: 'Our proprietary Physical Vapour Deposition coating creates an invisible barrier against oxidation, so your jewellery stays radiant through everyday wear, water exposure, and the test of time.',
        ctaLabel: 'Explore the Collection',
        ctaHref: '/shop',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=80',
    },

    dayInHerSparkle: {
        eyebrow: 'A Day in Her Sparkle',
        title: 'Still Sparkling, Every Hour',
        description: 'One piece, one day, zero tarnish: sunrise to last call.',
        productId: '',
        ctaLabel: 'Shop This Piece',
        stages: [
            {
                id: 'morning',
                timeLabel: '7:00 AM',
                label: 'Morning',
                copy: 'Still sparkling at 7am.',
                image: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=1400&q=85',
            },
            {
                id: 'midday',
                timeLabel: '1:00 PM',
                label: 'Midday',
                copy: 'Still sparkling at 1pm.',
                image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=1400&q=85',
            },
            {
                id: 'office',
                timeLabel: '4:00 PM',
                label: 'Office',
                copy: 'Still sparkling at 4pm.',
                image: 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=1400&q=85',
            },
            {
                id: 'evening',
                timeLabel: '8:00 PM',
                label: 'Evening',
                copy: 'Still sparkling at 8pm.',
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1400&q=85',
            },
            {
                id: 'night',
                timeLabel: '11:00 PM',
                label: 'Night',
                copy: 'Still sparkling at 11pm.',
                image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1400&q=85',
            },
        ],
    },

    newsletter: {
        badge: 'Exclusive Access',
        title: 'Join the Krivea Circle',
        description: 'Be the first to discover new collections, exclusive offers, and styling tips from our jewellery experts.',
        buttonLabel: 'Subscribe',
        disclaimer: 'No spam. Unsubscribe anytime.',
        successMessage: 'Thank you for subscribing! Welcome to the Krivea family.',
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
        heroDescription: `Born from a passion for timeless beauty and modern innovation, ${BRAND_NAME} redefines affordable luxury with our signature anti-tarnish technology.`,
        storyBadge: 'The Beginning',
        storyTitle: 'A Vision of Eternal Shine',
        storyParagraphs: [
            "Krivea was founded with a simple yet powerful vision: to create jewellery that doesn't just look beautiful on day one, but maintains its brilliance for years to come.",
            'Every piece in our collection is thoughtfully designed and meticulously crafted, combining traditional artistry with cutting-edge anti-tarnish technology.',
        ],
        storyImage: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80',
        missionTitle: 'Our Mission',
        missionText: 'To democratize luxury by creating premium, anti-tarnish jewellery that empowers every woman to express her unique elegance, without compromising on quality.',
        visionTitle: 'Our Vision',
        visionText: "To become India's most trusted anti-tarnish jewellery brand, known for exceptional craftsmanship and innovative technology.",
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
        description: 'Premium anti-tarnish jewellery crafted for the modern woman, where every day sparkles.',
        newsletterTitle: 'The Krivea Circle',
        newsletterDescription: 'Be the first to discover new collections, exclusive offers, and styling inspiration.',
        instagramCardText: 'New drops, styling reels & behind-the-scenes from Krivea.',
    },

    seo: {
        title: 'Krivea Jewels | Premium Anti-Tarnish Jewellery | Wear the Sparkle',
        description: BRAND_DESCRIPTION,
    },
};
