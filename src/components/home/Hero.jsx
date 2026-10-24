import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Star } from 'lucide-react';
import { LazyMotion, MotionConfig, domAnimation, m, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import Button from '@/components/ui/Button';
import Magnetic from '@/components/ui/Magnetic';
import Price from '@/components/ui/Price';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

const HeroStage = lazy(() => import('@/components/home/HeroStage'));

const BADGE_ICONS = { shield: ShieldCheck, star: Star, sparkles: Leaf };
const EASE = [0.22, 1, 0.36, 1];
const rise = (delay) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.7, ease: EASE } });

/** The product's own cut-out (Admin → Product → Cutout images) if it has one, else the bundled demo cut-out; otherwise a photo card. */
const cutoutFor = (product) => {
    if (product.cutoutImages?.[0]) return product.cutoutImages[0];
    const match = /^\/catalog\/products\/([a-z]+)-1\.webp$/.exec(product.images?.[0] ?? '');
    return match ? `/catalog/cutouts/${match[1]}.webp` : null;
};

/** Admin-pinned hero products first, then best sellers / new arrivals. */
function buildStageItems(products, hero) {
    const withImage = products.filter((p) => p.images?.[0]);
    const pinned = (hero.productImageIds ?? []).map((id) => withImage.find((p) => p.id === id)).filter(Boolean);
    const rest = withImage
        .filter((p) => !pinned.includes(p))
        .sort((a, b) => (b.isBestSeller || b.isNew ? 1 : 0) - (a.isBestSeller || a.isNew ? 1 : 0));
    return [...pinned, ...rest].slice(0, 5).map((p) => ({
        id: p.id,
        product: p,
        title: p.title,
        price: p.price,
        originalPrice: p.originalPrice,
        href: `/product/${p.id}`,
        image: p.images[0],
        cutout: cutoutFor(p),
        eyebrow: p.isNew ? 'New arrival' : p.isBestSeller ? 'Best seller' : 'Featured',
    }));
}

/** Headline words slide up out of a mask, one after another. */
function RevealWords({ text, delay = 0 }) {
    return text.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} className="mr-[0.25em] inline-block overflow-hidden pb-[0.14em] align-bottom -mb-[0.14em]">
            <m.span className="inline-block" initial={{ y: '115%' }} animate={{ y: 0 }} transition={{ delay: delay + i * 0.08, duration: 0.85, ease: EASE }}>{word}</m.span>
        </span>
    ));
}

/**
 * Keeps the animated ring mounted only while it is on or near the screen. Its many composited layers make scrolling
 * past it costly on slower machines, so far away it is swapped for an empty box of the same height (no layout jump).
 */
function StageGate({ children }) {
    const ref = useRef(null);
    const height = useRef(0);
    const [near, setNear] = useState(true);

    useEffect(() => {
        const node = ref.current;
        if (!node || !('IntersectionObserver' in window)) return undefined;
        const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: '120% 0px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const node = ref.current;
        if (!near || !node) return undefined;
        const observer = new ResizeObserver(() => { height.current = node.offsetHeight; });
        observer.observe(node);
        return () => observer.disconnect();
    }, [near]);

    return <div ref={ref} style={near ? undefined : { minHeight: height.current }}>{near ? children : null}</div>;
}

/** Holds the ring's space while its code loads; no picture, so nothing competes with the first screen's real images. */
function StagePlaceholder() {
    return <div className="skeleton mx-auto aspect-square w-full max-w-[34rem] rounded-full" aria-hidden="true" />;
}

export default function Hero({ products, loading = false }) {
    const { content } = useSiteContent();
    const hero = content.hero;
    const orbit = content.extras.heroVisual !== 'image';

    const stageItems = useMemo(() => buildStageItems(products, hero), [products, hero]);
    const showStage = orbit && stageItems.length >= 3;

    const withImage = useMemo(() => products.filter((p) => p.images?.[0]), [products]);
    const pinned = hero.featuredProductId ? withImage.find((p) => p.id === hero.featuredProductId) : null;
    const featured = pinned ?? withImage.find((p) => p.isBestSeller) ?? withImage[0] ?? null;
    const image = pinned?.images[0] ?? hero.images?.[0] ?? featured?.images?.[0];

    /* a soft golden light follows the cursor across the hero (mouse only) */
    const spotX = useSpring(useMotionValue(0), { stiffness: 60, damping: 18, mass: 0.8 });
    const spotY = useSpring(useMotionValue(0), { stiffness: 60, damping: 18, mass: 0.8 });
    const spotOpacity = useSpring(useMotionValue(0), { stiffness: 80, damping: 20 });
    const spot = useMotionTemplate`radial-gradient(420px circle at ${spotX}px ${spotY}px, rgb(192 138 62 / 0.16), rgb(192 138 62 / 0) 65%)`;
    const onPointerMove = (event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        spotX.set(event.clientX - rect.left);
        spotY.set(event.clientY - rect.top);
        spotOpacity.set(1);
    };

    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation}>
                <section className="relative overflow-hidden bg-canvas" onPointerMove={onPointerMove} onPointerLeave={() => spotOpacity.set(0)}>
                    <m.div className="pointer-events-none absolute inset-0" style={{ background: spot, opacity: spotOpacity }} aria-hidden="true" />
                    <div className="container-page relative grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:py-16">
                        <div>
                            {hero.badge && (
                                <m.p {...rise(0.05)} className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-tint px-4 py-1.5 text-caption font-semibold text-primary-deep">
                                    <ShieldCheck size={14} aria-hidden="true" /> {hero.badge}
                                </m.p>
                            )}
                            <h1>
                                <RevealWords text={hero.headline} delay={0.1} />
                                <span className="text-primary"><RevealWords text={hero.headlineAccent} delay={0.1 + hero.headline.split(' ').length * 0.08} /></span>
                            </h1>
                            <m.p {...rise(0.45)} className="mt-5 max-w-xl text-lead text-muted">{hero.subheadline}</m.p>
                            <m.div {...rise(0.55)} className="mt-8 flex flex-wrap gap-3">
                                <Magnetic>
                                    <Link to={hero.primaryCta?.href || '/shop'}>
                                        <Button size="lg">
                                            {hero.primaryCta?.label || 'Shop now'} <ArrowRight size={18} aria-hidden="true" />
                                        </Button>
                                    </Link>
                                </Magnetic>
                                <Magnetic>
                                    <Link to="/about"><Button size="lg" variant="outline">Our story</Button></Link>
                                </Magnetic>
                            </m.div>
                            {hero.trustBadges?.length > 0 && (
                                <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
                                    {hero.trustBadges.map((badge, i) => {
                                        const Icon = BADGE_ICONS[badge.icon] ?? Leaf;
                                        return (
                                            <m.li key={badge.label} {...rise(0.7 + i * 0.08)} className="flex items-center gap-2 text-small font-medium text-ink">
                                                <Icon size={18} className="text-accent-ink" aria-hidden="true" /> {badge.label}
                                            </m.li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {showStage ? (
                            <m.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.9, ease: EASE }} className="order-first min-w-0 lg:order-none">
                                <StageGate>
                                    <Suspense fallback={<StagePlaceholder />}>
                                        <HeroStage items={stageItems} />
                                    </Suspense>
                                </StageGate>
                            </m.div>
                        ) : (
                            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                                <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary-tint" aria-hidden="true" />
                                {(loading || (orbit && stageItems.length === 0 && !image)) && <div className={orbit ? 'skeleton mx-auto aspect-square w-full max-w-[34rem] rounded-xl' : 'skeleton aspect-[9/10] w-full rounded-xl'} aria-hidden="true" />}
                                {!loading && image && (
                                    <img
                                        src={imageUrl(image, 800)}
                                        alt={pinned?.title ?? 'Chikit Ayurvedic wellness products'}
                                        width="720"
                                        height="800"
                                        fetchPriority="high"
                                        decoding="async"
                                        className="aspect-[9/10] w-full rounded-xl object-cover shadow-lg"
                                    />
                                )}
                                {featured && !loading && (
                                    <Link
                                        to={`/product/${featured.id}`}
                                        className="absolute -bottom-5 left-4 right-4 flex items-center justify-between gap-4 rounded-lg bg-surface p-4 shadow-md transition-shadow hover:shadow-lg sm:left-auto sm:right-6 sm:w-72"
                                    >
                                        <span className="min-w-0">
                                            <span className="eyebrow block">Featured</span>
                                            <span className="block truncate font-medium text-ink">{featured.title}</span>
                                            <Price price={featured.price} originalPrice={featured.originalPrice} />
                                        </span>
                                        <ArrowRight size={20} className="shrink-0 text-primary" aria-hidden="true" />
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </LazyMotion>
        </MotionConfig>
    );
}
