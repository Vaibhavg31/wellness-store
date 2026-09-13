import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ShoppingBag, Check } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import journeyGlow from '@/assets/wellness-journey-glow.png';
import { bestMatchForGoal } from '../wellnessRituals';
import { STAGES, hourToAngle, lerpAngle } from './journeyStages';
import ClockDial from './ClockDial';
import WalkingFigure from './WalkingFigure';

gsap.registerPlugin(ScrollTrigger);

const R = 220 / 2 - 14;

export default function DesktopJourney({ products }) {
    const sectionRef = useRef(null);
    const pinRef = useRef(null);
    const markerRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const figureRef = useRef(null);
    const lastIndex = STAGES.length - 1;
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [justAdded, setJustAdded] = useState(false);

    useLenisScroll(true);

    useEffect(() => {
        const section = sectionRef.current;
        const pin = pinRef.current;
        const marker = markerRef.current;
        if (!section || !pin || !marker) return undefined;

        gsap.set(marker, {
            x: R * Math.sin((hourToAngle(STAGES[0].hour) * Math.PI) / 180),
            y: -R * Math.cos((hourToAngle(STAGES[0].hour) * Math.PI) / 180),
        });
        figureRef.current?.setProgress(0);

        const trigger = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            pin,
            // Same fix as the sparkle story: an ancestor's transition leaves
            // a non-"none" filter behind which breaks fixed-position pin —
            // transform-based pinning sidesteps it.
            pinType: 'transform',
            pinSpacing: false,
            scrub: 0.5,
            onUpdate: (self) => {
                const progress = self.progress * lastIndex;
                const i0 = Math.floor(progress);
                const i1 = Math.min(lastIndex, i0 + 1);
                const t = progress - i0;
                const angle = lerpAngle(hourToAngle(STAGES[i0].hour), hourToAngle(STAGES[i1].hour), t);
                const rad = (angle * Math.PI) / 180;
                gsap.set(marker, { x: R * Math.sin(rad), y: -R * Math.cos(rad) });

                const nextIndex = Math.min(lastIndex, Math.round(progress));
                setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
                // Figure posture, walk-cycle pace, and the vitality fill are
                // all DOM-driven per frame (like the clock marker above)
                // rather than React state, so they don't force a re-render
                // on every scroll tick.
                figureRef.current?.setProgress(self.progress);
            },
        });

        // This section mounts lazily, often after the sections above it have
        // already resized once (data load, skeleton→content swap) — refresh
        // once more right after mount so the pin start/end reflects their
        // final height. HomePage handles the ongoing case (products arriving
        // later) with its own refresh.
        const settleId = requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            trigger.kill();
            cancelAnimationFrame(settleId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stage = STAGES[activeIndex];
    const product = bestMatchForGoal(products, stage.goalId);

    // A new stage means a (probably) different product — don't carry the
    // previous one's "Added" confirmation across the scroll transition.
    useEffect(() => {
        setJustAdded(false);
    }, [activeIndex]);

    const handleAdd = () => {
        if (!product) return;
        if (addToCart(product)) {
            showCartToast(showToast, product);
            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 1800);
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
        }
    };

    return (
        <section ref={sectionRef} style={{ height: `${STAGES.length * 100}vh` }} className="relative">
            <div ref={pinRef} className="h-screen w-full overflow-hidden bg-gradient-to-b from-[#0A3D25] via-[#0F5132] to-[#0A3D25]">
                {/* Atmospheric depth layer — a generated glow/smoke plate that
                    reads as dawn light breaking through, echoing the vitality
                    arc (dim -> bright) without competing with the foreground
                    content or costing any extra animation logic. */}
                <img
                    src={journeyGlow}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen pointer-events-none"
                />
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[36rem] rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.35) 0%, transparent 70%)' }}
                    aria-hidden="true"
                />

                {/* Progress rail */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {STAGES.map((s, i) => (
                        <span
                            key={s.id}
                            className={`h-1 rounded-full transition-all duration-500 ${
                                i === activeIndex ? 'w-8 bg-turmeric' : 'w-4 bg-cream/25'
                            }`}
                        />
                    ))}
                </div>

                <div className="relative z-10 h-full max-w-6xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-8">
                    <div className="max-w-md order-2 lg:order-1">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={stage.id}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <p className="type-eyebrow text-turmeric-light mb-3">{stage.time}</p>
                                <h3 className="font-display text-3xl sm:text-4xl text-cream leading-tight mb-4">{stage.title}</h3>
                                <p className="text-cream/65 font-light leading-relaxed mb-6">{stage.copy}</p>

                                {product && (
                                    <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm p-3 hover:border-turmeric/50 transition-colors">
                                        <Link to={`/product/${product.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                            <img
                                                src={imageUrl(product.images?.[0])}
                                                alt=""
                                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10"
                                            />
                                            <span className="text-left min-w-0">
                                                <span className="block text-xs text-cream/50">Fits this moment</span>
                                                <span className="block text-sm text-cream font-medium truncate">{product.title}</span>
                                                <span className="block text-sm text-turmeric-light">{formatPrice(product.price)}</span>
                                            </span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={handleAdd}
                                            disabled={justAdded}
                                            className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-90 ${
                                                justAdded ? 'bg-emerald text-cream' : 'bg-turmeric text-ink hover:bg-turmeric-light'
                                            }`}
                                        >
                                            {justAdded ? <Check size={14} strokeWidth={2} /> : <ShoppingBag size={14} strokeWidth={1.5} />}
                                            {justAdded ? 'Added' : 'Add'}
                                        </button>
                                        <Link
                                            to={`/product/${product.id}`}
                                            className="flex-shrink-0 text-cream/40 hover:text-turmeric-light transition-colors"
                                            aria-label={`View ${product.title}`}
                                        >
                                            <ArrowRight size={15} />
                                        </Link>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="order-1 lg:order-2 flex justify-center">
                        <ClockDial ref={markerRef} stages={STAGES} activeIndex={activeIndex} />
                    </div>

                    <div className="hidden lg:flex order-3 justify-center">
                        <WalkingFigure ref={figureRef} activeGlow={stage.glow} />
                    </div>
                </div>
            </div>
        </section>
    );
}
