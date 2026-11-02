import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown } from 'lucide-react';
import OfferStage from '@/components/offer/OfferStage';
import { useOffers } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { maxSaving } from '@/utils/offerPacks';
import { formatPrice, cn } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1', collection: 'Offer' };

export const offerHeadline = (offer) => (offer.kind === 'mix_match'
    ? `Any ${offer.pickCount} for ${formatPrice(offer.price)}`
    : offer.kind === 'bogo' ? 'Buy 1, get 1 free' : offer.title);

/** The Club card strip: one line on what membership gives, and the button to join (or to open the card). */
export function ClubStrip({ className }) {
    const { content } = useSiteContent();
    const { user, isAuthenticated } = useCustomerSession();
    const club = content.extras?.club;
    if (!club || club.enabled === false) return null;
    const member = Boolean(isAuthenticated && user?.club?.member);
    const percent = Number(club.discountPercent) || 0;
    return (
        <div className={cn('flex flex-col gap-5 rounded-2xl bg-accent p-6 text-primary-deep shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-8', className)}>
            <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-accent shadow-md"><Crown size={26} aria-hidden="true" /></span>
                <div>
                    <p className="text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">{club.cardName}</p>
                    <p className="mt-1 font-display text-h4 leading-snug sm:text-h3">
                        {member ? 'Your member prices are on, on every product.' : percent > 0 ? `Members pay ${percent}% less on most products.` : 'Members get lower prices on most products.'}
                    </p>
                    {!member && <p className="mt-1 text-small text-primary-deep/80">Free to join. No minimum purchase. Your card is ready in a minute.</p>}
                </div>
            </div>
            <Link to="/club" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-7 text-body font-semibold text-white shadow-md transition-colors hover:bg-primary-hover">
                {member ? 'View my card' : 'Join the Club free'} <ArrowRight size={18} aria-hidden="true" />
            </Link>
        </div>
    );
}

/**
 * Every offer that is live, on one deep-plum stage: pick an offer on the left and its real Chikit packs stand on the right in 3D,
 * with the price on a seal. Offers come from Offers in the admin (a new offer page appears here by itself, an ended or switched-off one
 * leaves), and the Club card sits underneath. Shows nothing when no offer is running.
 */
export default function OffersShowcase({ products, page = false }) {
    const { offers } = useOffers();
    const [activeId, setActiveId] = useState(null);
    useEffect(() => { if (offers.length > 0 && !offers.some((o) => o.id === activeId)) setActiveId(offers[0].id); }, [offers, activeId]);
    const active = offers.find((o) => o.id === activeId) ?? offers[0];
    const savings = useMemo(() => new Map(offers.map((o) => [o.id, maxSaving(o, products)])), [offers, products]);
    if (offers.length === 0 || !active) return null;

    const Heading = page ? 'h1' : 'h2';
    return (
        <section aria-labelledby="offers-title" className="relative isolate overflow-hidden bg-gradient-to-br from-primary-deep via-primary-deep to-primary-night text-white">
            <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-primary/40 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
            <div className="container-page relative py-12 lg:py-16">
                <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
                    <div className="lg:col-span-5">
                        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-peach">Save more, shop smarter</p>
                        <Heading id="offers-title" className="mt-3 text-white">{page ? 'Offers' : 'Offers made for your routine'}</Heading>
                        <p className="mt-3 max-w-md text-body text-white/75">Pick your own box or double up on a favourite. Live offers appear here the moment they start.</p>

                        <ul role="tablist" aria-label="Live offers" className="mt-7 space-y-3">
                            {offers.map((offer) => {
                                const selected = offer.id === active.id;
                                const saving = savings.get(offer.id) ?? 0;
                                return (
                                    <li key={offer.id}>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setActiveId(offer.id)}
                                            onMouseEnter={() => setActiveId(offer.id)}
                                            className={cn('group w-full rounded-2xl border p-4 text-left transition-colors duration-200 sm:p-5', selected ? 'border-accent bg-white/10' : 'border-white/15 hover:border-white/40 hover:bg-white/5')}
                                        >
                                            <span className="flex items-center justify-between gap-3">
                                                <span className="text-caption font-semibold uppercase tracking-[0.14em] text-peach">{KIND_LABEL[offer.kind]}</span>
                                                {saving > 0 && <span className="rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-primary-deep">Save up to {formatPrice(saving)}</span>}
                                            </span>
                                            <span className="mt-1.5 block font-display text-h3 leading-tight text-white">{offerHeadline(offer)}</span>
                                            {offer.summary && <span className={cn('mt-1 block text-small text-white/70', !selected && 'max-sm:hidden')}>{offer.summary}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        <Link to={`/offers/${active.slug}`} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-7 text-body font-semibold text-primary-deep shadow-md transition-colors hover:bg-accent-hover">
                            Shop this offer <ArrowRight size={18} aria-hidden="true" />
                        </Link>
                    </div>

                    <OfferStage offer={active} products={products} className="h-[21rem] sm:h-[27rem] lg:col-span-7 lg:h-[33rem]" />
                </div>

                <ClubStrip className="mt-10 lg:mt-14" />
            </div>
        </section>
    );
}
