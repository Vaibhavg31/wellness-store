import { useSiteContent } from '@/contexts/SiteContentContext';

export default function BrandMarquee() {
    const { content } = useSiteContent();
    const items = content.marquee?.items ?? [];
    const track = [...items, ...items];

    if (!items.length) return null;

    return (
        <section className="relative py-3.5 bg-gradient-to-r from-sage-light/60 via-cream to-sage-light/60 overflow-hidden border-y border-border/40" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#FBF9F4_0%,transparent_12%,transparent_88%,#FBF9F4_100%)] z-10 pointer-events-none" />
            <div className="flex whitespace-nowrap animate-marquee">
                {track.map((item, i) => (
                    <span key={`${item}-${i}`} className="inline-flex items-center gap-6 px-6 type-eyebrow text-forest/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-turmeric/70 flex-shrink-0" />
                        {item}
                    </span>
                ))}
            </div>
        </section>
    );
}
