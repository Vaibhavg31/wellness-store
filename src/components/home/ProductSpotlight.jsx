import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { ArrowRight, Leaf, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { useProducts } from '@/hooks/useApi';
import { getBestSellers } from '@/utils/products';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Button from '@/components/ui/Button';

const TRUST_ROW = [
    { icon: ShieldCheck, label: 'Lab Tested' },
    { icon: Star, label: '4.8★ Rated' },
    { icon: Leaf, label: 'FSSAI Certified' },
];

/**
 * A true 3D product ring — perspective + rotateY(angle) translateZ(depth)
 * per card, not a flat slide-and-scale illusion. Three rotations compose
 * together as nested layers: the whole ring gently tilts toward the
 * cursor (mouse parallax), spins as the visitor drags it left/right (with
 * inertia on release, like a flicked wheel keeps turning instead of
 * stopping dead), and keeps drifting on its own the rest of the time — so
 * it reads as alive whether or not anyone touches it. A featured product
 * floats medallion-style at the center on its own independently-orbiting
 * dashed ring.
 *
 * Depth is proportional to the stage's measured width (via ResizeObserver)
 * rather than a fixed pixel value, so the ring doesn't distort or clip on
 * narrow phone screens.
 */
function ProductOrbitStage({ items, centerProduct }) {
    const reducedMotion = useReducedMotion();
    const stageRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 20 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 20 });
    const [stageWidth, setStageWidth] = useState(384);

    // Manual spin — dragging left/right adds to this, on top of the ring's
    // own continuous auto-rotation (composed by nesting the two layers).
    const dragRotateY = useMotionValue(0);
    const dragRotateYSpring = useSpring(dragRotateY, { stiffness: 160, damping: 28, mass: 0.4 });

    const depthNear = stageWidth * 0.3125;
    const depthFar = stageWidth * 0.43;
    const perspectivePx = Math.max(900, stageWidth * 2.73);

    useEffect(() => {
        const el = stageRef.current;
        if (!el || reducedMotion) return undefined;

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
    }, [mouseX, mouseY, reducedMotion]);

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
    // dead — a flicked wheel eases to a stop, it doesn't just freeze.
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
        <div
            ref={stageRef}
            className="relative w-full max-w-[380px] sm:max-w-sm mx-auto aspect-square"
            style={{ perspective: `${perspectivePx}px` }}
        >
            <div
                className="absolute inset-[10%] rounded-full blur-3xl opacity-60 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.30) 0%, rgba(15,81,50,0.14) 45%, transparent 70%)' }}
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
                        animate={reducedMotion ? undefined : { rotateY: 360 }}
                        transition={reducedMotion ? undefined : { duration: 32, repeat: Infinity, ease: 'linear' }}
                    >
                        {items.map((product, i) => {
                            const angle = (i / items.length) * 360;
                            return (
                                <div
                                    key={product.id}
                                    className="absolute left-1/2 top-1/2 w-[38%] aspect-[3/4] -ml-[19%] -mt-[26%]"
                                    style={{
                                        transform: `rotateY(${angle}deg) translateZ(${depthNear}px)`,
                                        transformStyle: 'preserve-3d',
                                    }}
                                >
                                    <Link
                                        to={`/product/${product.id}`}
                                        className="block w-full h-full cursor-pointer"
                                        style={{ transformStyle: 'preserve-3d' }}
                                        aria-label={`Shop ${product.title}`}
                                    >
                                        <motion.div
                                            className="w-full h-full rounded-2xl overflow-hidden ring-1 ring-cream/80 bg-cream shadow-2xl shadow-forest/20"
                                            animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
                                            transition={reducedMotion ? undefined : { duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            <img
                                                src={imageUrl(product.cutoutImages?.[0] || product.images[0])}
                                                alt={product.title}
                                                draggable={false}
                                                className="w-full h-full object-cover pointer-events-none select-none"
                                            />
                                        </motion.div>
                                    </Link>
                                </div>
                            );
                        })}
                    </motion.div>
                </motion.div>

                {/* Center medallion — the pick of the lineup, floating on its own
                    depth plane with an independently-spinning dashed ring. */}
                <div
                    className="absolute left-1/2 top-1/2 w-[52%] aspect-square z-30 pointer-events-none"
                    style={{ transform: 'translate(-50%, -50%)', transformStyle: 'preserve-3d' }}
                >
                    <motion.div
                        className="relative w-full h-full"
                        style={{ transformStyle: 'preserve-3d', transform: `translateZ(${depthFar}px)` }}
                        animate={reducedMotion ? undefined : { y: [0, -14, 0], scale: [1, 1.03, 1] }}
                        transition={reducedMotion ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <div className="relative w-full h-full rounded-full p-[3px] bg-gradient-to-br from-turmeric-light via-turmeric to-forest-light shadow-[0_24px_64px_rgba(15,81,50,0.22)]">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-cream bg-cream">
                                <img
                                    src={imageUrl(centerProduct.cutoutImages?.[0] || centerProduct.images[0])}
                                    alt={centerProduct.title}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                />
                            </div>
                        </div>
                        <motion.div
                            className="absolute inset-[-12%] rounded-full border border-dashed border-turmeric/40 pointer-events-none"
                            animate={reducedMotion ? undefined : { rotate: 360 }}
                            transition={reducedMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'linear' }}
                        />
                    </motion.div>
                </div>
            </motion.div>

            {/* Periodic diagonal light sweep — a quiet ambient flourish, not a
                loop the eye is meant to track. */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none" aria-hidden="true">
                <motion.div
                    className="absolute inset-0 opacity-25"
                    style={{
                        background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)',
                        backgroundSize: '200% 100%',
                    }}
                    animate={reducedMotion ? undefined : { backgroundPosition: ['200% 0', '-200% 0'] }}
                    transition={reducedMotion ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                />
            </div>
        </div>
    );
}

/**
 * A hero-weight "spotlight" section: text left, a true 3D product ring
 * right (see ProductOrbitStage above) — drag it, or just let it turn.
 * Distinct from the "Your Wellness Orbit" section further down the page,
 * which is a flat 2D drag-to-spin catalogue browser; this one is a tight,
 * cinematic ring meant to read as a second hero beat right after the main
 * one.
 *
 * Product selection is dynamic, not hardcoded — best-sellers first (the
 * same flag admins already set per product), falling back to the first
 * published products so the section never renders empty on a fresh
 * catalogue.
 */
export default function ProductSpotlight() {
    const navigate = useNavigate();
    const { products } = useProducts();

    const pool = useMemo(() => {
        const withImages = products.filter((p) => p.images?.[0]);
        const bestSellers = getBestSellers(withImages);
        return bestSellers.length >= 4 ? bestSellers : withImages;
    }, [products]);

    const centerProduct = pool[0];
    const ringItems = useMemo(() => {
        if (!pool.length) return [];
        const rest = pool.slice(1);
        return (rest.length >= 3 ? rest : pool).slice(0, 5);
    }, [pool]);

    if (!centerProduct) return null;

    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-sand/60 via-cream to-cream py-16 sm:py-20 lg:py-28">
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Copy */}
                <div className="text-center lg:text-left">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cream border border-border/70 soft-shadow type-eyebrow-sm text-forest mb-6">
                        <Sparkles size={12} className="text-turmeric" />
                        This Week&apos;s Favourites
                    </span>

                    <h2 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-medium text-ink leading-[1.08] mb-5">
                        Fuel your
                        <br />
                        <span className="text-turmeric">everyday ritual</span>
                    </h2>

                    <p className="text-slate font-light text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 mb-8">
                        The products our customers keep reordering — clean-label, lab-tested,
                        and picked for the routines that actually stick.
                    </p>

                    <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-10">
                        <Button variant="turmeric" size="lg" onClick={() => navigate('/shop')} className="gap-2">
                            Shop Now <ArrowRight size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => navigate(`/product/${centerProduct.id}`)}
                            className="border-forest/25 text-forest hover:bg-forest hover:text-cream bg-cream/70"
                        >
                            Today&apos;s Pick
                        </Button>
                    </div>

                    <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-3 mb-8">
                        {TRUST_ROW.map(({ icon: Icon, label }) => (
                            <span key={label} className="inline-flex items-center gap-2">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-forest/8 text-forest flex-shrink-0">
                                    <Icon size={14} strokeWidth={1.75} />
                                </span>
                                <span className="type-eyebrow-sm text-ink/80 whitespace-nowrap">{label}</span>
                            </span>
                        ))}
                    </div>

                    {/* Featured-product callout — same "small white card" language
                        as the main hero's own featured-product chip. */}
                    <Link
                        to={`/product/${centerProduct.id}`}
                        className="inline-flex items-center gap-4 px-5 py-3 rounded-2xl bg-cream border border-border/40 soft-shadow"
                    >
                        <img
                            src={imageUrl(centerProduct.images[0])}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        />
                        <span className="text-left">
                            <span className="block type-eyebrow-sm text-forest/70">Center of the ring</span>
                            <span className="block font-display text-base text-ink line-clamp-1 max-w-[12rem]">{centerProduct.title}</span>
                            <span className="block text-sm font-semibold text-forest">{formatPrice(centerProduct.price)}</span>
                        </span>
                    </Link>
                </div>

                {/* True 3D product ring */}
                <ProductOrbitStage items={ringItems} centerProduct={centerProduct} />
            </div>
        </section>
    );
}
