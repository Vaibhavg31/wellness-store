import { useEffect, useState } from 'react';
import SectionTitle from '@/components/ui/SectionTitle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import DesktopSourceTrail from './DesktopSourceTrail';
import MobileSourceTrail from './MobileSourceTrail';

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
 * "The Source Trail" — replaces a static ingredients grid with a
 * scroll-through sourcing map: a line draws itself across a stylized map of
 * India, pausing on real growing regions for the actual ingredients in the
 * catalog. Same DrawSVG line-draw language as Body Map's glow, so the two
 * scroll-story sections read as one visual system. Sticky map + scrubbed
 * line on desktop; a plain stacked reveal on mobile and under reduced
 * motion.
 */
export default function SourceTrail({ products = [] }) {
    const isMobile = useIsMobile();
    const reducedMotion = useReducedMotion();

    return (
        <section aria-label="Source trail" className="relative bg-[#0A3D25] py-16">
            <div className="relative z-10 max-w-3xl mx-auto px-6 pb-10 text-center">
                <SectionTitle
                    subtitle="Traced, Not Just Claimed"
                    title="The Source Trail"
                    description="Ayurvedic sourcing claims are easy to print and hard to verify. Here's exactly where each ingredient actually comes from."
                    light
                    className="mb-0"
                />
            </div>

            {isMobile || reducedMotion ? (
                <MobileSourceTrail products={products} />
            ) : (
                <DesktopSourceTrail products={products} />
            )}
        </section>
    );
}
