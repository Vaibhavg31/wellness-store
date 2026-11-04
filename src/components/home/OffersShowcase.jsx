import { Link } from 'react-router-dom';
import { ArrowRight, Crown } from 'lucide-react';
import { OfferPictures } from '@/components/home/OffersBento';
import { useOffers } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { formatPrice, cn } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1', collection: 'Offer' };

export const offerHeadline = (offer) => (offer.kind === 'mix_match'
    ? `Any ${offer.pickCount} for ${formatPrice(offer.price)}`
    : offer.kind === 'bogo' ? 'Buy 1, get 1 free' : offer.title);

/** The Chikit Club strip: one line on what membership gives, and the button to join (or to open the card). */
export function ClubStrip({ className }) {
    const { content } = useSiteContent();
    const { user, isAuthenticated } = useCustomerSession();
    const club = content.extras?.club;
    if (!club || club.enabled === false) return null;
    const member = Boolean(isAuthenticated && user?.club?.member);
    return (
        <div className={cn('flex flex-col gap-5 rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-line sm:flex-row sm:items-center sm:justify-between sm:p-7', className)}>
            <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-primary-deep"><Crown size={22} aria-hidden="true" /></span>
                <div>
                    <p className="text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">{club.cardName}</p>
                    <p className="mt-1 font-display text-h4 leading-snug">
                        {member ? 'Your Chikit Club member prices are on, on every product.' : 'Chikit Club members get lower prices on most products.'}
                    </p>
                    {!member && <p className="mt-1 text-small text-muted">Free to join. No minimum purchase. Your card is ready in a minute.</p>}
                </div>
            </div>
            <Link to="/club" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-7 text-small font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover">
                {member ? 'View my card' : 'Become a Chikit Club member'} <ArrowRight size={18} aria-hidden="true" />
            </Link>
        </div>
    );
}

/**
 * The Offers page: every live offer as a card that opens that offer's own page (one tap goes straight there; nothing to select first).
 * Offers come from Offers in the admin (a new offer appears here by itself, an ended or switched-off one leaves), and the Chikit Club
 * strip sits underneath. Shows nothing when no offer is running.
 */
export default function OffersShowcase({ products }) {
    const { offers } = useOffers();
    if (offers.length === 0) return null;

    return (
        <section aria-labelledby="offers-title" className="bg-gradient-to-b from-canvas-alt to-canvas">
            <div className="container-page pb-10 pt-8 lg:pb-16 lg:pt-14">
                <div className="max-w-2xl">
                    <p className="mb-4 inline-flex items-center rounded-full bg-accent px-3 py-1 text-caption font-semibold uppercase tracking-[0.14em] text-primary-deep">Save more, shop smarter</p>
                    <h1 id="offers-title">Offers</h1>
                    <p className="mt-3 text-body text-muted sm:text-lead">Pick your own box or double up on a favourite. Live offers appear here the moment they start.</p>
                </div>

                <ul aria-label="Live offers" className="mt-8 grid gap-4 md:grid-cols-2 lg:gap-6">
                    {offers.map((offer) => (
                        <li key={offer.id}>
                            <Link
                                to={`/offers/${offer.slug}`}
                                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <span className="flex h-44 items-center justify-center overflow-hidden bg-accent-tint px-4 sm:h-52">
                                    <OfferPictures offer={offer} products={products} eager well="bg-surface" tileClass="size-24 sm:size-32" className="scale-95 sm:scale-100" />
                                </span>
                                <span className="flex flex-1 flex-col p-5 sm:p-6">
                                    <span className="text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">{KIND_LABEL[offer.kind]}</span>
                                    <span className="mt-1.5 block font-display text-h3 leading-tight text-ink">{offerHeadline(offer)}</span>
                                    {offer.summary && <span className="mt-1.5 block text-small text-muted">{offer.summary}</span>}
                                    <span className="mt-5 inline-flex items-center gap-2 pt-1 text-small font-semibold text-primary">
                                        Shop this offer <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <ClubStrip className="mt-8 lg:mt-12" />
            </div>
        </section>
    );
}
