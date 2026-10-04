import { Leaf } from 'lucide-react';

const INGREDIENTS = ['Ashwagandha', 'Turmeric', 'Tulsi', 'Amla', 'Triphala', 'Brahmi', 'Neem', 'Giloy', 'Shatavari', 'Moringa'];

/** Slow, endless ribbon of Ayurvedic ingredients. Pure CSS (transform only); pauses on hover and for reduced motion. */
export default function IngredientMarquee() {
    const row = (hidden) => (
        <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
            {INGREDIENTS.map((name) => (
                <li key={name} className="flex items-center gap-10 font-display text-h3 text-primary-deep">
                    {name}
                    <Leaf size={18} className="text-accent" aria-hidden="true" />
                </li>
            ))}
        </ul>
    );

    return (
        <section aria-label="Rooted in classical Ayurvedic ingredients" className="group overflow-hidden border-y border-line bg-primary-tint py-5">
            <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
                {row(false)}
                {row(true)}
            </div>
        </section>
    );
}
