import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useTransform, useAnimationFrame } from 'framer-motion';
import { ShoppingBag, Move3D, ArrowUpRight } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { useCart } from '@/contexts/CartContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import AmbientBlobs from '@/components/ui/AmbientBlobs';
import DabbiFrame from '@/components/ui/DabbiFrame';
import herbWreath from '@/assets/orbit-herb-wreath.png';

/** The product photo shown inside a round "dabbi" container — a
 *  background-removed cutout when the admin has generated one, since it
 *  sits inside the circular frame without a white rectangle behind it,
 *  falling back to the regular cover photo otherwise. */
const dabbiPhoto = (product) => product?.cutoutImages?.[0] || product?.images?.[0];

/** deg -> rad */
const toRad = (deg) => (deg * Math.PI) / 180;

/** Responsive orbit geometry — a fixed lookup instead of measuring the
 * container, since positions are computed in raw pixels (transform x/y),
 * not percentages. */
const CONFIGS = {
    sm: { radius: 108, itemSize: 60, centerSize: 108, count: 4, height: '22rem' },
    md: { radius: 158, itemSize: 78, centerSize: 138, count: 5, height: '29rem' },
    lg: { radius: 216, itemSize: 92, centerSize: 172, count: 5, height: '36rem' },
};

function useOrbitConfig() {
    const [config, setConfig] = useState(CONFIGS.lg);
    useEffect(() => {
        const mqSm = window.matchMedia('(max-width: 639px)');
        const mqMd = window.matchMedia('(min-width: 640px) and (max-width: 1023px)');
        const update = () => setConfig(mqSm.matches ? CONFIGS.sm : mqMd.matches ? CONFIGS.md : CONFIGS.lg);
        update();
        mqSm.addEventListener('change', update);
        mqMd.addEventListener('change', update);
        return () => {
            mqSm.removeEventListener('change', update);
            mqMd.removeEventListener('change', update);
        };
    }, []);
    return config;
}

/**
 * One orbiting product. Owns its own `useTransform` subscriptions so the
 * parent never re-renders while the orbit spins — position math runs
 * entirely on framer-motion's own render loop.
 */
function OrbitItem({ product, baseAngle, radius, itemSize, rotation, hovered, onHover, onLeave, onActivate, isDragRef }) {
    const x = useTransform(rotation, (r) => radius * Math.cos(toRad(r + baseAngle)));
    const y = useTransform(rotation, (r) => radius * Math.sin(toRad(r + baseAngle)));
    const spinBack = useTransform(rotation, (r) => -r);

    const half = itemSize / 2;

    return (
        <motion.button
            type="button"
            style={{ x, y, width: itemSize, height: itemSize, marginLeft: -half, marginTop: -half }}
            className="absolute top-1/2 left-1/2 flex items-center justify-center touch-none"
            initial={false}
            animate={{
                scale: hovered ? 1.22 : 1,
                zIndex: hovered ? 30 : 10,
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onClick={(e) => {
                if (isDragRef.current) {
                    e.preventDefault();
                    return;
                }
                onActivate(product);
            }}
            aria-label={`View ${product.title}`}
        >
            {/* Counter-rotates against the shared orbit rotation so the photo
                stays upright while it travels — this span's rotation must
                NOT reach the tooltip below, so the tooltip lives outside it
                as a sibling, not a child (a child would inherit the spin and
                swing out at an angle instead of sitting straight under the
                item). */}
            <motion.span
                style={{ rotate: spinBack }}
                className={`absolute inset-0 rounded-full transition-transform duration-300 ${hovered ? 'scale-[1.08]' : ''}`}
            >
                <DabbiFrame
                    src={imageUrl(dabbiPhoto(product))}
                    alt=""
                    size={itemSize}
                    className={`transition-shadow duration-300 ${hovered ? 'shadow-turmeric/30' : ''}`}
                />
            </motion.span>

            {/* Static x centering (-50%) alongside an animated y — the two
                are independent transform channels in framer-motion, so they
                compose instead of one clobbering the other. */}
            <motion.span
                initial={false}
                style={{ x: '-50%' }}
                animate={{ opacity: hovered ? 1 : 0, y: hovered ? 8 : 14 }}
                transition={{ duration: 0.2 }}
                className="absolute left-1/2 top-full whitespace-nowrap px-2.5 py-1 rounded-full bg-ink text-cream text-[11px] font-medium shadow-lg pointer-events-none"
            >
                {formatPrice(product.price)}
            </motion.span>
        </motion.button>
    );
}

/**
 * Full-bleed drag-to-spin product orbit — a center stage cycling through an
 * admin-curated lineup, with the rest of that same lineup circling it.
 * Nothing here is chosen automatically: both the center rotation and the
 * ring pull strictly from products marked "Feature in Orbit Ring" (see
 * OrbitRingManager / AdminProductFormPage) — an empty curated list means an
 * empty section, never a best-seller/new fallback. Ring position is driven
 * by one shared `rotation` motion value (plain degrees); dragging maps
 * pointer angle directly onto it 1:1 ("grabbed" feel) and release hands off
 * to a manual exponential-decay coast rather than a fixed easing curve, so
 * the spin speed you let go at is the spin speed it continues at — that's
 * the "fast, physical" feel a scripted ease can't give. Idle auto-drift only
 * runs when nothing is being dragged or hovered.
 */
export default function OrbitShowcase({ products = [] }) {
    const navigate = useNavigate();
    const reducedMotion = useReducedMotion();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const { radius, itemSize, centerSize, count, height } = useOrbitConfig();

    const rotation = useMotionValue(0);
    const wrapperRef = useRef(null);
    const isDraggingRef = useRef(false);
    const isDragRef = useRef(false); // true once a pointer-down turns into an actual drag
    const rectRef = useRef(null);
    const lastAngleRef = useRef(0);
    const startAngleRef = useRef(0);
    const lastTimeRef = useRef(0);
    const velocityRef = useRef(0); // deg / ms
    const inertiaRef = useRef(0);
    const [hoveredId, setHoveredId] = useState(null);
    const [cursorGrabbing, setCursorGrabbing] = useState(false);
    const [justAdded, setJustAdded] = useState(false);
    const [centerHovered, setCenterHovered] = useState(false);

    // Strictly admin-curated, never automatic — every product here (center
    // rotation AND the ring around it) is one an admin explicitly picked via
    // "Feature in Orbit Ring" (on the product's own edit page, or the
    // dedicated Content → Homepage → Orbit Ring manager). No best-seller/new
    // heuristic, no fallback: with nothing curated, the section shows
    // nothing (see the `!centerProduct` guard below) rather than guessing.
    const picks = useMemo(() => {
        const curated = products.filter((p) => p.orbitFeatured && p.images?.[0]);
        return [...curated].sort((a, b) => (a.orbitSortOrder ?? 0) - (b.orbitSortOrder ?? 0));
    }, [products]);

    const [centerIndex, setCenterIndex] = useState(0);
    useEffect(() => {
        setCenterIndex((i) => (picks.length ? i % picks.length : 0));
    }, [picks.length]);

    useEffect(() => {
        if (picks.length < 2 || reducedMotion || centerHovered) return undefined;
        const timer = setInterval(() => {
            setCenterIndex((i) => (i + 1) % picks.length);
        }, 4200);
        return () => clearInterval(timer);
    }, [picks.length, reducedMotion, centerHovered]);

    const centerProduct = picks[centerIndex];
    const orbitProducts = useMemo(
        () => picks.filter((p) => p.id !== centerProduct?.id).slice(0, count),
        [picks, centerProduct, count],
    );

    useAnimationFrame((_t, delta) => {
        if (isDraggingRef.current) return;
        if (Math.abs(inertiaRef.current) > 0.0006) {
            rotation.set(rotation.get() + inertiaRef.current * delta);
            // Exponential decay tuned to feel like a flicked wheel coasting
            // to a stop over ~1.5-2s, not a slider snapping back — frame-
            // rate independent via delta so it decays the same on a 60Hz
            // or 120Hz display.
            inertiaRef.current *= Math.pow(0.06, delta / 1000);
        } else if (!hoveredId && !reducedMotion) {
            rotation.set(rotation.get() + 0.012 * delta);
        }
    });

    const angleFromEvent = useCallback((e) => {
        const rect = rectRef.current;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    }, []);

    // Deliberately NOT using setPointerCapture on the wrapper: capturing the
    // pointer there retargets the *click* event too (it's one of the
    // pointer-capture-aware compatibility events), which silently ate every
    // click on the product buttons underneath — verified by hand, not a
    // hypothetical. Plain window listeners added on down / removed on up
    // sidestep that entirely and are what the rest of this codebase already
    // uses for its other drag surfaces (see BannerSlider).
    const handlePointerMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        const angle = angleFromEvent(e);
        let delta = angle - lastAngleRef.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const now = performance.now();
        const dt = Math.max(1, now - lastTimeRef.current);
        velocityRef.current = delta / dt;
        rotation.set(rotation.get() + delta);
        lastAngleRef.current = angle;
        lastTimeRef.current = now;
        if (Math.abs(angle - startAngleRef.current) > 2.5) isDragRef.current = true;
    }, [angleFromEvent, rotation]);

    const endDrag = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setCursorGrabbing(false);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', endDragRef.current);
        window.removeEventListener('pointercancel', endDragRef.current);
        // The raw measured velocity plus a modest boost — pointer sampling
        // slightly underestimates a genuine flick's speed — gated so a
        // near-still release doesn't launch a crawl that never settles.
        inertiaRef.current = Math.abs(velocityRef.current) > 0.02 ? velocityRef.current * 2.5 : 0;
        // Let the click handler on the item see isDragRef this tick, then
        // clear it for the next gesture.
        requestAnimationFrame(() => { isDragRef.current = false; });
    }, [handlePointerMove]);

    const endDragRef = useRef(endDrag);
    endDragRef.current = endDrag;

    const handlePointerDown = (e) => {
        rectRef.current = wrapperRef.current.getBoundingClientRect();
        isDraggingRef.current = true;
        isDragRef.current = false;
        inertiaRef.current = 0;
        setCursorGrabbing(true);
        const angle = angleFromEvent(e);
        startAngleRef.current = angle;
        lastAngleRef.current = angle;
        lastTimeRef.current = performance.now();
        velocityRef.current = 0;
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', endDragRef.current);
        window.addEventListener('pointercancel', endDragRef.current);
    };

    useEffect(() => () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', endDragRef.current);
        window.removeEventListener('pointercancel', endDragRef.current);
    }, [handlePointerMove]);

    const handleActivate = (product) => navigate(`/product/${product.id}`);

    const handleCenterAdd = (e) => {
        e.stopPropagation();
        if (!centerProduct) return;
        if (addToCart(centerProduct)) {
            showCartToast(showToast, centerProduct);
            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 1600);
        }
    };

    if (!centerProduct) return null;

    return (
        <section className="relative overflow-hidden bg-cream py-16 sm:py-20 lg:py-24">
            <AmbientBlobs variant="forest" className="opacity-70" />
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-4">
                    <span className="inline-flex items-center gap-2 type-eyebrow text-turmeric mb-4">
                        <Move3D size={14} /> Drag to Explore
                    </span>
                    <h2 className="font-display text-3xl md:text-[2.5rem] font-medium text-ink leading-[1.1]">
                        Your Wellness Orbit
                    </h2>
                    <p className="mt-4 text-slate font-light text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                        Spin the ring, hover a pick, click through — a handpicked lineup, curated by us.
                    </p>
                </div>

                <div
                    ref={wrapperRef}
                    onPointerDown={handlePointerDown}
                    style={{ height, touchAction: 'none' }}
                    className={`relative w-full select-none ${cursorGrabbing ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    {/* Decorative herb wreath — a slow, perpetual spin (independent
                        of the drag-driven `rotation` value above) so the ring feels
                        alive even before anyone touches it. Purely decorative: sits
                        behind everything else and never intercepts pointer events. */}
                    <motion.img
                        src={herbWreath}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="absolute top-1/2 left-1/2 pointer-events-none select-none opacity-90 mix-blend-multiply"
                        style={{
                            width: radius * 2 + itemSize * 1.3,
                            height: radius * 2 + itemSize * 1.3,
                            x: '-50%',
                            y: '-50%',
                        }}
                        animate={reducedMotion ? {} : { rotate: 360 }}
                        transition={reducedMotion ? {} : { repeat: Infinity, ease: 'linear', duration: 90 }}
                    />

                    {/* Center stage — cycles through the admin's curated Orbit
                        picks with a card-flip transition instead of a plain
                        crossfade, so multiple products visibly "change" here
                        rather than the section looking static. */}
                    <div
                        className="absolute top-1/2 left-1/2 flex flex-col items-center z-20"
                        style={{ width: centerSize, transform: 'translate(-50%,-50%)' }}
                        onMouseEnter={() => setCenterHovered(true)}
                        onMouseLeave={() => setCenterHovered(false)}
                    >
                        <div className={`absolute inset-0 -m-3 rounded-full bg-turmeric/25 blur-2xl ${reducedMotion ? '' : 'animate-drift-ambient'}`} aria-hidden="true" />

                        <div style={{ perspective: 700 }}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={centerProduct.id}
                                    initial={{ opacity: 0, scale: 0.72, rotateY: 100 }}
                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                    exit={{ opacity: 0, scale: 0.72, rotateY: -100 }}
                                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex flex-col items-center"
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => { if (!isDragRef.current) { e.stopPropagation(); handleActivate(centerProduct); } }}
                                        className="relative"
                                        aria-label={`View ${centerProduct.title}`}
                                    >
                                        <DabbiFrame
                                            src={imageUrl(dabbiPhoto(centerProduct))}
                                            alt={centerProduct.title}
                                            size={centerSize}
                                        />
                                    </button>
                                    <div className="relative mt-3 text-center max-w-[11rem] pointer-events-none">
                                        <p className="font-display text-sm sm:text-base text-ink line-clamp-1">{centerProduct.title}</p>
                                        <p className="text-sm text-forest font-semibold mt-0.5">{formatPrice(centerProduct.price)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCenterAdd}
                                        className={`relative mt-3 pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full type-eyebrow-sm font-medium transition-colors shadow-md ${
                                            justAdded ? 'bg-emerald text-cream' : 'bg-forest text-cream hover:bg-forest-light'
                                        }`}
                                    >
                                        <ShoppingBag size={13} strokeWidth={1.5} />
                                        {justAdded ? 'Added' : 'Add to Bag'}
                                    </button>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {picks.length > 1 && (
                            <div className="relative mt-3 flex items-center gap-1.5 pointer-events-auto">
                                {picks.map((p, i) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCenterIndex(i); }}
                                        aria-label={`Show ${p.title} in the center`}
                                        className={`rounded-full transition-all ${
                                            i === centerIndex ? 'w-4 h-1.5 bg-forest' : 'w-1.5 h-1.5 bg-forest/25 hover:bg-forest/40'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {orbitProducts.map((product, i) => (
                        <OrbitItem
                            key={product.id}
                            product={product}
                            baseAngle={(360 / orbitProducts.length) * i - 90}
                            radius={radius}
                            itemSize={itemSize}
                            rotation={rotation}
                            hovered={hoveredId === product.id}
                            onHover={() => setHoveredId(product.id)}
                            onLeave={() => setHoveredId(null)}
                            onActivate={handleActivate}
                            isDragRef={isDragRef}
                        />
                    ))}
                </div>

                <p className="text-center text-sm text-slate/70 mt-2 flex items-center justify-center gap-1.5">
                    Click any product to open it <ArrowUpRight size={13} />
                </p>
            </div>
        </section>
    );
}
