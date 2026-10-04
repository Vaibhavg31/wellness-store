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
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {section.benefits.map((benefit, i) => {
                        const Icon = ICONS[benefit.icon] ?? Sparkles;
                        return (
                            <Reveal as="li" key={benefit.title} delay={(i % 3) * 70} className="rounded-lg border border-line bg-surface p-6 transition-shadow duration-300 hover:shadow-md">
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
