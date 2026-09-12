import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/utils/formatPrice';
import SparkleBurst from './SparkleBurst';
import { useLenisScroll } from './useLenisScroll';

const JewelScene = lazy(() => import('@/components/home/JewelExplorer3D/JewelScene'));

gsap.registerPlugin(ScrollTrigger);

export default function DesktopStory({ stages, product, ctaLabel }) {
    const sectionRef = useRef(null);
    const pinRef = useRef(null);
    const bgRefs = useRef([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const lastIndex = stages.length - 1;
    const isFinalStage = activeIndex === lastIndex;

    useLenisScroll(true);

    useEffect(() => {
        const section = sectionRef.current;
        const pin = pinRef.current;
        if (!section || !pin) return undefined;

        const trigger = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            pin,
            // The app's page-transition wrapper leaves an inline
            // `filter: blur(0px)` on an ancestor after it finishes
            // animating — any non-"none" filter creates a new containing
            // block, which silently breaks GSAP's default `position:
            // fixed` pinning. Transform-based pinning sidesteps that.
            pinType: 'transform',
            pinSpacing: false,
            scrub: 0.4,
            onUpdate: (self) => {
                const progress = self.progress * lastIndex;
                bgRefs.current.forEach((el, i) => {
                    if (!el) return;
                    const distance = Math.abs(progress - i);
                    const opacity = Math.max(0, 1 - distance);
                    gsap.set(el, { opacity, scale: 1.04 + (1 - opacity) * 0.03 });
                });
                const nextIndex = Math.min(lastIndex, Math.round(progress));
                setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
            },
        });

        return () => trigger.kill();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stages.length]);

    const piece3dId = useMemo(() => {
        const category = product?.category;
        return ['ring', 'necklace', 'earrings', 'bracelet'].includes(category) ? category : 'ring';
    }, [product]);

    return (
        <section ref={sectionRef} style={{ height: `${stages.length * 100}vh` }} className="relative">
            <div ref={pinRef} className="h-screen w-full overflow-hidden bg-charcoal">
                {stages.map((stage, i) => (
                    <div
                        key={stage.id}
                        ref={(el) => { bgRefs.current[i] = el; }}
                        className="absolute inset-0"
                        style={{ opacity: i === 0 ? 1 : 0, willChange: 'opacity, transform' }}
                    >
                        <img
                            src={stage.image}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            loading={i === 0 ? 'eager' : 'lazy'}
                            draggable={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/25 to-charcoal/40" />
                    </div>
                ))}

                {/* Progress rail */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {stages.map((stage, i) => (
                        <span
                            key={stage.id}
                            className={`h-1 rounded-full transition-all duration-500 ${
                                i === activeIndex ? 'w-8 bg-gold' : 'w-4 bg-ivory/35'
                            }`}
                        />
                    ))}
                </div>

                <div className="relative z-10 h-full flex flex-col items-center justify-end pb-20 px-6 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={stages[activeIndex].id}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="max-w-xl"
                        >
                            <p className="type-eyebrow text-gold-light mb-3">{stages[activeIndex].timeLabel}</p>
                            <h3 className="font-serif text-3xl sm:text-4xl text-ivory leading-tight">
                                {stages[activeIndex].copy}
                            </h3>
                        </motion.div>
                    </AnimatePresence>

                    <AnimatePresence>
                        {isFinalStage && (
                            <motion.div
                                initial={{ opacity: 0, y: 32, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 16 }}
                                transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="mt-10 flex flex-col items-center gap-6"
                            >
                                <div className="w-56 h-56 sm:w-64 sm:h-64">
                                    <Suspense fallback={null}>
                                        <JewelScene pieceId={piece3dId} className="relative w-full h-full" />
                                    </Suspense>
                                </div>
                                <Link to={product ? `/product/${product.id}` : '/shop'}>
                                    <Button variant="gold" size="lg" className="gap-2">
                                        {ctaLabel}
                                        {product && <span className="opacity-80">— {formatPrice(product.price)}</span>}
                                        <ArrowRight size={16} />
                                    </Button>
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <SparkleBurst burstKey={activeIndex} />
            </div>
        </section>
    );
}
