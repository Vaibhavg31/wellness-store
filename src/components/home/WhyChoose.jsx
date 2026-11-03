import { Leaf, FlaskConical, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';

const ICONS = [Leaf, FlaskConical, ShieldCheck, HeartHandshake];

/** "Why Chikit": the case for trust, in one calm row of four. Words come from Admin → Content → Why choose us. */
export default function WhyChoose() {
    const { content } = useSiteContent();
    const section = content.whyChoose;
    const benefits = (section.benefits ?? []).slice(0, 4);
    if (benefits.length === 0) return null;

    return (
        <section className="bg-canvas py-14 lg:py-20" aria-labelledby="why-title">
            <div className="container-page">
                <div className="mx-auto mb-10 max-w-2xl text-center">
                    <p className="eyebrow">{section.subtitle}</p>
                    <h2 id="why-title" className="mt-2">{section.title}</h2>
                    <p className="mt-3 text-lead text-muted">{section.description}</p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {benefits.map((b, i) => {
                        const Icon = ICONS[i % ICONS.length];
                        return (
                            <li key={b.title} className="rounded-[1.75rem] bg-accent-tint p-7 ring-1 ring-line">
                                <span className="grid size-14 place-items-center rounded-full bg-primary text-accent shadow-md"><Icon size={24} aria-hidden="true" /></span>
                                <h3 className="mt-5 font-sans text-h4 font-bold">{b.title}</h3>
                                <p className="mt-2 text-small text-muted">{b.description}</p>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
