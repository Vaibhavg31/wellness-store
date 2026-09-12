import { useEffect, useState } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import DesktopStory from './DesktopStory';
import MobileStory from './MobileStory';

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

export default function DayInHerSparkle({ products = [] }) {
    const { content } = useSiteContent();
    const story = content.dayInHerSparkle;
    const isMobile = useIsMobile();

    if (!story?.stages?.length) return null;

    const product = story.productId ? products.find((p) => p.id === story.productId) ?? null : null;

    return (
        <section aria-labelledby="day-sparkle-title" className="relative bg-charcoal">
            <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
                <p className="type-eyebrow text-gold-light mb-3">{story.eyebrow}</p>
                <h2 id="day-sparkle-title" className="font-serif text-3xl sm:text-4xl text-ivory mb-3">
                    {story.title}
                </h2>
                <p className="text-ivory/60 font-light">{story.description}</p>
            </div>

            {isMobile ? (
                <MobileStory stages={story.stages} product={product} ctaLabel={story.ctaLabel} />
            ) : (
                <DesktopStory stages={story.stages} product={product} ctaLabel={story.ctaLabel} />
            )}
        </section>
    );
}
