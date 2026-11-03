import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Crown, FlaskConical, Star, Truck } from 'lucide-react';
import { useOffers, useReviews } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

/** Three products for the collage: bestsellers first, then newest, only those with a picture. */
function collage(products) {
    const ranked = products
        .filter((p) => p.images?.[0])
        .sort((a, b) => (Number(b.isBestSeller) - Number(a.isBestSeller)) || (Number(b.isNew) - Number(a.isNew)));
    return ranked.slice(0, 3);
}

function CollageCard({ product, className }) {
    return (
        <Link to={`/product/${product.id}`} className={cn('group absolute w-[40%] rounded-[1.5rem] bg-surface p-2 shadow-lg ring-1 ring-primary/5 transition-transform duration-500 hover:z-30 hover:scale-[1.03]', className)}>
            <span className="block aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-accent-tint">
                <img src={imageUrl(product.images[0], 420)} alt="" width="420" height="525" decoding="async" className="size-full object-contain mix-blend-multiply" />
            </span>
            <span className="block truncate px-1.5 pb-1 pt-2 text-caption font-bold text-ink sm:text-small">{product.title}</span>
            <span className="block px-1.5 pb-1 text-caption font-semibold text-primary">{formatPrice(product.price)}</span>
        </Link>
    );
}

/**
 * The first screen: a promise, two clear ways in (shop, or the Pick & Mix offer) and the real packs standing on a beige arch. The
 * message is brand-controlled; the collage, the offer price and the rating all come from the live shop.
 */
export default function Hero({ products }) {
    const { content } = useSiteContent();
    const { offers } = useOffers();
    const { reviews } = useReviews();
    const picks = useMemo(() => collage(products), [products]);
    const mix = offers.find((o) => o.kind === 'mix_match');
    const average = reviews.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;
    const club = picks.find((p) => Number(p.memberPrice) > 0 && p.memberPrice < p.price);
    const threshold = content.delivery?.freeThreshold;

    return (
        <section className="relative overflow-hidden bg-canvas">
            <div className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-accent/60 blur-2xl" aria-hidden="true" />
            <div className="container-page relative grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-6 lg:py-20">
                <div className="lg:col-span-6 lg:pr-6">
                    <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-caption font-bold uppercase tracking-[0.14em] text-primary-deep"><BadgeCheck size={14} aria-hidden="true" /> Ayurveda · Lab tested · Clean label</p>
                    <h1 className="mt-5 text-balance">Ayurveda, made <em className="font-medium italic text-primary">simple</em> for everyday health.</h1>
                    <p className="mt-5 max-w-lg text-lead text-muted">Honest ingredients, tested in a lab and made with care. Find what you need by health goal, and pay less when you join the Club.</p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>a]:justify-center">
                        <Link to="/shop" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-body font-bold text-white shadow-md transition-colors hover:bg-primary-hover">Shop all products <ArrowRight size={18} aria-hidden="true" /></Link>
                        {mix ? (
                            <Link to={`/offers/${mix.slug}`} className="inline-flex min-h-13 items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-body font-bold text-primary-deep transition-colors hover:bg-accent-hover">Any {mix.pickCount} for {formatPrice(mix.price)}</Link>
                        ) : (
                            <Link to="/club" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-body font-bold text-primary-deep hover:bg-accent-hover"><Crown size={18} aria-hidden="true" /> Join the Club</Link>
                        )}
                    </div>
                    <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-small text-muted">
                        {average > 0 && <li className="flex items-center gap-1.5"><Star size={16} strokeWidth={0} className="fill-star" aria-hidden="true" /><strong className="text-ink">{average.toFixed(1)}</strong> from {reviews.length} reviews</li>}
                        <li className="flex items-center gap-1.5"><FlaskConical size={16} className="text-primary" aria-hidden="true" /> Lab tested</li>
                        {threshold > 0 && <li className="flex items-center gap-1.5"><Truck size={16} className="text-primary" aria-hidden="true" /> Free delivery over {formatPrice(threshold)}</li>}
                    </ul>
                </div>

                <div className="relative mx-auto aspect-[1/1.05] w-full max-w-[34rem] lg:col-span-6 lg:max-w-none">
                    <div className="absolute inset-x-[10%] bottom-0 top-[6%] rounded-t-[999px] rounded-b-[2rem] bg-accent" aria-hidden="true" />
                    <div className="absolute right-[6%] top-[14%] size-20 rounded-full bg-primary/90" aria-hidden="true" />
                    {picks[1] && <CollageCard product={picks[1]} className="left-[0%] top-[36%] z-10 -rotate-[5deg]" />}
                    {picks[2] && <CollageCard product={picks[2]} className="right-[0%] top-[40%] z-10 rotate-[5deg]" />}
                    {picks[0] && <CollageCard product={picks[0]} className="left-1/2 top-[6%] z-20 w-[46%] -translate-x-1/2" />}
                    {club && (
                        <Link to="/club" className="absolute bottom-[2%] left-[8%] z-30 flex items-center gap-2.5 rounded-2xl bg-primary-deep px-4 py-3 text-white shadow-lg transition-transform hover:-translate-y-0.5">
                            <span className="grid size-9 place-items-center rounded-full bg-gold-soft text-gold"><Crown size={17} aria-hidden="true" /></span>
                            <span className="text-caption leading-tight"><span className="block font-bold">{formatPrice(club.memberPrice)} with Club</span><span className="block text-white/70">Free to join</span></span>
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
