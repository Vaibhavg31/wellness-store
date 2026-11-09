import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BadgePercent, Gift, Package, ShoppingBag, ShoppingCart } from 'lucide-react';
import Seo, { SITE_URL } from '@/components/seo/Seo';
import Button from '@/components/ui/Button';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ProductCard from '@/components/product/ProductCard';
import { QuantityStepper } from '@/components/product/AddToBag';
import MixBox from '@/components/offer/MixBox';
import { OfferPictures } from '@/components/home/OffersBento';
import OffersShowcase, { ClubStrip } from '@/components/home/OffersShowcase';
import { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { useOffers, useProducts } from '@/hooks/useApi';
import { MAX_PER_ITEM, useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { breadcrumbJsonLd } from '@/utils/seoSchema';
import { formatPrice, tidyRupees } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1 Free', collection: 'Offer' };

const STEPS = [
    { icon: Package, title: 'Choose your products', text: 'Open an offer and pick the products you like. Each offer says exactly what it covers.' },
    { icon: ShoppingCart, title: 'Add it to your bag', text: 'A box goes into the bag as one set. For Buy 1 Get 1, the free one is added with your product.' },
    { icon: BadgePercent, title: 'Pay the offer price', text: 'The price is worked out for you. Coupons work on regular-priced products only, not on offers, and one coupon applies per order.' },
];

/** /offers: every live offer as a card that opens it, how offers work, and the Chikit Club strip. */
export function OffersHubPage() {
    const { offers, loading } = useOffers();
    const { products } = useProducts();
    return (
        <>
            <Seo title="Offers" description="Pick & Mix boxes, Buy 1 Get 1 Free and more offers on Chikit Ayurvedic wellness." path="/offers" />
            {offers.length > 0 || loading ? <OffersShowcase products={products} /> : (
                <section className="bg-gradient-to-b from-canvas-alt to-canvas py-16 text-center">
                    <div className="container-page">
                        <h1>Offers</h1>
                        {!loading && <p className="mx-auto mt-3 max-w-md text-muted">No offers are running right now. Check back soon, or join the Chikit Club for member prices.</p>}
                    </div>
                </section>
            )}
            <section className="border-t border-line bg-canvas py-12 lg:py-16" aria-labelledby="how-offers-work">
                <div className="container-page">
                    <h2 id="how-offers-work" className="text-h3">How our offers work</h2>
                    <ol className="mt-8 grid gap-6 md:grid-cols-3">
                        {STEPS.map(({ icon: Icon, title, text }, i) => (
                            <li key={title} className="rounded-2xl bg-canvas-alt p-6 ring-1 ring-line">
                                <span className="flex items-center gap-3">
                                    <span className="grid size-11 place-items-center rounded-full bg-accent text-primary-deep"><Icon size={20} aria-hidden="true" /></span>
                                    <span className="text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">Step {i + 1}</span>
                                </span>
                                <h3 className="mt-4 font-sans text-h4">{title}</h3>
                                <p className="mt-2 text-small text-muted">{text}</p>
                            </li>
                        ))}
                    </ol>
                    {!loading && offers.length === 0 && <ClubStrip className="mt-10" />}
                </div>
            </section>
        </>
    );
}

/**
 * The Buy 1 Get 1 product tile. One tap on "Add to bag" puts the product in the bag with its free second one; the bag shows it as
 * "Buy 1 + 1 FREE" and the shopper pays for one. (Under the hood the pair is two units, each priced at half.)
 */
function BogoTile({ offer, product }) {
    const { addBogoPair, items, updateQuantity } = useCart();
    const { showToast } = useToast();
    const soldOut = typeof product.stock === 'number' && product.stock < 2;
    const line = items.find((i) => i.product.offerId === offer.id && i.product.id === product.id);
    const sets = (line?.quantity ?? 0) / 2;
    const maxSets = Math.floor(Math.min(typeof product.stock === 'number' ? product.stock : 99, MAX_PER_ITEM * 2) / 2);
    const add = () => {
        if (!addBogoPair(offer, product)) showToast(`You can order up to ${maxSets} of these`, 'error');
    };
    const change = (next) => updateQuantity(product.id, next * 2, { variantId: line?.product.variantId, offerId: offer.id });
    return (
        <div className="flex h-full flex-col gap-3">
            <div className="relative">
                <ProductCard product={product} action={false} />
                <span className="pointer-events-none absolute left-2.5 top-11 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent shadow-sm">Buy 1 Get 1 FREE</span>
            </div>
            <p className="text-center text-small font-medium text-success">{soldOut ? 'Sold out' : 'Add one, get the second free'}</p>
            {sets > 0 ? (
                <div className="mt-auto">
                    <QuantityStepper qty={sets} max={maxSets} onChange={change} title={product.title} />
                    <p className="mt-1.5 text-center text-caption font-semibold text-success">Buy {sets} + {sets} FREE in your bag</p>
                </div>
            ) : (
                <button type="button" disabled={soldOut} onClick={add} className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary text-small font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-transparent disabled:text-subtle disabled:hover:bg-transparent"><ShoppingBag size={16} aria-hidden="true" /> Add to bag</button>
            )}
        </div>
    );
}

/** /offers/:slug: the offer's own page, built by its kind. */
export function OfferPage() {
    const { slug = '' } = useParams();
    const { offers, loading: offersLoading } = useOffers();
    const { products, loading: productsLoading } = useProducts();
    const offer = offers.find((o) => o.slug === slug);

    const eligible = useMemo(() => {
        if (!offer) return [];
        if (offer.allProducts) return products;
        const order = new Map(offer.productIds.map((id, i) => [id, i]));
        return products.filter((p) => order.has(p.id)).sort((a, b) => order.get(a.id) - order.get(b.id));
    }, [offer, products]);


    if (!offersLoading && !offer) {
        return (
            <div className="container-page py-24 text-center">
                <Gift size={40} className="mx-auto text-primary" aria-hidden="true" />
                <h1 className="mt-4">This offer has ended</h1>
                <p className="mt-2 text-muted">See what else is on right now.</p>
                <Button to="/offers" className="mt-6">View all offers</Button>
            </div>
        );
    }

    const loading = offersLoading || productsLoading;
    return (
        <>
            {offer && (
                <Seo
                    title={tidyRupees(offer.title)}
                    description={tidyRupees(offer.summary) || `Chikit offer: ${tidyRupees(offer.title)}`}
                    path={`/offers/${offer.slug}`}
                    image={offer.image}
                    jsonLd={breadcrumbJsonLd(SITE_URL, [{ name: 'Home', path: '/' }, { name: 'Offers', path: '/offers' }, { name: tidyRupees(offer.title), path: `/offers/${offer.slug}` }])}
                />
            )}
            <section className="relative isolate overflow-hidden bg-gradient-to-b from-canvas-alt to-canvas">
                <div className="container-page relative pb-8 pt-4 sm:pb-10 sm:pt-6 lg:pb-14">
                    {offer && <OfferPictures offer={offer} products={products} well="bg-surface" tileClass="size-40 xl:size-48" className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:flex xl:right-10" />}
                    <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Offers', href: '/offers' }, { label: tidyRupees(offer?.title) || '…' }]} />
                    <p className="mt-4 inline-flex items-center rounded-full bg-accent px-3 py-1 text-caption font-semibold uppercase tracking-[0.14em] text-primary-deep sm:mt-5">{offer ? KIND_LABEL[offer.kind] : ''}</p>
                    <h1 className="mt-3 max-w-2xl text-balance lg:max-w-[60%]">{offer ? tidyRupees(offer.title) : 'Loading…'}</h1>
                    {offer?.summary && <p className="mt-2 max-w-xl text-body text-muted sm:text-lead">{tidyRupees(offer.summary)}</p>}
                    {offer?.kind === 'mix_match' && (
                        <div className="mt-5 inline-flex items-center gap-4 rounded-2xl bg-surface px-5 py-3.5 shadow-sm ring-1 ring-line sm:px-6 sm:py-4">
                            <span className="font-display text-h2 leading-none text-primary">{formatPrice(offer.price)}</span>
                            <span className="border-l border-line pl-4 text-small leading-snug text-ink"><strong className="block font-semibold">Box price</strong>for any {offer.pickCount} products worth {formatPrice(offer.price)} or more together</span>
                        </div>
                    )}
                    {offer?.kind === 'bogo' && <p className="mt-5 inline-flex rounded-2xl bg-surface px-5 py-3.5 text-small font-medium text-ink shadow-sm ring-1 ring-line sm:px-6 sm:py-4">Choose a product and add it once. We add a second one free, so you pay for one.</p>}
                </div>
            </section>
            <div className="container-page py-8 lg:py-12">
                {offer?.description && offer.kind === 'collection' && <p className="mb-8 max-w-2xl text-muted">{offer.description}</p>}
                {loading && <ProductGridSkeleton />}
                {!loading && offer?.kind === 'mix_match' && <MixBox offer={offer} products={eligible} />}
                {!loading && offer?.kind === 'bogo' && (
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4 lg:gap-x-6">
                        {eligible.map((product) => <li key={product.id}><BogoTile offer={offer} product={product} /></li>)}
                    </ul>
                )}
                {!loading && offer?.kind === 'collection' && (
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4 lg:gap-x-6">
                        {eligible.map((product, i) => <li key={product.id}><ProductCard product={product} priority={i < 4} /></li>)}
                    </ul>
                )}
                {!loading && offer && eligible.length === 0 && <p className="py-16 text-center text-muted">Products for this offer are coming soon.</p>}
            </div>
        </>
    );
}
