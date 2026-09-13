import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Sparkles, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import GoalChipStrip from '@/components/shop/GoalChipStrip';
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

// Fade-up stagger for the trust row — same container/item convention used
// across the site's other "good" sections (staggerChildren + delayChildren,
// eased fade+translateY), reused here rather than a one-off curve.
const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Slow-drifting, softly-blurred ambient background — "breathing", not
 * "sparkling". Plain CSS transform/opacity keyframes (.animate-drift-ambient*
 * in index.css), no canvas/WebGL — replaces OpeningIntro's three.js figure
 * rig with something far lighter. Frozen (no animation classes) under
 * reduced motion, leaving just the static gradient wash.
 */
function AmbientBackdrop({ reducedMotion }) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-mesh-brand" />
            <div
                className={`absolute -top-24 right-[-10%] w-[55%] aspect-square rounded-full blur-3xl bg-forest/15 ${reducedMotion ? '' : 'animate-drift-ambient'}`}
            />
            <div
                className={`absolute bottom-[-18%] left-[-12%] w-[48%] aspect-square rounded-full blur-3xl bg-sage-light/80 ${reducedMotion ? '' : 'animate-drift-ambient-slow'}`}
            />
            <div
                className={`absolute top-[28%] left-[38%] w-[22%] aspect-square rounded-full blur-3xl bg-turmeric/10 ${reducedMotion ? '' : 'animate-drift-ambient'}`}
                style={reducedMotion ? undefined : { animationDelay: '4s' }}
            />
        </div>
    );
}

/**
 * A light auto-rotating crossfade of real product photography — replaces
 * JewelStage3D's rotating 3D ring geometry entirely. No 3D rebuild: a plain
 * framer-motion crossfade is enough, and keeps the hero cheap to render.
 */
function PhotoStage({ images, reducedMotion }) {
    const [active, setActive] = useState(0);

    useEffect(() => {
        if (reducedMotion || images.length <= 1) return undefined;
        const id = setInterval(() => setActive((i) => (i + 1) % images.length), 4500);
        return () => clearInterval(id);
    }, [images.length, reducedMotion]);

    if (!images.length) return null;

    return (
        <div className="relative w-full max-w-[420px] sm:max-w-md lg:max-w-lg mx-auto aspect-[4/5] rounded-[2rem] overflow-hidden soft-shadow-lg border border-cream/60">
            <AnimatePresence mode="sync">
                <motion.img
                    key={images[active]}
                    src={imageUrl(images[active])}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={reducedMotion ? false : { opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" aria-hidden="true" />
            {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((src, i) => (
                        <button
                            key={src}
                            type="button"
                            onClick={() => setActive(i)}
                            aria-label={`Show photo ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-cream' : 'w-1.5 bg-cream/50'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function HeroCinematic({ products = [] }) {
    const { content } = useSiteContent();
    const hero = content.hero;
    const reducedMotion = useReducedMotion();

    const featured = useMemo(() => {
        if (!hero.featuredProductId) return null;
        return products.find((p) => p.id === hero.featuredProductId) ?? null;
    }, [products, hero.featuredProductId]);

    // Real catalogue shots, best-sellers/new arrivals first — this is what
    // actually shows in the hero, not generic stock photography.
    const shoppableImages = useMemo(() => {
        const withImages = products.filter((p) => p.images?.[0]);
        const sorted = [...withImages].sort(
            (a, b) => (b.isBestSeller || b.isNew ? 1 : 0) - (a.isBestSeller || a.isNew ? 1 : 0)
        );
        return sorted.map((p) => p.images[0]);
    }, [products]);

    // Admin-picked products (Content Manager -> Homepage -> Hero) fill their
    // chosen slots first; the rest of the stage backfills from the
    // best-seller/new-arrival pool, then curated stock photography.
    const pickedImages = useMemo(() => {
        if (!hero.productImageIds?.length) return [];
        return hero.productImageIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p) => p?.images?.[0])
            .map((p) => p.images[0]);
    }, [products, hero.productImageIds]);

    const stageImages = useMemo(() => {
        const fallback = hero.images?.length ? hero.images : HERO_PRODUCT_IMAGES;
        const combined = [...new Set([...pickedImages, ...shoppableImages])].slice(0, 4);
        return combined.length ? combined : fallback.slice(0, 4);
    }, [pickedImages, shoppableImages, hero.images]);

    return (
        <section className="relative flex flex-col overflow-hidden bg-cream -mt-[var(--site-header-h,7rem)]">
            <div className="relative pt-[calc(var(--site-header-h,7rem)+1.75rem)] sm:pt-[calc(var(--site-header-h,7rem)+2.5rem)] pb-16 px-6 lg:px-12">
                <AmbientBackdrop reducedMotion={reducedMotion} />

                <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
                    <div className="text-center lg:text-left order-2 lg:order-1">
                        <motion.div
                            {...fadeUp(0.05)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream border border-turmeric/25 shadow-sm mb-6"
                        >
                            <Sparkles size={14} className="text-turmeric" />
                            <span className="type-eyebrow text-turmeric-ink">{hero.badge}</span>
                        </motion.div>

                        <motion.span {...fadeUp(0.1)} className="block type-eyebrow tracking-[0.22em] text-forest mb-4">
                            {content.brandName}
                        </motion.span>

                        <motion.h1
                            {...fadeUp(0.15)}
                            className="font-display text-[2.5rem] sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] font-extrabold text-ink leading-[1.08] mb-5 tracking-tight"
                        >
                            {hero.headline}{' '}
                            <span className="text-gradient-turmeric">{hero.headlineAccent}</span>
                        </motion.h1>

                        <motion.p {...fadeUp(0.22)} className="text-lg text-slate max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
                            {hero.subheadline}
                        </motion.p>

                        <motion.div {...fadeUp(0.28)} className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
                            <Link to={hero.primaryCta?.href || '/shop'}>
                                <Button variant="turmeric" size="lg" className="min-w-[170px] shadow-md">
                                    {hero.primaryCta?.label || 'Shop Now'} <ArrowRight size={16} />
                                </Button>
                            </Link>
                            {featured && (
                                <Link to={`/product/${featured.id}`}>
                                    <Button variant="outline" size="lg" className="min-w-[170px] border-forest/25 text-forest hover:bg-forest hover:text-cream bg-cream/70">
                                        Featured Product
                                    </Button>
                                </Link>
                            )}
                        </motion.div>

                        {featured && (
                            <motion.div
                                {...fadeUp(0.34)}
                                className="inline-flex items-center gap-4 px-5 py-3 rounded-2xl bg-cream border border-border/40 shadow-sm"
                            >
                                <img src={imageUrl(featured.images[0])} alt="" className="w-14 h-14 rounded-xl object-cover" />
                                <div className="text-left">
                                    <p className="type-eyebrow-sm text-forest/70 capitalize">{featured.category}</p>
                                    <p className="font-display text-base font-semibold text-ink line-clamp-1">{featured.title}</p>
                                    <p className="text-base text-forest font-semibold">{formatPrice(featured.price)}</p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <motion.div
                        initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="order-1 lg:order-2 min-w-0"
                    >
                        <PhotoStage images={stageImages} reducedMotion={reducedMotion} />
                    </motion.div>
                </div>
            </div>

            {/* Trust row — reuses existing FSSAI / GMP / Lab-Tested copy
                (WhyChoose, CertifiedBanner), no new claims invented here. */}
            <motion.div
                variants={container}
                initial={reducedMotion ? 'show' : 'hidden'}
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className="relative z-10 border-t border-border/50 bg-cream/60"
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                    {(hero.trustBadges ?? []).map(({ icon, label }) => {
                        const Icon = TRUST_ICONS[icon] ?? Sparkles;
                        return (
                            <motion.div key={label} variants={item} className="flex items-center gap-2.5 text-slate">
                                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-forest/8">
                                    <Icon size={16} className="text-forest" strokeWidth={1.5} />
                                </span>
                                <span className="type-eyebrow text-ink/80">{label}</span>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Shop by Goal — goal-first browsing, the single highest-leverage
                move here: reuses the wellnessRituals GOALS model, already
                built for Body Map / Ritual Builder / Wellness Journey. */}
            <div className="relative z-10 bg-cream py-8 sm:py-10">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-12">
                    <p className="text-center type-eyebrow text-slate mb-5 px-4 sm:px-0">Shop by Goal</p>
                    <GoalChipStrip eager />
                </div>
            </div>
        </section>
    );
}
