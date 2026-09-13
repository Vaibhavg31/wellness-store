import Logo from '@/components/ui/Logo';
import SectionTitle from '@/components/ui/SectionTitle';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

export default function AboutPage() {
    const { content } = useSiteContent();
    const about = content.about;

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <Logo size="xl" showHover className="mx-auto mb-8" />
                    <h1 className="font-display text-4xl md:text-5xl font-light text-ink mb-6">
                        {about.heroTitle}
                    </h1>
                    <p className="text-lg text-slate font-light leading-relaxed max-w-2xl mx-auto">
                        {about.heroDescription}
                    </p>
                </div>
            </section>

            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <img
                        src={imageUrl(about.storyImage)}
                        alt={`${content.brandName} craftsmanship`}
                        loading="lazy"
                        className="w-full aspect-[4/5] object-cover rounded-2xl border border-border/30"
                    />
                    <div>
                        <span className="text-xs tracking-[0.3em] uppercase text-turmeric mb-4 block">
                            {about.storyBadge}
                        </span>
                        <h2 className="font-display text-3xl font-light text-ink mb-6">
                            {about.storyTitle}
                        </h2>
                        {(about.storyParagraphs ?? []).map((para, i) => (
                            <p key={i} className="text-slate font-light leading-relaxed mb-4">
                                {para}
                            </p>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 px-6 lg:px-8 bg-cream/50">
                <div className="max-w-7xl mx-auto">
                    <SectionTitle subtitle={about.valuesSubtitle} title={about.valuesTitle} />
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="p-8 bg-cream rounded-2xl border border-border/40">
                            <h3 className="font-display text-2xl text-ink mb-4">{about.missionTitle}</h3>
                            <p className="text-slate font-light leading-relaxed">{about.missionText}</p>
                        </div>
                        <div className="p-8 bg-cream rounded-2xl border border-border/40">
                            <h3 className="font-display text-2xl text-ink mb-4">{about.visionTitle}</h3>
                            <p className="text-slate font-light leading-relaxed">{about.visionText}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
