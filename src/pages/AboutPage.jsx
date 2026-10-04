import Logo from '@/components/ui/Logo';
import Seo from '@/components/seo/Seo';
import SectionHeader from '@/components/ui/SectionHeader';
import Reveal from '@/components/ui/Reveal';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';

export default function AboutPage() {
    const { content } = useSiteContent();
    const about = content.about;
    // An admin can save the story image empty; fall back to the bundled default rather than a broken <img>.
    const storyImage = about.storyImage ? imageUrl(about.storyImage) : DEFAULT_SITE_CONTENT.about.storyImage;

    return (
        <>
            <Seo title="Our Story" description={about.heroDescription} path="/about" image={storyImage} />
            <section className="bg-canvas-alt">
                <div className="container-page py-14 text-center sm:py-20">
                    <Logo size="xl" className="mx-auto mb-8" />
                    <h1>{about.heroTitle}</h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lead text-muted">{about.heroDescription}</p>
                </div>
            </section>

            <section className="section">
                <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <img src={storyImage} alt={`${content.brandName} story`} width="640" height="800" loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-xl object-cover" />
                    <Reveal>
                        <p className="eyebrow mb-3">{about.storyBadge}</p>
                        <h2 className="mb-6">{about.storyTitle}</h2>
                        <div className="space-y-4 text-lead text-muted">
                            {(about.storyParagraphs ?? []).map((para) => <p key={para}>{para}</p>)}
                        </div>
                    </Reveal>
                </div>
            </section>

            <section className="section bg-canvas-alt">
                <div className="container-page">
                    <SectionHeader eyebrow={about.valuesSubtitle} title={about.valuesTitle} />
                    <div className="grid gap-6 md:grid-cols-2">
                        {[
                            { title: about.missionTitle, text: about.missionText },
                            { title: about.visionTitle, text: about.visionText },
                        ].map((item, i) => (
                            <Reveal key={item.title} delay={i * 80} className="rounded-xl border border-line bg-surface p-8">
                                <h3 className="mb-3">{item.title}</h3>
                                <p className="text-muted">{item.text}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
