import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Hand, RotateCcw, Sparkles, ZoomIn, ArrowRight } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';
import Button from '@/components/ui/Button';
import { JEWEL_PIECES } from './jewelryModels';

const JewelScene = lazy(() => import('./JewelScene'));

const CONTROLS = [
    { icon: Hand,       label: 'Drag to rotate' },
    { icon: ZoomIn,     label: 'Scroll to zoom' },
    { icon: RotateCcw,  label: 'Auto-spins slowly' },
];

export default function JewelExplorerSection() {
    const sectionRef = useRef(null);
    const [inView, setInView] = useState(false);
    const [activePiece, setActivePiece] = useState('ring');
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }, []);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15, rootMargin: '80px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const active = JEWEL_PIECES.find((p) => p.id === activePiece) ?? JEWEL_PIECES[0];

    return (
        <section
            ref={sectionRef}
            id="explore-3d"
            className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-ivory via-[#FFF5F0] to-ivory"
            aria-labelledby="explore-3d-title"
        >
            {/* Ambient decor */}
            <div
                className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(242,184,181,0.5) 0%, transparent 70%)' }}
                aria-hidden="true"
            />
            <div
                className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(217,178,111,0.4) 0%, transparent 70%)' }}
                aria-hidden="true"
            />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 md:mb-14">
                        <SectionTitle
                            subtitle="Interactive Atelier"
                            title="Explore in 3D"
                            description="Inspect every curve, facet, and finish. Drag, zoom, and discover our craftsmanship up close."
                            align="left"
                            className="mb-0 max-w-2xl"
                        />
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-border/40 text-xs text-soft-brown shadow-sm backdrop-blur-sm shrink-0">
                            <Box size={14} className="text-wine" />
                            <span>Real-time WebGL · Studio lighting</span>
                        </div>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                    {/* 3D viewport */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="lg:col-span-7 relative"
                    >
                        <div
                            className="relative rounded-3xl overflow-hidden border border-border/50 bg-gradient-to-br from-white via-[#FFF9F5] to-blush/10 shadow-[0_24px_80px_rgba(90,0,9,0.08)] min-h-[520px] sm:min-h-[560px] lg:min-h-[620px]"
                            style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)', isolation: 'isolate' }}
                        >
                            {/* Viewport frame corners */}
                            <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-gold/30 rounded-tl-lg pointer-events-none z-10" aria-hidden="true" />
                            <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-gold/30 rounded-tr-lg pointer-events-none z-10" aria-hidden="true" />
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-gold/30 rounded-bl-lg pointer-events-none z-10" aria-hidden="true" />
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-gold/30 rounded-br-lg pointer-events-none z-10" aria-hidden="true" />

                            {/* Live badge */}
                            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-border/40 text-[10px] tracking-[0.15em] uppercase text-wine/70 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live 3D Preview
                            </div>

                            {inView && !reducedMotion ? (
                                <Suspense
                                    fallback={
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                            <div className="w-10 h-10 border-2 border-wine/20 border-t-wine rounded-full animate-spin" />
                                            <p className="text-xs text-soft-brown tracking-wide">Loading 3D studio…</p>
                                        </div>
                                    }
                                >
                                    <JewelScene
                                        pieceId={activePiece}
                                        className="absolute inset-0 w-full h-full touch-none"
                                    />
                                </Suspense>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                                    <Sparkles size={32} className="text-blush/60" />
                                    <p className="font-serif text-xl text-charcoal">
                                        {active.label}
                                    </p>
                                    <p className="text-sm text-soft-brown max-w-xs">
                                        {reducedMotion
                                            ? '3D preview paused for reduced motion preference.'
                                            : 'Scroll down to load the interactive 3D viewer.'}
                                    </p>
                                </div>
                            )}

                            {/* Control hints */}
                            <div
                                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex flex-wrap justify-center gap-2 px-3"
                                style={{ transform: 'translate3d(-50%, 0, 0)', WebkitTransform: 'translate3d(-50%, 0, 0)' }}
                            >
                                {CONTROLS.map(({ icon: Icon, label }) => (
                                    <span
                                        key={label}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-border/30 text-[10px] text-soft-brown"
                                    >
                                        <Icon size={11} className="text-wine/60" />
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Piece selector + details */}
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.15 }}
                        className="lg:col-span-5 flex flex-col gap-5"
                    >
                        <p className="text-[10px] tracking-[0.3em] uppercase text-wine/60 font-medium">
                            Choose a piece
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            {JEWEL_PIECES.map((piece) => {
                                const isActive = piece.id === activePiece;
                                return (
                                    <button
                                        key={piece.id}
                                        type="button"
                                        onClick={() => setActivePiece(piece.id)}
                                        className={`relative text-left p-4 rounded-2xl border transition-all duration-300 ${
                                            isActive
                                                ? 'bg-white border-wine/30 shadow-md ring-1 ring-wine/10'
                                                : 'bg-white/60 border-border/40 hover:border-wine/20 hover:bg-white'
                                        }`}
                                        aria-pressed={isActive}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="piece-indicator"
                                                className="absolute top-3 right-3 w-2 h-2 rounded-full bg-wine"
                                            />
                                        )}
                                        <p className={`font-serif text-sm mb-1 ${isActive ? 'text-wine' : 'text-charcoal'}`}>
                                            {piece.label}
                                        </p>
                                        <p className="text-[11px] text-soft-brown leading-snug line-clamp-2">
                                            {piece.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePiece}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35 }}
                                className="flex-1 p-6 rounded-2xl bg-white/80 border border-border/40 backdrop-blur-sm"
                            >
                                <h3 id="explore-3d-title" className="font-serif text-2xl text-charcoal mb-2">
                                    {active.label}
                                </h3>
                                <p className="text-sm text-soft-brown font-light leading-relaxed mb-5">
                                    {active.description}. Crafted with anti-tarnish PVD coating and handset stones. Explore every angle in real time.
                                </p>
                                <ul className="space-y-2 mb-6">
                                    {['18K rose-gold PVD finish', 'Physically-based gem rendering', 'Hypoallergenic & nickel-free'].map((feat) => (
                                        <li key={feat} className="flex items-center gap-2 text-xs text-soft-brown">
                                            <span className="w-1 h-1 rounded-full bg-gold" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/shop">
                                    <Button variant="gold" size="md" className="w-full sm:w-auto gap-2">
                                        Shop {active.label.split(' ')[0]}s
                                        <ArrowRight size={14} />
                                    </Button>
                                </Link>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
