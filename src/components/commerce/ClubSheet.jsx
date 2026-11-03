import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown } from 'lucide-react';
import Sheet from '@/components/ui/Sheet';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';

const EVENT = 'chikit:club-sheet';

/** Opens the Club sheet from anywhere. `example` is the product the shopper was looking at: { title, price, memberPrice }. */
export function openClubSheet(example) {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: example ?? null }));
}

/**
 * The "join the Club" bottom sheet. Price lines everywhere open it instead of sending the shopper to another page, so the
 * question "how do I get that price?" is answered right where it is asked, in three lines and one button.
 */
export default function ClubSheet() {
    const { content } = useSiteContent();
    const club = content.extras?.club ?? {};
    const [open, setOpen] = useState(false);
    const [example, setExample] = useState(null);

    useEffect(() => {
        const onOpen = (e) => { setExample(e.detail); setOpen(true); };
        window.addEventListener(EVENT, onOpen);
        return () => window.removeEventListener(EVENT, onOpen);
    }, []);

    const percent = Number(club.discountPercent) || 0;
    const saves = example?.memberPrice && example.price > example.memberPrice ? example.price - example.memberPrice : 0;
    const perks = (club.benefits?.length ? club.benefits : ['Member prices on most products', 'Early access to new launches', 'A birthday surprise from Chikit']).slice(0, 4);

    return (
        <Sheet open={open} onClose={() => setOpen(false)} title={club.cardName || 'Chikit Club'}>
            <div className="bg-gradient-to-br from-primary-deep to-primary-night px-6 pb-6 pt-8 text-white">
                <span className="grid size-12 place-items-center rounded-full bg-gold-soft text-gold shadow-md"><Crown size={24} aria-hidden="true" /></span>
                <h2 className="mt-4 text-h3 text-white">{club.cardName || 'Chikit Club'}</h2>
                <p className="mt-1 text-small text-white/80">Free to join. No minimum purchase. {percent > 0 ? `Members pay ${percent}% less on most products.` : 'Members get lower prices on most products.'}</p>
            </div>
            <div className="space-y-5 p-6">
                {example && saves > 0 && (
                    <div className="rounded-2xl bg-accent p-4 text-primary-deep">
                        <p className="text-caption font-bold uppercase tracking-[0.14em] text-accent-ink">On {example.title}</p>
                        <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                            <span className="text-small text-primary-deep/70 line-through">{formatPrice(example.price)}</span>
                            <span className="font-display text-h3 leading-none">{formatPrice(example.memberPrice)}</span>
                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-semibold text-white">Save {formatPrice(saves)}</span>
                        </p>
                    </div>
                )}
                <ul className="space-y-2.5">
                    {perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-3 text-small text-ink">
                            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-tint text-success"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                            {perk}
                        </li>
                    ))}
                </ul>
                <Link to="/club" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-body font-semibold text-white shadow-md transition-colors hover:bg-primary-hover">
                    Join the Club, it is free <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <button type="button" onClick={() => setOpen(false)} className="mx-auto block text-small font-medium text-muted hover:text-ink">Maybe later</button>
            </div>
        </Sheet>
    );
}
