import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { bestMatchForGoal } from '../wellnessRituals';
import { ZONES } from './bodyMapZones';
import BodyFigure from './BodyFigure';
import ZoneProductCard from './ZoneProductCard';

gsap.registerPlugin(ScrollTrigger);

/**
 * Desktop Body Map — the figure sits `position: sticky` in the right column
 * for the whole section (no pin needed: sticky alone keeps it in view while
 * the left column's blocks scroll past). Each block gets its own scrubbed
 * ScrollTrigger that:
 *   1. brings its own zone's glow in (0 -> 1, scrubbed so it tracks the
 *      scroll position rather than snapping),
 *   2. fades the *previous* zone down to a 15% ember rather than off, and
 *   3. slides/fades its product card in from the side, synced to the same
 *      progress.
 * All of it runs through direct gsap.set calls via BodyFigure's imperative
 * handle, never React state, so scrubbing never forces a re-render.
 */
export default function DesktopBodyMap({ products }) {
    const sectionRef = useRef(null);
    const figureRef = useRef(null);
    const blockRefs = useRef([]);
    const cardRefs = useRef([]);

    useLenisScroll(true);

    useEffect(() => {
        const triggers = ZONES.map((zone, i) => {
            const block = blockRefs.current[i];
            const card = cardRefs.current[i];
            const prevZone = ZONES[i - 1]?.glowZone;
            if (!block) return null;

            if (card) gsap.set(card, { opacity: 0, x: 32 });

            return ScrollTrigger.create({
                trigger: block,
                start: 'top 75%',
                end: 'top 25%',
                scrub: 0.4,
                onUpdate: (self) => {
                    const p = self.progress;
                    figureRef.current?.setZone(zone.glowZone, p);
                    if (prevZone) figureRef.current?.setZone(prevZone, Math.max(0.15, 1 - p));
                    if (card) gsap.set(card, { opacity: p, x: 32 * (1 - p) });
                },
            });
        }).filter(Boolean);

        const settleId = requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            triggers.forEach((t) => t.kill());
            cancelAnimationFrame(settleId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section ref={sectionRef} className="relative bg-[#431A43]">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="flex flex-col">
                    {ZONES.map((zone, i) => {
                        const Icon = zone.icon;
                        const product = bestMatchForGoal(products, zone.goalId);
                        return (
                            <div
                                key={zone.id}
                                ref={(el) => { blockRefs.current[i] = el; }}
                                className="min-h-[85vh] flex flex-col justify-center py-12"
                            >
                                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/15 mb-5">
                                    <Icon size={20} className="text-turmeric-light" />
                                </span>
                                <p className="type-eyebrow text-turmeric-light mb-2">Zone {i + 1} of {ZONES.length}</p>
                                <h3 className="font-display text-3xl sm:text-4xl text-cream leading-tight mb-4">{zone.title}</h3>
                                <p className="text-cream/65 font-light leading-relaxed mb-6 max-w-md">{zone.copy}</p>
                                <div ref={(el) => { cardRefs.current[i] = el; }} className="max-w-md">
                                    <ZoneProductCard product={product} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="hidden lg:block relative">
                    <div className="sticky top-24 h-[calc(100vh-6rem)] flex items-center justify-center">
                        <BodyFigure ref={figureRef} />
                    </div>
                </div>
            </div>
        </section>
    );
}
