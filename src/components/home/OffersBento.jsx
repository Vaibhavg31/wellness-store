import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useOffers } from '@/hooks/useApi';
import { maxSaving, offerPool } from '@/utils/offerPacks';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1', collection: 'Offer' };

/** The big words of an offer: "Any 3" / "for ₹1,499", "Buy 1" / "Get 1 free", or the title of a plain collection. */
export function offerWords(offer) {
    if (offer.kind === 'mix_match') return { top: `Any ${offer.pickCount}`, bottom: `for ${formatPrice(offer.price)}` };
    if (offer.kind === 'bogo') return { top: 'Buy 1', bottom: 'Get 1 free' };
    return { top: offer.title, bottom: '' };
}

const TONES = {
    plum: { shell: 'bg-primary text-white', label: 'text-peach', body: 'text-white/80', cta: 'bg-accent text-primary-deep', chip: 'bg-accent text-primary-deep', well: 'bg-accent-tint' },
    beige: { shell: 'bg-accent text-primary-deep', label: 'text-accent-ink', body: 'text-primary-deep/80', cta: 'bg-primary text-white', chip: 'bg-primary text-white', well: 'bg-surface' },
    ivory: { shell: 'bg-surface text-ink ring-1 ring-line', label: 'text-accent-ink', body: 'text-muted', cta: 'bg-primary text-white', chip: 'bg-accent text-primary-deep', well: 'bg-accent-tint' },
};

/** The pictures that sit on an offer: up to three different products (the same product twice for Buy 1 Get 1), as light tiles that overlap. */
export function OfferPictures({ offer, products, className, tileClass, well = 'bg-accent-tint' }) {
    const pictures = useMemo(() => {
        const pool = offerPool(offer, products).filter((p) => p.images?.[0]);
        const chosen = offer.kind === 'bogo' ? (pool[0] ? [pool[0], pool[0]] : []) : pool.slice(0, 3);
        return chosen.map((p, i) => ({ key: `${p.id}-${i}`, src: p.images[0] }));
    }, [offer, products]);
    return (
        <div className={cn('pointer-events-none flex items-end', className)} aria-hidden="true">
            {pictures.map((p, i) => (
                <span key={p.key} className={cn('block overflow-hidden rounded-[1.4rem] shadow-lg ring-4 ring-white/10 transition-transform duration-500 group-hover:-translate-y-1', well, tileClass, i === 1 && '-ml-8 -translate-y-6 sm:-ml-12', i === 2 && '-ml-8 translate-y-2 sm:-ml-12', i === 0 && 'translate-y-3 -rotate-3', pictures.length === 2 && i === 1 && 'translate-y-0 rotate-3')}>
                    <img src={imageUrl(p.src, 360)} alt="" width="176" height="176" loading="lazy" className="size-full object-contain mix-blend-multiply" />
                </span>
            ))}
        </div>
    );
}

export function OfferTile({ offer, tone, products, size }) {
    const t = TONES[tone];
    const words = offerWords(offer);
    const saving = maxSaving(offer, products);
    const tileClass = size === 'lg' ? 'size-28 sm:size-44' : 'size-24 sm:size-36';

    return (
        <Link to={`/offers/${offer.slug}`} className={cn('group relative flex h-full min-h-[17rem] flex-col justify-between gap-5 overflow-hidden rounded-[1.75rem] p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8', t.shell, size === 'lg' && 'lg:min-h-[21rem]')}>
            <div className="relative z-10 sm:max-w-[52%]">
                <span className={cn('text-caption font-bold uppercase tracking-[0.16em]', t.label)}>{KIND_LABEL[offer.kind]}</span>
                <p className={cn('mt-3 font-display font-medium leading-[1.02]', size === 'lg' ? 'text-[2.5rem] sm:text-[3.5rem]' : 'text-[2.25rem] sm:text-[2.75rem]')}>
                    {words.top}
                    {words.bottom && <span className="block">{words.bottom}</span>}
                </p>
            </div>

            <OfferPictures offer={offer} products={products} well={t.well} tileClass={tileClass} className="relative z-0 -mr-4 justify-end sm:absolute sm:-right-8 sm:top-1/2 sm:mr-0 sm:-translate-y-[55%]" />

            <div className="relative z-10 flex flex-wrap items-center gap-3">
                <span className={cn('inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-small font-bold transition-transform group-hover:translate-x-0.5', t.cta)}>Shop this offer <ArrowRight size={16} aria-hidden="true" /></span>
                {saving > 0 && <span className={cn('rounded-full px-3 py-1.5 text-caption font-bold', t.chip)}>Save up to {formatPrice(saving)}</span>}
            </div>
        </Link>
    );
}

/**
 * The offers, as bold tiles: the first live offer is large and plum, the second beige, any more sit in a row below. They come from
 * Admin → Offers (any N for one price, Buy 1 Get 1, collections), so a new offer page appears here by itself and an ended one leaves.
 */
export default function OffersBento({ products }) {
    const { offers } = useOffers();
    if (offers.length === 0) return null;
    const [first, second, ...rest] = offers;

    return (
        <section aria-labelledby="offers-title" className="bg-canvas py-12 lg:py-16">
            <div className="container-page">
                <div className="mb-7 flex items-end justify-between gap-4">
                    <div>
                        <p className="eyebrow">Save more</p>
                        <h2 id="offers-title" className="mt-2 text-h3">Offers made for your routine</h2>
                    </div>
                    <Link to="/offers" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-small font-bold text-primary hover:underline">All offers <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
                    <div className={second ? 'lg:col-span-7' : 'lg:col-span-12'}><OfferTile offer={first} tone="plum" products={products} size="lg" /></div>
                    {second && <div className="lg:col-span-5"><OfferTile offer={second} tone="beige" products={products} size="lg" /></div>}
                </div>
                {rest.length > 0 && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-6 lg:grid-cols-3 lg:gap-6">
                        {rest.map((offer) => <OfferTile key={offer.id} offer={offer} tone="ivory" products={products} />)}
                    </div>
                )}
            </div>
        </section>
    );
}
