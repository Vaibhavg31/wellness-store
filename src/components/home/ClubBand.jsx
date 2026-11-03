import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * The Chikit Club, explained by showing it: a real product with a switch between "without Club" and "with Club", so the saving is
 * seen in rupees in one glance. A member sees the same card already switched on, with their status instead of the join button.
 */
export default function ClubBand({ products }) {
    const { content } = useSiteContent();
    const { isMember } = useCart();
    const club = content.extras?.club;
    const [on, setOn] = useState(true);
    const example = useMemo(() => {
        const withClub = products.filter((p) => p.images?.[0] && Number(p.memberPrice) > 0 && p.memberPrice < p.price);
        return withClub.find((p) => p.isBestSeller) ?? withClub[0] ?? null;
    }, [products]);
    if (!club || club.enabled === false) return null;

    const percent = Number(club.discountPercent) || 0;
    const showing = isMember || on;
    const price = example ? (showing ? example.memberPrice : example.price) : 0;
    const saves = example ? example.price - example.memberPrice : 0;
    const perks = (club.benefits?.length ? club.benefits : ['Member prices on most products', 'Early access to new launches', 'A birthday surprise from Chikit']).slice(0, 4);

    return (
        <section aria-labelledby="club-band-title" className="relative isolate overflow-hidden bg-gradient-to-br from-primary-deep via-primary-deep to-primary-night text-white">
            <div className="pointer-events-none absolute -left-32 top-0 size-[30rem] rounded-full bg-primary/50 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-40 right-0 size-[28rem] rounded-full bg-gold/15 blur-3xl" aria-hidden="true" />
            <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
                <div className="lg:col-span-6">
                    <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 text-caption font-bold uppercase tracking-[0.14em] text-primary-deep"><Crown size={14} aria-hidden="true" /> {club.cardName || 'Chikit Club'} · Free</p>
                    <h2 id="club-band-title" className="mt-5 text-white">Same products. {percent > 0 ? `${percent}% lower` : 'Lower'} prices.</h2>
                    <p className="mt-4 max-w-lg text-lead text-white/75">{club.tagline || 'Join free and pay less on most of the Chikit range, every day. No minimum, no catch.'}</p>
                    <ul className="mt-6 space-y-3">
                        {perks.map((perk) => (
                            <li key={perk} className="flex items-center gap-3 text-body text-white/90">
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold-soft text-primary-deep"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>
                                {perk}
                            </li>
                        ))}
                    </ul>
                    <Link to="/club" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-body font-bold text-primary-deep shadow-md transition-colors hover:bg-accent-hover">
                        {isMember ? 'View my Club card' : 'Join the Club, it is free'} <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                </div>

                {example && (
                    <div className="lg:col-span-6">
                        <div className="mx-auto max-w-md rounded-[1.75rem] bg-surface p-5 text-ink shadow-lg sm:p-6">
                            <div className="flex gap-4">
                                <span className="size-28 shrink-0 overflow-hidden rounded-2xl bg-accent-tint sm:size-32"><img src={imageUrl(example.images[0], 320)} alt="" width="128" height="128" loading="lazy" className="size-full object-contain mix-blend-multiply" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-caption font-bold uppercase tracking-[0.14em] text-accent-ink">Live example</p>
                                    <p className="mt-1 line-clamp-2 text-body font-bold leading-snug">{example.title}</p>
                                    <p className="mt-2 flex items-baseline gap-2">
                                        {showing && <Crown size={16} className="self-center text-gold" aria-hidden="true" />}
                                        <span className={cn('font-display text-h2 leading-none transition-colors', showing ? 'text-primary' : 'text-ink')}>{formatPrice(price)}</span>
                                        {example.originalPrice > price && <span className="text-small text-subtle line-through">{formatPrice(example.originalPrice)}</span>}
                                    </p>
                                    <p className={cn('mt-1.5 text-small font-semibold transition-opacity', showing ? 'text-success opacity-100' : 'opacity-0')}>You save {formatPrice(saves)} more</p>
                                </div>
                            </div>

                            {!isMember && (
                                <div className="mt-5 flex rounded-full bg-canvas-alt p-1" role="group" aria-label="Compare prices">
                                    <button type="button" aria-pressed={!on} onClick={() => setOn(false)} className={cn('min-h-11 flex-1 rounded-full text-small font-bold transition-colors', !on ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>Without Club</button>
                                    <button type="button" aria-pressed={on} onClick={() => setOn(true)} className={cn('flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-small font-bold transition-colors', on ? 'bg-primary text-white shadow-sm' : 'text-muted')}><Crown size={14} aria-hidden="true" /> With Club</button>
                                </div>
                            )}
                            {isMember && <p className="mt-5 flex items-center gap-2 rounded-2xl bg-success-tint px-4 py-3 text-small font-semibold text-success"><Check size={16} aria-hidden="true" /> You are a member: this is the price you pay.</p>}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
