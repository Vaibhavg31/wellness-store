import Logo from '@/components/ui/Logo';
import SectionTitle from '@/components/ui/SectionTitle';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';

export default function AboutPage() {
    const { content } = useSiteContent();
    const about = content.about;
    // An admin can save this field empty (this store's own settings do,
    // right now) — imageUrl('') resolves to '', which renders a real,
    // visibly-broken <img src="">, not just a missing picture. Falls back
    // to the bundled default rather than showing that.
    const storyImageSrc = about.storyImage ? imageUrl(about.storyImage) : DEFAULT_SITE_CONTENT.about.storyImage;

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <Logo size="xl" showHover className="mx-auto mb-8" />
                    <h1 className="font-display text-4xl md:text-5xl font-light text-ink mb-6">
                        {about.heroTitle}
                    </h1>
                    <p className="text-lg text-muted font-light leading-relaxed max-w-2xl mx-auto">
                        {about.heroDescription}
                    </p>
                </div>
            </section>

            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <img
                        src={storyImageSrc}
                        alt={`${content.brandName} craftsmanship`}
                        loading="lazy"
                        className="w-full aspect-[4/5] object-cover rounded-2xl border border-line/30"
                    />
                    <div>
                        <span className="text-xs tracking-[0.3em] uppercase text-accent mb-4 block">
                            {about.storyBadge}
                        </span>
                        <h2 className="font-display text-3xl font-light text-ink mb-6">
                            {about.storyTitle}
                        </h2>
                        {(about.storyParagraphs ?? []).map((para, i) => (
                            <p key={i} className="text-muted font-light leading-relaxed mb-4">
                                {para}
                            </p>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 px-6 lg:px-8 bg-canvas/50">
                <div className="max-w-7xl mx-auto">
                    <SectionTitle subtitle={about.valuesSubtitle} title={about.valuesTitle} />
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="p-8 bg-canvas rounded-2xl border border-line/40">
                            <h3 className="font-display text-2xl text-ink mb-4">{about.missionTitle}</h3>
                            <p className="text-muted font-light leading-relaxed">{about.missionText}</p>
                        </div>
                        <div className="p-8 bg-canvas rounded-2xl border border-line/40">
                            <h3 className="font-display text-2xl text-ink mb-4">{about.visionTitle}</h3>
                            <p className="text-muted font-light leading-relaxed">{about.visionText}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
