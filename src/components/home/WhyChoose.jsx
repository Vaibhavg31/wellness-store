import { BadgeCheck, Droplets, FlaskConical, Heart, Shield, Sparkles, Sun, Truck } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Reveal from '@/components/ui/Reveal';
import { useSiteContent } from '@/contexts/SiteContentContext';

const ICONS = { shield: Shield, droplets: Droplets, heart: Heart, badge: BadgeCheck, sparkles: Sparkles, sun: Sun, flask: FlaskConical, truck: Truck };

export default function WhyChoose() {
    const { content } = useSiteContent();
    const section = content.whyChoose;

    return (
        <section className="section bg-canvas">
            <div className="container-page">
                <SectionHeader eyebrow={section.subtitle} title={section.title} description={section.description} />
                <ul className="flex flex-wrap justify-center gap-5">
                    {section.benefits.map((benefit, i) => {
                        const Icon = ICONS[benefit.icon] ?? Sparkles;
                        return (
                            <Reveal as="li" key={benefit.title} delay={(i % 3) * 70} className={`w-full rounded-lg border border-line bg-surface p-6 transition-shadow duration-300 hover:shadow-md sm:w-[calc(50%-0.625rem)] ${section.benefits.length === 4 ? 'lg:w-[calc(25%-0.9375rem)]' : 'lg:w-[calc(33.333%-0.84rem)]'}`}>
                                <span className="mb-4 grid size-12 place-items-center rounded-full bg-primary-tint text-primary"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>
                                <h3 className="font-sans text-h4 font-semibold">{benefit.title}</h3>
                                <p className="mt-2 text-small text-muted">{benefit.description}</p>
                            </Reveal>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
