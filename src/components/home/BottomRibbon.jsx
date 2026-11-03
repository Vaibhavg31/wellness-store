import { Leaf } from 'lucide-react';
import Marquee from '@/components/ui/Marquee';
import { useSiteContent } from '@/contexts/SiteContentContext';

/** The words that run when the shop owner has not written their own: the brand's own promises. */
export const DEFAULT_BOTTOM_WORDS = ['Pure ingredients', 'Ayurvedic formulations', 'Holistic wellness', 'Rooted in Ayurveda', 'Made with care'];

/** The running ribbon at the foot of the home page, echoing the one at the top: the brand's promises in small capitals on plum. */
export default function BottomRibbon() {
    const { content } = useSiteContent();
    const custom = (content.extras?.bottomRibbon?.words ?? []).filter(Boolean);
    const words = custom.length > 0 ? custom : DEFAULT_BOTTOM_WORDS;
    return (
        <section aria-label="Our promise" className="bg-primary text-accent">
            <Marquee secondsPerItem={5}>
                {words.map((word) => (
                    <span key={word} className="inline-flex items-center gap-6 px-6 py-4 text-caption font-bold uppercase tracking-[0.24em] sm:px-8">
                        {word}
                        <Leaf size={14} className="text-peach" aria-hidden="true" />
                    </span>
                ))}
            </Marquee>
        </section>
    );
}
