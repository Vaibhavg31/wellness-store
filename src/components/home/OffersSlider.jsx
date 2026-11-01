import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { useOffers } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1', collection: 'Offer' };
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const headline = (offer) => (offer.kind === 'mix_match'
    ? `Any ${offer.pickCount} for ${formatPrice(offer.price)}`
    : offer.kind === 'bogo' ? 'Buy 1, get 1 free' : offer.title);

/**
 * Every offer that is live right now, as a slider on the homepage, so "Any 3 for ₹1499" and "Buy 1 Get 1 Free" are seen without
 * opening the Offers menu. Comes from Offers in the admin: a new offer page appears here by itself, an ended or switched-off one
 * leaves. Shows nothing when no offer is running.
 */
export default function OffersSlider({ products }) {
    const { offers } = useOffers();
    const track = useRef(null);
    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
    if (offers.length === 0) return null;

    const slide = (direction) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' });
    /** Up to three pack pictures for the card: the offer's own products, or the first products of the shop. */
    const picturesFor = (offer) => {
        const chosen = offer.allProducts || offer.productIds.length === 0 ? products : offer.productIds.map((id) => byId.get(id)).filter(Boolean);
        return chosen.slice(0, 3).map((p) => ({ id: p.id, src: p.images?.[0], title: p.title }));
    };

    return (
        <section aria-labelledby="offers-slider-title" className="section bg-canvas">
            <div className="container-page">
                <div className="mb-6 flex items-end justify-between gap-4 lg:mb-8">
                    <div>
                        <p className="eyebrow">Save more</p>
                        <h2 id="offers-slider-title" className="mt-2 text-h3">Offers running now</h2>
                    </div>
                    <Link to="/offers" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-small font-medium text-primary hover:underline">All offers <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <div className="group/rail relative">
                    <ul ref={track} aria-label="Offers" className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:gap-6 lg:scroll-pl-0 lg:px-0">
                        {offers.map((offer) => {
                            const pictures = picturesFor(offer);
                            return (
                                <li key={offer.id} className={offers.length === 1 ? 'w-full' : 'w-[88%] shrink-0 snap-start sm:w-[62%] lg:w-[calc(50%-0.75rem)]'}>
                                    <Link to={`/offers/${offer.slug}`} className="group relative flex h-full min-h-[13rem] overflow-hidden rounded-2xl bg-primary-deep text-white">
                                        {offer.image && <img src={imageUrl(offer.image, 900)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-40" />}
                                        <div className="relative flex flex-1 flex-col justify-between gap-4 p-5 sm:p-7">
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-caption font-bold uppercase tracking-wide text-primary-deep"><Tag size={13} aria-hidden="true" /> {KIND_LABEL[offer.kind]}</span>
                                                <p className="mt-3 font-display text-h2 leading-tight text-white">{headline(offer)}</p>
                                                {offer.summary && <p className="mt-2 max-w-sm text-small text-white/80">{offer.summary}</p>}
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 text-small font-semibold text-accent">Shop this offer <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                                        </div>
                                        <div className="relative hidden w-[38%] shrink-0 items-center justify-center pr-5 sm:flex" aria-hidden="true">
                                            <div className="flex -space-x-8">
                                                {pictures.map((p, i) => (
                                                    <span key={p.id} className="grid size-24 place-items-center overflow-hidden rounded-full bg-canvas-alt ring-4 ring-primary-deep lg:size-28" style={{ zIndex: 3 - i }}>
                                                        <img src={imageUrl(p.src, 240)} alt="" loading="lazy" className="size-full object-contain mix-blend-multiply" />
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    {offers.length > 2 && (
                        <>
                            <button type="button" onClick={() => slide(-1)} aria-label="Previous offers" className="absolute -left-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md hover:border-primary hover:text-primary lg:grid"><ChevronLeft size={20} /></button>
                            <button type="button" onClick={() => slide(1)} aria-label="Next offers" className="absolute -right-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md hover:border-primary hover:text-primary lg:grid"><ChevronRight size={20} /></button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
