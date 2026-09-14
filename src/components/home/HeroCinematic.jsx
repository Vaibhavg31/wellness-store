import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Shield, Sparkles, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import GoalChipStrip from '@/components/shop/GoalChipStrip';
import ConstellationField from '@/components/ui/ConstellationField';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { HERO_PRODUCT_IMAGES } from '@/data/fallbackProducts';

const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
});

const TRUST_ICONS = { shield: Shield, star: Star, sparkles: Sparkles };
const AUTOPLAY_MS = 6000;

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const slideVariants = {
    enter: (direction) => ({ x: direction > 0 ? '6%' : '-6%', opacity: 0, scale: 1.03 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (direction) => ({ x: direction > 0 ? '-6%' : '6%', opacity: 0, scale: 1.03 }),
};

/**
 * Full-bleed, multi-slide hero banner — the "big slider on the front page"
 * this redesign is anchored on. Real catalogue photography rotates behind
 * the message (autoplay + drag + arrows + progress dots, same interaction
 * language as BannerSlider) instead of the old split text-left/photo-card-
 * right layout, which read exactly like a generic premium-D2C hero.
 */
export default function HeroCinematic({ products = [] }) {
    const { content } = useSiteContent();
    const hero = content.hero;
    const reducedMotion = useReducedMotion();
    const [[index, direction], setSlide] = useState([0, 1]);
    const [paused, setPaused] = useState(false);
    const dragging = useRef(false);

    const featured = useMemo(() => {
        if (!hero.featuredProductId) return null;
        return products.find((p) => p.id === hero.featuredProductId) ?? null;
    }, [products, hero.featuredProductId]);

    const shoppableImages = useMemo(() => {
        const withImages = products.filter((p) => p.images?.[0]);
        const sorted = [...withImages].sort(
            (a, b) => (b.isBestSeller || b.isNew ? 1 : 0) - (a.isBestSeller || a.isNew ? 1 : 0)
        );
        return sorted.map((p) => p.images[0]);
    }, [products]);

    const pickedImages = useMemo(() => {
        if (!hero.productImageIds?.length) return [];
        return hero.productImageIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p) => p?.images?.[0])
            .map((p) => p.images[0]);
    }, [products, hero.productImageIds]);

    const slides = useMemo(() => {
        const fallback = hero.images?.length ? hero.images : HERO_PRODUCT_IMAGES;
        const combined = [...new Set([...pickedImages, ...shoppableImages])].slice(0, 5);
        return combined.length ? combined : fallback.slice(0, 5);
    }, [pickedImages, shoppableImages, hero.images]);

    const count = slides.length;

    const go = useCallback((dir) => {
        setSlide(([i]) => [((i + dir) % count + count) % count, dir]);
    }, [count]);

    const goTo = useCallback((target) => {
        setSlide(([i]) => [target, target > i ? 1 : -1]);
    }, []);

    useEffect(() => {
        if (count <= 1 || paused || reducedMotion) return undefined;
        const timer = setInterval(() => go(1), AUTOPLAY_MS);
        return () => clearInterval(timer);
    }, [count, paused, go, reducedMotion]);

    return (
        <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw] overflow-hidden bg-ink -mt-[var(--site-header-h,7rem)]">
            <div
                className="relative h-[88vh] min-h-[560px] sm:min-h-[620px] max-h-[880px] group"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                {/* Background slide stage */}
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={index}
                        custom={direction}
                        variants={slideVariants}
                        initial={reducedMotion ? false : 'enter'}
                        animate="center"
                        exit={reducedMotion ? undefined : 'exit'}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        drag={count > 1 && !reducedMotion ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.6}
                        onDragStart={() => { dragging.current = true; setPaused(true); }}
                        onDragEnd={(_e, info) => {
                            dragging.current = false;
                            setPaused(false);
                            if (info.offset.x < -60 || info.velocity.x < -400) go(1);
                            else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
                        }}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    >
                        <img
                            src={imageUrl(slides[index])}
                            alt=""
                            className={`absolute inset-0 w-full h-full object-cover ${reducedMotion ? '' : 'animate-ken-burns'}`}
                            draggable={false}
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Legibility + brand wash over the photography */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-r from-forest-deep/70 via-transparent to-transparent" aria-hidden="true" />
                {!reducedMotion && (
                    <ConstellationField variant="light" density={0.7} linkDistance={110} className="opacity-50" />
                )}

                {/* Content overlay */}
                <div className="relative z-10 h-full flex flex-col justify-end pb-24 sm:pb-28 lg:pb-32 pt-[calc(var(--site-header-h,7rem)+1rem)] px-5 sm:px-8 lg:px-12">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="max-w-2xl">
                            <motion.div
                                {...fadeUp(0.05)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream/10 border border-turmeric-light/30 backdrop-blur-sm mb-5"
                            >
                                <Sparkles size={14} className="text-turmeric-light" />
                                <span className="type-eyebrow text-cream/90">{hero.badge}</span>
                            </motion.div>

                            <motion.span {...fadeUp(0.1)} className="block type-eyebrow tracking-[0.22em] text-turmeric-light/90 mb-4">
                                {content.brandName}
                            </motion.span>

                            <motion.h1
                                {...fadeUp(0.15)}
                                className="font-display text-[2.25rem] sm:text-5xl lg:text-[3.75rem] font-extrabold text-cream leading-[1.06] mb-5 tracking-tight text-shadow-brand"
                            >
                                {hero.headline}{' '}
                                <span className="bg-gradient-to-r from-turmeric-light to-turmeric bg-clip-text text-transparent">{hero.headlineAccent}</span>
                            </motion.h1>

                            <motion.p {...fadeUp(0.22)} className="text-base sm:text-lg text-cream/75 max-w-md mb-8 leading-relaxed">
                                {hero.subheadline}
                            </motion.p>

                            <motion.div {...fadeUp(0.28)} className="flex flex-wrap gap-4 mb-2">
                                <Link to={hero.primaryCta?.href || '/shop'}>
                                    <Button variant="turmeric" size="lg" className="min-w-[170px] shadow-lg">
                                        {hero.primaryCta?.label || 'Shop Now'} <ArrowRight size={16} />
                                    </Button>
                                </Link>
                                {featured && (
                                    <Link to={`/product/${featured.id}`}>
                                        <Button variant="outline" size="lg" className="min-w-[170px] border-cream/30 text-cream hover:bg-cream hover:text-ink bg-cream/5 backdrop-blur-sm">
                                            Featured Product
                                        </Button>
                                    </Link>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Slider chrome — arrows + progress dots, the visible "this is a
                    big banner slider" affordance */}
                {count > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            aria-label="Previous slide"
                            className="hidden sm:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-cream/10 border border-cream/20 text-cream backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-cream/20"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            aria-label="Next slide"
                            className="hidden sm:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-cream/10 border border-cream/20 text-cream backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-cream/20"
                        >
                            <ArrowRight size={18} />
                        </button>

                        <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                            {slides.map((src, i) => (
                                <button
                                    key={src + i}
                                    type="button"
                                    onClick={() => goTo(i)}
                                    aria-label={`Go to slide ${i + 1}`}
                                    aria-current={i === index}
                                    className="p-1.5 -m-1.5"
                                >
                                    <span className={`block h-1 rounded-full transition-all duration-500 overflow-hidden ${i === index ? 'w-8 bg-cream/30' : 'w-1.5 bg-cream/30 hover:bg-cream/50'}`}>
                                        {i === index && !paused && !reducedMotion && (
                                            <motion.span
                                                key={index}
                                                initial={{ width: '0%' }}
                                                animate={{ width: '100%' }}
                                                transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
                                                className="block h-full bg-turmeric-light"
                                            />
                                        )}
                                        {i === index && (paused || reducedMotion) && <span className="block h-full w-full bg-turmeric-light" />}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Featured-product callout, floating over the slide's lower-right */}
                {featured && (
                    <motion.div
                        {...fadeUp(0.34)}
                        className="hidden lg:flex absolute right-8 xl:right-12 bottom-24 z-20 items-center gap-4 px-5 py-3 rounded-2xl bg-cream/95 backdrop-blur-md border border-cream/40 shadow-xl max-w-xs"
                    >
                        <img src={imageUrl(featured.images[0])} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        <div className="text-left min-w-0">
                            <p className="type-eyebrow-sm text-forest/70 capitalize">{featured.category}</p>
                            <p className="font-display text-sm font-semibold text-ink line-clamp-1">{featured.title}</p>
                            <p className="text-sm text-forest font-semibold">{formatPrice(featured.price)}</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Trust row — a glass card straddling the slide/page boundary,
                instead of a full-width strip sitting flush beneath it. */}
            <div className="relative z-10 px-5 sm:px-8 lg:px-12">
                <motion.div
                    variants={container}
                    initial={reducedMotion ? 'show' : 'hidden'}
                    whileInView="show"
                    viewport={{ once: true, margin: '-40px' }}
                    className="max-w-5xl mx-auto -mt-8 sm:-mt-10 relative bg-cream rounded-2xl sm:rounded-full soft-shadow-lg border border-border/40 px-6 py-5 sm:px-10 sm:py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
                >
                    {(hero.trustBadges ?? []).map(({ icon, label }) => {
                        const Icon = TRUST_ICONS[icon] ?? Sparkles;
                        return (
                            <motion.div key={label} variants={item} className="flex items-center gap-2.5 text-slate">
                                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-forest/8 flex-shrink-0">
                                    <Icon size={16} className="text-forest" strokeWidth={1.5} />
                                </span>
                                <span className="type-eyebrow text-ink/80 whitespace-nowrap">{label}</span>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Shop by Goal */}
            <div className="relative z-10 bg-cream pt-10 pb-8 sm:pt-12 sm:pb-10">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-12">
                    <p className="text-center type-eyebrow text-slate mb-5 px-4 sm:px-0">Shop by Goal</p>
                    <GoalChipStrip eager />
                </div>
            </div>
        </section>
    );
}
