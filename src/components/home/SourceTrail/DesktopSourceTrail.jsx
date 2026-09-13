import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { imageUrl } from '@/services/api';
import { useLenisScroll } from '@/components/home/DayInHerSparkle/useLenisScroll';
import { REGIONS, productsForIngredient } from './sourceRegions';
import IndiaMap from './IndiaMap';

gsap.registerPlugin(ScrollTrigger);

/**
 * Desktop Source Trail — the map sits sticky in the left column for the
 * whole section; one ScrollTrigger spanning the full stop list drives the
 * DrawSVG line continuously (so it tracks scroll smoothly rather than
 * jumping stop to stop), while each stop card gets its own scrubbed
 * trigger for its own fade/slide-in, same pattern as Body Map.
 */
export default function DesktopSourceTrail({ products }) {
    const listRef = useRef(null);
    const mapRef = useRef(null);
    const cardRefs = useRef([]);

    useLenisScroll(true);

    useEffect(() => {
        const list = listRef.current;
        if (!list) return undefined;

        const lineTrigger = ScrollTrigger.create({
            trigger: list,
            start: 'top 70%',
            end: 'bottom 40%',
            scrub: 0.5,
            onUpdate: (self) => mapRef.current?.setProgress(self.progress),
        });

        const cardTriggers = REGIONS.map((_, i) => {
            const card = cardRefs.current[i];
            if (!card) return null;
            gsap.set(card, { opacity: 0, x: 32 });
            return ScrollTrigger.create({
                trigger: card,
                start: 'top 78%',
                end: 'top 40%',
                scrub: 0.4,
                onUpdate: (self) => gsap.set(card, { opacity: self.progress, x: 32 * (1 - self.progress) }),
            });
        }).filter(Boolean);

        const settleId = requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            lineTrigger.kill();
            cardTriggers.forEach((t) => t.kill());
            cancelAnimationFrame(settleId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-16">
            <div className="hidden lg:block relative">
                <div className="sticky top-24 h-[calc(100vh-6rem)] flex items-center justify-center">
                    <div className="w-full max-w-sm aspect-[10/12]">
                        <IndiaMap ref={mapRef} />
                    </div>
                </div>
            </div>

            <div ref={listRef} className="flex flex-col">
                {REGIONS.map((stop, i) => {
                    const matches = productsForIngredient(products, stop.keyword);
                    const shopHref = `/shop?search=${encodeURIComponent(stop.keyword)}`;
                    return (
                        <div key={stop.id} className="min-h-[70vh] flex items-center py-10">
                            <div ref={(el) => { cardRefs.current[i] = el; }} className="w-full max-w-md">
                                <div className="flex items-center gap-2 mb-3">
                                    <MapPin size={14} className="text-gold-light" />
                                    <p className="type-eyebrow text-gold-light">{stop.region}</p>
                                </div>
                                <h3 className="font-serif text-2xl sm:text-3xl text-ivory leading-tight mb-3">{stop.ingredient}</h3>
                                <p className="text-ivory/65 font-light leading-relaxed mb-5">{stop.note}</p>

                                {matches[0] && (
                                    <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm p-3 mb-4">
                                        <img
                                            src={imageUrl(matches[0].images?.[0])}
                                            alt=""
                                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-xs text-ivory/50">Sourced for</span>
                                            <span className="block text-sm text-ivory font-medium truncate">{matches[0].title}</span>
                                        </span>
                                    </div>
                                )}

                                <Link
                                    to={shopHref}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-light hover:text-gold transition-colors"
                                >
                                    Shop products with this ingredient
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
