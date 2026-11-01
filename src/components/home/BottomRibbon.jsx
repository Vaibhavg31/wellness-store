import { Leaf } from 'lucide-react';
import Marquee from '@/components/ui/Marquee';
import { useSiteContent } from '@/contexts/SiteContentContext';

/** The words that run when the shop owner has not written their own: the brand's own promises, from the brand book. */
export const DEFAULT_BOTTOM_WORDS = ['Pure ingredients', 'Ayurvedic formulations', 'Holistic wellness', 'Rooted in Ayurveda', 'Made with care'];

/**
 * The running ribbon at the foot of the homepage, mirroring the one at the top of the page: the brand's promises in
 * small capitals on the brand beige, drifting right to left. Words are editable in the admin (Homepage → Bottom ribbon).
 */
export default function BottomRibbon() {
    const { content } = useSiteContent();
    const custom = (content.extras?.bottomRibbon?.words ?? []).filter(Boolean);
    const words = custom.length > 0 ? custom : DEFAULT_BOTTOM_WORDS;
    return (
        <section aria-label="Our promise" className="border-y border-line bg-accent text-primary-deep">
            <Marquee secondsPerItem={5}>
                {words.map((word) => (
                    <span key={word} className="inline-flex items-center gap-6 px-6 py-3.5 text-caption font-semibold uppercase tracking-[0.22em] sm:px-8">
                        {word}
                        <Leaf size={14} className="text-primary/60" aria-hidden="true" />
                    </span>
                ))}
            </Marquee>
        </section>
    );
}
