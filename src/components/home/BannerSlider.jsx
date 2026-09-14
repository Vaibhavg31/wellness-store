import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { useBanners } from '@/hooks/useApi';

/**
 * Shown until an admin configures real promotional banners in Content
 * Manager — a fresh install otherwise ships with an empty (invisible)
 * slider section, which is exactly the "big banner slider" the storefront
 * is supposed to lead with. Real API banners always take priority once any
 * exist.
 */
const FALLBACK_BANNERS = [
    {
        id: 'fallback-1',
        image: 'https://images.unsplash.com/photo-1579722820258-8bf84d6e8f74?w=1600&q=80',
        subtitle: 'New Season',
        title: 'Fuel every workout, honestly',
        ctaLabel: 'Shop Protein',
        ctaHref: '/shop?category=protein',
    },
    {
        id: 'fallback-2',
        image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=1600&q=80',
        subtitle: 'Everyday Defence',
        title: 'Immunity that keeps up with your day',
        ctaLabel: 'Shop Vitamins',
        ctaHref: '/shop?category=vitamins',
    },
    {
        id: 'fallback-3',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1600&q=80',
        subtitle: 'Rooted in Tradition',
        title: 'Ayurvedic herbs, lab-tested for today',
        ctaLabel: 'Shop Herbal',
        ctaHref: '/shop?category=herbal',
    },
];

const AUTOPLAY_MS = 5500;
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

const slideVariants = {
    enter: (direction) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction > 0 ? '-100%' : '100%', opacity: 0 }),
};

function SlideContent({ banner }) {
    const hasCaption = banner.title || banner.subtitle || banner.ctaLabel;

    const inner = (
        <div className="relative w-full h-full">
            <img
                src={imageUrl(banner.image)}
                alt={banner.title || 'Promotional banner'}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
            />
            {hasCaption && (
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent flex flex-col justify-end p-6 sm:p-10">
                    {banner.subtitle && (
                        <p className="text-cream/80 text-xs sm:text-sm tracking-[0.15em] uppercase mb-1.5">
                            {banner.subtitle}
                        </p>
                    )}
                    {banner.title && (
                        <h3 className="font-display text-2xl sm:text-4xl text-cream mb-3 sm:mb-5 max-w-lg">
                            {banner.title}
                        </h3>
                    )}
                    {banner.ctaLabel && (
                        <span className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-ink bg-cream px-5 py-2.5 rounded-sm w-fit font-medium">
                            {banner.ctaLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    if (!banner.ctaHref) return inner;
    if (/^https?:\/\//i.test(banner.ctaHref)) {
        return (
            <a href={banner.ctaHref} target="_blank" rel="noopener noreferrer" className="block w-full h-full" draggable={false}>
                {inner}
            </a>
        );
    }
    return (
        <Link to={banner.ctaHref} className="block w-full h-full" draggable={false}>
            {inner}
        </Link>
    );
}

export default function BannerSlider() {
    const { banners: apiBanners, loading } = useBanners('slider');
    const banners = apiBanners.length > 0 ? apiBanners : FALLBACK_BANNERS;
    const [[index, direction], setSlide] = useState([0, 1]);
    const [paused, setPaused] = useState(false);
    const count = banners.length;
    const reducedMotionRef = useRef(false);

    useEffect(() => {
        reducedMotionRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    }, []);

    const go = useCallback((newDirection) => {
        setSlide(([i]) => [((i + newDirection) % count + count) % count, newDirection]);
    }, [count]);

    const goTo = useCallback((target) => {
        setSlide(([i]) => [target, target > i ? 1 : -1]);
    }, []);

    useEffect(() => {
        if (count <= 1 || paused || reducedMotionRef.current) return undefined;
        const timer = setInterval(() => go(1), AUTOPLAY_MS);
        return () => clearInterval(timer);
    }, [count, paused, go]);

    return (
        // Full-bleed: breaks out of the normal centered/padded page column to
        // span the entire browser width edge-to-edge, regardless of where
        // this section sits in the page. Safe because body has
        // overflow-x: hidden (src/index.css), so the 50vw technique below
        // can't introduce a horizontal scrollbar.
        <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw] bg-cream">
            {loading ? (
                <div className="h-[46vh] sm:h-[58vh] lg:h-[66vh] bg-sand/60 animate-pulse" />
            ) : (
                <div
                    className="relative h-[46vh] sm:h-[58vh] lg:h-[66vh] min-h-[280px] max-h-[820px] overflow-hidden group"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                        <AnimatePresence initial={false} custom={direction} mode="popLayout">
                            <motion.div
                                key={index}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ x: { type: 'spring', stiffness: 300, damping: 32 }, opacity: { duration: 0.25 } }}
                                drag={count > 1 ? 'x' : false}
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.6}
                                onDragStart={() => setPaused(true)}
                                onDragEnd={(_e, info) => {
                                    setPaused(false);
                                    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) {
                                        go(1);
                                    } else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
                                        go(-1);
                                    }
                                }}
                                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                                style={{ touchAction: 'pan-y' }}
                            >
                                <SlideContent banner={banners[index]} />
                            </motion.div>
                        </AnimatePresence>

                        {count > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => go(-1)}
                                    aria-label="Previous banner"
                                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-cream/85 text-ink shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-cream"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => go(1)}
                                    aria-label="Next banner"
                                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-cream/85 text-ink shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-cream"
                                >
                                    <ChevronRight size={18} />
                                </button>

                                <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
                                    {banners.map((b, i) => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => goTo(i)}
                                            aria-label={`Go to slide ${i + 1}`}
                                            aria-current={i === index}
                                            className="p-1.5 -m-1.5"
                                        >
                                            <span
                                                className={`block rounded-full transition-all duration-300 ${
                                                    i === index ? 'w-6 h-1.5 bg-cream' : 'w-1.5 h-1.5 bg-cream/50 hover:bg-cream/75'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
        </section>
    );
}
