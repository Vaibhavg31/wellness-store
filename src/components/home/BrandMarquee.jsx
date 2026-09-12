import { useSiteContent } from '@/contexts/SiteContentContext';

export default function BrandMarquee() {
    const { content } = useSiteContent();
    const items = content.marquee?.items ?? [];
    const track = [...items, ...items];

    if (!items.length) return null;

    return (
        <section className="relative py-3.5 bg-gradient-to-r from-blush/40 via-ivory to-blush/40 overflow-hidden border-y border-border/40" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#FFF9F5_0%,transparent_12%,transparent_88%,#FFF9F5_100%)] z-10 pointer-events-none" />
            <div className="flex whitespace-nowrap animate-marquee">
                {track.map((item, i) => (
                    <span key={`${item}-${i}`} className="inline-flex items-center gap-6 px-6 type-eyebrow text-wine/70">
                        <svg viewBox="0 0 24 24" fill="#D9B26F" className="w-2.5 h-2.5 flex-shrink-0 opacity-90">
                            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
                        </svg>
                        {item}
                    </span>
                ))}
            </div>
        </section>
    );
}
