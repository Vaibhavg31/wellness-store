import { useRef, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { ArrowRight, Shield, Sparkles, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { HERO_JEWELRY_IMAGES } from '@/data/fallbackProducts';
import logoMark from '@/assets/wellness-logo.svg';

const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
});

const TRUST_ICONS = { shield: Shield, star: Star, sparkles: Sparkles };

function isBrandAsset(path) {
    if (!path) return false;
    return /logo/i.test(path);
}

function resolveBrandLogo(path) {
    if (!path) return logoMark;
    return imageUrl(path);
}

function JewelStage3D({ items, featuredProduct, centerImage, brandLogo, brandName }) {
    const stageRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 20 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 20 });
    const [stageWidth, setStageWidth] = useState(512);

    // Manual spin — dragging left/right with a mouse or finger adds to this,
    // on top of the ring's own continuous auto-rotation (composed via nesting).
    const dragRotateY = useMotionValue(0);
    const dragRotateYSpring = useSpring(dragRotateY, { stiffness: 160, damping: 28, mass: 0.4 });

    const displayItems = items.length ? items : HERO_JEWELRY_IMAGES.slice(0, 4).map((src) => ({ src, product: null }));

    // Depth values are proportional to stage width so the 3D orbit doesn't
    // distort or clip on narrow phone screens (was a fixed px depth before).
    const depthNear = stageWidth * 0.3125;
    const depthFar = stageWidth * 0.43;
    const perspectivePx = Math.max(900, stageWidth * 2.73);

    const centerSrc = centerImage
        || (featuredProduct?.images?.[0] ? featuredProduct.images[0] : null)
        || brandLogo
        || displayItems[0]?.src;
    const heroImg = centerSrc === brandLogo ? resolveBrandLogo(brandLogo) : imageUrl(centerSrc);
    const showAsBrand = centerSrc === brandLogo || isBrandAsset(centerSrc);

    useEffect(() => {
        const el = stageRef.current;
        if (!el) return undefined;

        const onMove = (e) => {
            const rect = el.getBoundingClientRect();
            mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
            mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
        };
        const onLeave = () => {
            mouseX.set(0);
            mouseY.set(0);
        };

        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        return () => {
            el.removeEventListener('mousemove', onMove);
            el.removeEventListener('mouseleave', onLeave);
        };
    }, [mouseX, mouseY]);

    useEffect(() => {
        const el = stageRef.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([entry]) => {
            const width = entry?.contentRect?.width;
            if (width) setStageWidth(width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handlePan = (_e, info) => {
        dragRotateY.set(dragRotateY.get() + info.delta.x * 0.45);
    };

    // On release, keep spinning and gently decelerate instead of stopping
    // dead — this is what actually reads as "smooth": a real wheel that was
    // flicked keeps turning and eases to a stop, it doesn't just freeze.
    const handlePanEnd = (_e, info) => {
        animate(dragRotateY, dragRotateY.get(), {
            type: 'inertia',
            velocity: info.velocity.x * 0.45,
            power: 0.35,
            timeConstant: 280,
            restDelta: 0.5,
        });
    };

    return (
        <div ref={stageRef} className="relative w-full max-w-[380px] sm:max-w-sm lg:max-w-lg mx-auto aspect-square" style={{ perspective: `${perspectivePx}px` }}>
            <div
                className="absolute inset-[10%] rounded-full blur-3xl opacity-60 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(253, 230, 138,0.45) 0%, rgba(217, 119, 6,0.15) 45%, transparent 70%)' }}
                aria-hidden="true"
            />

            <motion.div className="relative w-full h-full" style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
                <motion.div
                    className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    style={{ transformStyle: 'preserve-3d', rotateY: dragRotateYSpring, touchAction: 'none' }}
                    onPan={handlePan}
                    onPanEnd={handlePanEnd}
                >
                    <motion.div
                        className="absolute inset-0"
                        style={{ transformStyle: 'preserve-3d' }}
                        animate={{ rotateY: 360 }}
                        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                    >
                        {displayItems.map((item, i) => {
                            const angle = (i / displayItems.length) * 360;
                            const tile = (
                                <motion.div
                                    className="w-full h-full rounded-2xl overflow-hidden luxury-shadow-lg border border-white/80 bg-white"
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                                    whileHover={item.product ? { scale: 1.05 } : undefined}
                                >
                                    <img src={imageUrl(item.src)} alt={item.product?.title || ''} className="w-full h-full object-cover" draggable={false} />
                                </motion.div>
                            );
                            return (
                                <div
                                    key={item.product?.id || item.src}
                                    className="absolute left-1/2 top-1/2 w-[38%] aspect-[3/4] -ml-[19%] -mt-[26%]"
                                    style={{
                                        transform: `rotateY(${angle}deg) translateZ(${depthNear}px)`,
                                        transformStyle: 'preserve-3d',
                                    }}
                                >
                                    {item.product ? (
                                        <Link
                                            to={`/shop?search=${encodeURIComponent(item.product.title)}`}
                                            className="block w-full h-full cursor-pointer"
                                            style={{ transformStyle: 'preserve-3d' }}
                                            aria-label={`Shop ${item.product.title}`}
                                        >
                                            {tile}
                                        </Link>
                                    ) : tile}
                                </div>
                            );
                        })}
                    </motion.div>
                </motion.div>

                <div
                    className="absolute left-1/2 top-1/2 w-[52%] aspect-square z-30 pointer-events-none"
                    style={{ transform: 'translate(-50%, -50%)', transformStyle: 'preserve-3d' }}
                >
                    <motion.div
                        className="relative w-full h-full"
                        style={{ transformStyle: 'preserve-3d', transform: `translateZ(${depthFar}px)` }}
                        animate={{ y: [0, -14, 0], scale: [1, 1.03, 1] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <div className="relative w-full h-full rounded-full p-[3px] bg-gradient-to-br from-blush via-gold-light to-rose-gold shadow-[0_24px_64px_rgba(15, 81, 50,0.18)]">
                            <div
                                className={`w-full h-full rounded-full overflow-hidden border-4 border-white ${
                                    showAsBrand ? 'bg-wine flex items-center justify-center p-[14%]' : 'bg-white'
                                }`}
                            >
                                <img
                                    src={heroImg}
                                    alt={showAsBrand ? brandName : (featuredProduct?.title || 'Featured product')}
                                    className={showAsBrand ? 'w-full h-full object-contain' : 'w-full h-full object-cover'}
                                    draggable={false}
                                />
                            </div>
                        </div>
                        <motion.div
                            className="absolute inset-[-12%] rounded-full border border-dashed border-gold/30 pointer-events-none"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                        />
                    </motion.div>
                </div>
            </motion.div>

            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none" aria-hidden="true">
                <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%)',
                        backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                />
            </div>
        </div>
    );
}

/** On mobile WebKit, if the user pinch-zoomed and then reloaded the page,
 *  the browser restores the zoom level but 3D-composited layers don't
 *  recalculate — causing visual corruption. This hook detects that state on
 *  mount and snaps the viewport back to 1:1 scale, then immediately restores
 *  the normal viewport tag so pinch-zoom still works afterwards. */
function useZoomReset() {
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv || Math.abs(vv.scale - 1) < 0.05) return;
        const meta = document.querySelector('meta[name="viewport"]');
        if (!meta) return;
        const original = meta.content;
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0';
        requestAnimationFrame(() => { meta.content = original; });
    }, []);
}

export default function HeroCinematic({ products = [] }) {
    const { content } = useSiteContent();
    const hero = content.hero;
    const showScrollCue = content.sections?.jewelExplorer3D !== false && hero.scrollCue;
    const [videoReady, setVideoReady] = useState(false);
    useZoomReset();

    const featured = useMemo(() => {
        if (!hero.featuredProductId) return null;
        return products.find((p) => p.id === hero.featuredProductId) ?? null;
    }, [products, hero.featuredProductId]);

    const centerProduct = useMemo(() => {
        if (!hero.featuredProductId) return null;
        return products.find((p) => p.id === hero.featuredProductId) ?? null;
    }, [products, hero.featuredProductId]);

    // Real catalogue items, best-sellers/new arrivals first — this is what
    // actually shows in the hero now instead of generic stock photography.
    const shoppableProducts = useMemo(() => {
        const withImages = products.filter((p) => p.images?.[0]);
        return [...withImages].sort(
            (a, b) => (b.isBestSeller || b.isNew ? 1 : 0) - (a.isBestSeller || a.isNew ? 1 : 0)
        );
    }, [products]);

    const fallbackOrbitSrcs = hero.orbitImages?.length ? hero.orbitImages : HERO_JEWELRY_IMAGES;

    // Admin-picked products (Content Manager -> Homepage -> Hero) fill their
    // chosen slots; any slot left on "Auto" — including all 4, the common
    // case — is backfilled from the best-seller/new-arrival pool below, so
    // picking just 1 or 2 products never collapses the orbit to fewer tiles.
    const pickedProducts = useMemo(() => {
        if (!hero.orbitProductIds?.length) return [];
        return hero.orbitProductIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p) => p?.images?.[0]);
    }, [products, hero.orbitProductIds]);

    const orbitItems = useMemo(() => {
        const pickedIds = new Set(pickedProducts.map((p) => p.id));
        const autoFill = shoppableProducts.filter((p) => !pickedIds.has(p.id));

        const combined = [...pickedProducts, ...autoFill].slice(0, 4);
        if (combined.length >= 4) {
            return combined.map((p) => ({ src: p.images[0], product: p }));
        }

        const items = combined.map((p) => ({ src: p.images[0], product: p }));
        const stockNeeded = 4 - items.length;
        return [...items, ...fallbackOrbitSrcs.slice(0, stockNeeded).map((src) => ({ src, product: null }))];
    }, [pickedProducts, shoppableProducts, fallbackOrbitSrcs]);

    return (
        <section className="relative min-h-0 lg:min-h-[92svh] flex flex-col overflow-hidden bg-[#FFF9F5] -mt-[var(--site-header-h,7rem)]">
            <div className="absolute inset-0 bg-mesh-luxury pointer-events-none" aria-hidden="true" />
            <div
                className="absolute top-0 right-0 w-[70%] h-[70%] opacity-40 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(253, 230, 138,0.35) 0%, transparent 55%)' }}
                aria-hidden="true"
            />
            <div
                className="absolute bottom-0 left-0 w-[50%] h-[50%] opacity-30 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 10% 90%, rgba(217, 119, 6,0.25) 0%, transparent 60%)' }}
                aria-hidden="true"
            />

            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={hero.videoPoster}
                    onCanPlay={() => setVideoReady(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${videoReady ? 'opacity-[0.12]' : 'opacity-0'}`}
                >
                    <source src={hero.videoUrl} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFF9F5]/40 via-[#FFF9F5]/75 to-[#FFF9F5]" />
            </div>

            {/* Extra breathing room above the badge/headline — the navbar used
                to be transparent here so content could sit flush against it;
                now that it's a solid wine bar on every page, flush spacing
                reads as cramped, so add a clear gap below it. */}
            <div className="relative z-10 flex-1 flex items-center pt-[calc(var(--site-header-h,7rem)+1.75rem)] sm:pt-[calc(var(--site-header-h,7rem)+2.5rem)] pb-12 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    <div className="text-center lg:text-left order-2 lg:order-1">
                        <motion.div
                            {...fadeUp(0.05)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-blush/40 shadow-sm mb-6 backdrop-blur-sm"
                        >
                            <Sparkles size={14} className="text-wine" />
                            <span className="type-eyebrow text-wine/85">
                                {hero.badge}
                            </span>
                        </motion.div>

                        <motion.span {...fadeUp(0.1)} className="block type-eyebrow tracking-[0.22em] text-rose-ink mb-4">
                            {content.brandName}
                        </motion.span>

                        <motion.h1
                            {...fadeUp(0.15)}
                            className="font-serif text-[2.75rem] sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] 2xl:text-[4.75rem] font-medium text-charcoal leading-[1.06] mb-5 tracking-tight"
                        >
                            {hero.headline}<br />
                            <span className="text-gradient-gold italic font-normal">{hero.headlineAccent}</span>
                        </motion.h1>

                        <motion.p {...fadeUp(0.22)} className="text-lg md:text-xl text-soft-brown font-normal max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
                            {hero.subheadline}
                        </motion.p>

                        <motion.div {...fadeUp(0.28)} className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
                            <Link to={hero.primaryCta?.href || '/shop'}>
                                <Button variant="gold" size="lg" className="min-w-[170px] shadow-md">
                                    {hero.primaryCta?.label || 'Shop Now'} <ArrowRight size={16} />
                                </Button>
                            </Link>
                            {featured && (
                                <Link to={hero.secondaryCta?.href || `/product/${featured.id}`}>
                                    <Button variant="outline" size="lg" className="min-w-[170px] border-wine/25 text-wine hover:bg-wine hover:text-ivory bg-white/70">
                                        {hero.secondaryCta?.label || 'Featured Piece'}
                                    </Button>
                                </Link>
                            )}
                        </motion.div>

                        <motion.div {...fadeUp(0.34)} className="flex flex-wrap gap-5 justify-center lg:justify-start">
                            {(hero.trustBadges ?? []).map(({ icon, label }) => {
                                const Icon = TRUST_ICONS[icon] ?? Sparkles;
                                return (
                                    <div key={label} className="flex items-center gap-2 text-soft-brown">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-border/50 shadow-sm">
                                            <Icon size={15} className="text-wine/70" />
                                        </span>
                                        <span className="type-eyebrow text-soft-brown">{label}</span>
                                    </div>
                                );
                            })}
                        </motion.div>

                        {featured && (
                            <motion.div
                                {...fadeUp(0.4)}
                                className="mt-8 inline-flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/90 border border-border/40 shadow-sm backdrop-blur-sm"
                            >
                                <img src={imageUrl(featured.images[0])} alt="" className="w-14 h-14 rounded-xl object-cover" />
                                <div className="text-left">
                                    <p className="type-eyebrow-sm text-wine/65 capitalize">{featured.category}</p>
                                    <p className="font-serif text-base text-charcoal line-clamp-1">{featured.title}</p>
                                    <p className="text-base font-serif text-wine">{formatPrice(featured.price)}</p>
                                </div>
                            </motion.div>
                        )}

                        {showScrollCue && (
                            <motion.div
                                {...fadeUp(0.46)}
                                className="mt-10 flex flex-col items-center lg:items-start gap-2"
                            >
                                <a href="#explore-3d" className="type-eyebrow-sm text-soft-brown/65 hover:text-wine transition-colors">
                                    {hero.scrollCue}
                                </a>
                                <motion.div
                                    animate={{ y: [0, 6, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="w-px h-6 bg-gradient-to-b from-wine/30 to-transparent"
                                    aria-hidden="true"
                                />
                            </motion.div>
                        )}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="order-1 lg:order-2 min-w-0"
                    >
                        <JewelStage3D
                            items={orbitItems}
                            featuredProduct={centerProduct}
                            centerImage={hero.centerImage}
                            brandLogo={content.logo}
                            brandName={content.brandName}
                        />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
