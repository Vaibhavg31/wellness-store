import { useEffect, useState } from 'react';
import SectionTitle from '@/components/ui/SectionTitle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import DesktopJourney from './DesktopJourney';
import MobileJourney from './MobileJourney';

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
 * "24 Hours With Your Ritual" — a scroll-driven walk through a day, showing
 * where each kind of product actually earns its place. Pinned + GSAP-scrubbed
 * on desktop (where a pointer-driven, high-precision scroll makes that read
 * as intentional); a plain stacked reveal everywhere else, since pinning on
 * mobile fights the browser's own scroll chrome more than it adds.
 */
export default function WellnessJourney({ products = [] }) {
    const isMobile = useIsMobile();
    const reducedMotion = useReducedMotion();

    return (
        <section aria-label="24 hours with your ritual" className="relative bg-[#0F5132]">
            <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 pb-2 text-center">
                <SectionTitle
                    subtitle="A Day, Mapped"
                    title="24 Hours With Your Ritual"
                    description="Supplements aren't one-size-fits-a-day. Here's where each kind of support actually earns its place."
                    light
                    className="mb-0"
                />
            </div>

            {isMobile || reducedMotion ? (
                <MobileJourney products={products} />
            ) : (
                <DesktopJourney products={products} />
            )}
        </section>
    );
}
