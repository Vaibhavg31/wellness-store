import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgePercent, Gift, ShoppingBag, ShoppingCart, Package } from 'lucide-react';
import Seo, { SITE_URL } from '@/components/seo/Seo';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/product/ProductCard';
import MixBox from '@/components/offer/MixBox';
import { OfferPictures } from '@/components/home/OffersBento';
import OffersShowcase, { ClubStrip } from '@/components/home/OffersShowcase';
import { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { useOffers, useProducts } from '@/hooks/useApi';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { maxSaving, mixWorth } from '@/utils/offerPacks';
import { breadcrumbJsonLd } from '@/utils/seoSchema';
import { formatPrice } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1 Free', collection: 'Offer' };

const STEPS = [
    { icon: Package, title: 'Choose your products', text: 'Open an offer and pick the products you like. Each offer says exactly what it covers.' },
    { icon: ShoppingCart, title: 'Add it to your bag', text: 'A box or a pair goes into the bag as one line, so nothing gets lost on the way to checkout.' },
    { icon: BadgePercent, title: 'Pay the offer price', text: 'The price is worked out for you. Club member prices apply to everything outside an offer, and coupons still work.' },
];

/** /offers: every live offer on the plum stage, how offers work, and the Club card. */
export function OffersHubPage() {
    const { offers, loading } = useOffers();
    const { products } = useProducts();
    return (
        <>
            <Seo title="Offers" description="Pick & Mix boxes, Buy 1 Get 1 Free and more offers on Chikit Ayurvedic wellness." path="/offers" />
            {offers.length > 0 ? <OffersShowcase page products={products} /> : (
                <section className="bg-gradient-to-br from-primary-deep to-primary-night py-16 text-center text-white">
                    <div className="container-page">
                        <h1 className="text-white">Offers</h1>
                        {!loading && <p className="mx-auto mt-3 max-w-md text-white/75">No offers are running right now. Check back soon, or join the Chikit Club for member prices.</p>}
                    </div>
                </section>
            )}
            <section className="bg-canvas-alt py-12 lg:py-16" aria-labelledby="how-offers-work">
                <div className="container-page">
                    <h2 id="how-offers-work" className="text-h3">How our offers work</h2>
                    <ol className="mt-8 grid gap-6 md:grid-cols-3">
                        {STEPS.map(({ icon: Icon, title, text }, i) => (
                            <li key={title} className="rounded-2xl bg-surface p-6 shadow-xs ring-1 ring-line">
                                <span className="flex items-center gap-3">
                                    <span className="grid size-11 place-items-center rounded-full bg-primary text-accent"><Icon size={20} aria-hidden="true" /></span>
                                    <span className="text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">Step {i + 1}</span>
                                </span>
                                <h3 className="mt-4 font-sans text-h4">{title}</h3>
                                <p className="mt-2 text-small text-muted">{text}</p>
                            </li>
                        ))}
                    </ol>
                    {offers.length === 0 && <ClubStrip className="mt-10" />}
                </div>
            </section>
        </>
    );
}

/** The BOGO product tile: the product card plus a button that adds the pair. */
function BogoTile({ offer, product }) {
    const { addBogoPair } = useCart();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const soldOut = typeof product.stock === 'number' && product.stock < 2;
    const add = (checkout) => {
        if (addBogoPair(offer, product)) {
            showToast(checkout ? 'Pair added. Proceeding to checkout' : `2 × ${product.title} added: you pay for one`, 'success');
            if (checkout) navigate('/checkout');
        } else {
            showToast('Not enough stock for another pair', 'error');
        }
    };
    return (
        <div className="flex h-full flex-col gap-3">
            <div className="relative">
                <ProductCard product={product} action={false} />
                <span className="pointer-events-none absolute left-2.5 top-11 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent shadow-sm">Buy 1 Get 1</span>
            </div>
            <p className="text-center text-caption text-muted">Pay <strong className="text-ink">{formatPrice(product.price)}</strong> for 2 <span className="line-through"><span className="sr-only">Worth </span>{formatPrice(product.price * 2)}</span></p>
            <div className="mt-auto grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" disabled={soldOut} onClick={() => add(false)}><ShoppingBag size={14} aria-hidden="true" /> Add 2</Button>
                <Button size="sm" disabled={soldOut} onClick={() => add(true)}>Buy now</Button>
            </div>
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

    const saving = offer ? maxSaving(offer, products) : 0;
    const worth = offer ? mixWorth(offer, products) : 0;

    if (!offersLoading && !offer) {
        return (
            <div className="container-page py-24 text-center">
                <Gift size={40} className="mx-auto text-primary" aria-hidden="true" />
                <h1 className="mt-4">This offer has ended</h1>
                <p className="mt-2 text-muted">See what else is on right now.</p>
                <Link to="/offers" className="mt-6 inline-block"><Button>View all offers</Button></Link>
            </div>
        );
    }

    const loading = offersLoading || productsLoading;
    return (
        <>
            {offer && (
                <Seo
                    title={offer.title}
                    description={offer.summary || `Chikit offer: ${offer.title}`}
                    path={`/offers/${offer.slug}`}
                    image={offer.image}
                    jsonLd={breadcrumbJsonLd(SITE_URL, [{ name: 'Home', path: '/' }, { name: 'Offers', path: '/offers' }, { name: offer.title, path: `/offers/${offer.slug}` }])}
                />
            )}
            <section className="relative isolate overflow-hidden bg-gradient-to-br from-primary-deep via-primary-deep to-primary-night text-white">
                <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/40 blur-3xl" aria-hidden="true" />
                <div className="container-page relative py-6 sm:py-8 lg:py-12">
                    {offer && <OfferPictures offer={offer} products={products} well="bg-accent-tint" tileClass="size-40 xl:size-48" className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:flex xl:right-10" />}
                    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-small text-white/70">
                        <Link to="/" className="hover:text-white">Home</Link><span aria-hidden="true">/</span>
                        <Link to="/offers" className="hover:text-white">Offers</Link><span aria-hidden="true">/</span>
                        <span className="text-white">{offer?.title ?? '…'}</span>
                    </nav>
                    <p className="mt-4 text-caption font-semibold uppercase tracking-[0.18em] text-peach sm:mt-6">{offer ? KIND_LABEL[offer.kind] : ''}</p>
                    <h1 className="mt-2 max-w-2xl text-balance text-white lg:max-w-[60%]">{offer?.title ?? 'Loading…'}</h1>
                    {offer?.summary && <p className="mt-2 max-w-xl text-body text-white/75 sm:text-lead">{offer.summary}</p>}
                    {offer?.kind === 'mix_match' && (
                        <div className="mt-5 inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-accent px-5 py-3.5 text-primary-deep shadow-lg sm:px-6 sm:py-4">
                            <span className="flex items-baseline gap-2.5">
                                <span className="font-display text-h2 leading-none">{formatPrice(offer.price)}</span>
                                {worth > offer.price && <span className="text-lead font-semibold leading-none text-primary-deep/60 line-through decoration-2"><span className="sr-only">Worth </span>{formatPrice(worth)}</span>}
                            </span>
                            <span className="text-small font-medium">for any {offer.pickCount}, each product once</span>
                            {saving > 0 && <span className="rounded-full bg-primary px-3 py-1 text-caption font-semibold text-white">Save up to {formatPrice(saving)}</span>}
                        </div>
                    )}
                    {offer?.kind === 'bogo' && <p className="mt-5 inline-flex rounded-2xl bg-accent px-6 py-4 text-small font-medium text-primary-deep shadow-lg">Add a product and the second one is on us. You pay for one of the pair.</p>}
                </div>
            </section>
            <div className="container-page py-8 lg:py-12">
                {offer?.description && offer.kind !== 'mix_match' && <p className="mb-8 max-w-2xl text-muted">{offer.description}</p>}
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
