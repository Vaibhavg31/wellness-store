import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

/**
 * "Our promise": the one place the homepage argues for trust (it used to be four). A deep plum band with a tall arch
 * picture and a numbered list, so it reads as a statement instead of another grid of cards.
 */
export default function WhyChoose() {
    const { content } = useSiteContent();
    const section = content.whyChoose;
    const certified = content.certifiedBanner;
    const benefits = section.benefits ?? [];

    return (
        <section className="section overflow-hidden bg-primary-deep text-white">
            <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
                {certified.image && (
                    <Reveal className="order-2 mx-auto w-full max-w-md lg:order-1 lg:max-w-none">
                        <div className="aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-white/20">
                            <img src={imageUrl(certified.image, 900)} alt="" width="900" height="675" loading="lazy" decoding="async" className="size-full object-cover" />
                        </div>
                    </Reveal>
                )}

                <div className="order-1 lg:order-2">
                    <p className="eyebrow !text-accent">{section.subtitle}</p>
                    <h2 className="mt-3 !text-white">{section.title}</h2>
                    <p className="mt-4 max-w-xl text-lead text-white/80">{section.description}</p>

                    <ol className="mt-8 divide-y divide-white/15 border-y border-white/15">
                        {benefits.map((benefit, i) => (
                            <Reveal as="li" key={benefit.title} delay={i * 60} className="grid grid-cols-[2.75rem_1fr] gap-x-3 py-5 sm:grid-cols-[4rem_14rem_1fr] sm:items-baseline">
                                <span className="font-display text-h4 text-accent" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                                <h3 className="font-sans text-body font-semibold text-white">{benefit.title}</h3>
                                <p className="col-start-2 mt-1 text-small text-white/75 sm:col-start-auto sm:mt-0">{benefit.description}</p>
                            </Reveal>
                        ))}
                    </ol>

                    {certified.ctaLabel && (
                        <Link to={certified.ctaHref || '/about'} className="group mt-8 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-white underline-offset-4 hover:underline">
                            {certified.ctaLabel}
                            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
