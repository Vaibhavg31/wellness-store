import { useEffect, useState } from 'react';
import SectionTitle from '@/components/ui/SectionTitle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import DesktopBodyMap from './DesktopBodyMap';
import MobileBodyMap from './MobileBodyMap';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 1024px)');
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    return isMobile;
}

/**
 * "Body Map" — a scroll-driven tour of five zones (heart, gut, joints,
 * muscle, energy), each lighting up on an anatomical figure as its block
 * scrolls into view, paired with the product that actually supports it.
 * Sticky-figure + scrubbed glow on desktop; a plain stacked reveal on
 * mobile and under reduced motion, same trade-off WellnessJourney makes.
 */
export default function BodyMap({ products = [] }) {
    const isMobile = useIsMobile();
    const reducedMotion = useReducedMotion();

    return (
        <section aria-label="Body map" className="relative bg-[#0A3D25]">
            <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 pb-2 text-center">
                <SectionTitle
                    subtitle="Zone By Zone"
                    title="Where It Actually Works In The Body"
                    description="Not every product does the same job. Here's which zone each one is actually built to support."
                    light
                    className="mb-0"
                />
            </div>

            {isMobile || reducedMotion ? (
                <MobileBodyMap products={products} />
            ) : (
                <DesktopBodyMap products={products} />
            )}
        </section>
    );
}
