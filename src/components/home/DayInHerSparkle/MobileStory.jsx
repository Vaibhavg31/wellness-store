import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/utils/formatPrice';
import SparkleBurst from './SparkleBurst';

/**
 * Mobile replaces the pinned/scrubbed desktop timeline with a native
 * horizontal swipe carousel — no scroll-jacking, no GSAP pin, no 3D drag.
 * Each panel autoplays its text/sparkle entrance the moment it's mostly
 * in view (IntersectionObserver), matching "autoplay-on-view" instead of
 * a continuous scroll-driven crossfade.
 */
export default function MobileStory({ stages, product, ctaLabel }) {
    const trackRef = useRef(null);
    const panelRefs = useRef([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const lastIndex = stages.length - 1;

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                        const index = panelRefs.current.indexOf(entry.target);
                        if (index !== -1) setActiveIndex(index);
                    }
                });
            },
            { threshold: [0.6], root: trackRef.current }
        );

        panelRefs.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [stages.length]);

    return (
        <div
            ref={trackRef}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar"
        >
            {stages.map((stage, i) => (
                <div
                    key={stage.id}
                    ref={(el) => { panelRefs.current[i] = el; }}
                    className="relative shrink-0 w-full snap-center h-[85vh] min-h-[520px]"
                >
                    <img
                        src={stage.image}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        loading={i === 0 ? 'eager' : 'lazy'}
                        draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-charcoal/35" />

                    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {stages.map((s, dotI) => (
                            <span
                                key={s.id}
                                className={`h-1 rounded-full transition-all duration-500 ${
                                    dotI === activeIndex ? 'w-6 bg-gold' : 'w-3 bg-ivory/35'
                                }`}
                            />
                        ))}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-6 pb-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={activeIndex === i ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 8 }}
                            transition={{ duration: 0.5 }}
                        >
                            <p className="type-eyebrow text-gold-light mb-2">{stage.timeLabel}</p>
                            <h3 className="font-serif text-2xl text-ivory leading-tight mb-1">{stage.copy}</h3>
                        </motion.div>

                        {i === lastIndex && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={activeIndex === lastIndex ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                                transition={{ duration: 0.5, delay: 0.15 }}
                                className="mt-5"
                            >
                                <Link to={product ? `/product/${product.id}` : '/shop'}>
                                    <Button variant="gold" size="md" className="gap-2">
                                        {ctaLabel}
                                        {product && <span className="opacity-80">— {formatPrice(product.price)}</span>}
                                        <ArrowRight size={14} />
                                    </Button>
                                </Link>
                            </motion.div>
                        )}
                    </div>

                    {activeIndex === i && <SparkleBurst burstKey={i} />}
                </div>
            ))}
        </div>
    );
}
