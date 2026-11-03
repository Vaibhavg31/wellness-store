import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgePercent, Gift, Package, ShoppingBag, ShoppingCart } from 'lucide-react';
import Seo, { SITE_URL } from '@/components/seo/Seo';
import Button from '@/components/ui/Button';
import ProductCard from '@/components/product/ProductCard';
import MixBox from '@/components/offer/MixBox';
import ClubBand from '@/components/home/ClubBand';
import { OfferPictures, OfferTile } from '@/components/home/OffersBento';
import { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { useOffers, useProducts } from '@/hooks/useApi';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { maxSaving, offerPool } from '@/utils/offerPacks';
import { breadcrumbJsonLd } from '@/utils/seoSchema';
import { formatPrice } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1 Free', collection: 'Offer' };
const TONES = ['plum', 'beige', 'ivory'];

const STEPS = [
    { icon: Package, title: 'Choose your products', text: 'Open an offer and pick what you like. Each offer says exactly what it covers.' },
    { icon: ShoppingCart, title: 'Add it to your bag', text: 'A box or a pair goes in as one line, so nothing gets lost on the way to checkout.' },
    { icon: BadgePercent, title: 'Pay the offer price', text: 'The price is worked out for you. Club prices apply to everything outside an offer, and coupons still work.' },
];

/** /offers: every live offer as a bold tile, how offers work, and the Club. */
export function OffersHubPage() {
    const { offers, loading } = useOffers();
    const { products } = useProducts();
    return (
        <>
            <Seo title="Offers" description="Pick & Mix boxes, Buy 1 Get 1 Free and more offers on Chikit Ayurvedic wellness." path="/offers" />
            <section className="bg-accent-tint border-b border-line">
                <div className="container-page py-12 lg:py-16">
                    <p className="eyebrow">Save more</p>
                    <h1 className="mt-3 text-primary-deep">Offers</h1>
                    <p className="mt-3 max-w-xl text-lead text-primary-deep/80">Pick your own box or double up on a favourite. New offers appear here the moment they start.</p>
                </div>
            </section>
            <section className="bg-canvas py-10 lg:py-14">
                <div className="container-page">
                    {!loading && offers.length === 0 && <p className="py-12 text-center text-muted">No offers are running right now. Check back soon, or <Link to="/club" className="font-bold text-primary underline">join the Chikit Club</Link> for member prices.</p>}
                    <ul className="grid gap-4 md:grid-cols-2 lg:gap-6">
                        {offers.map((offer, i) => <li key={offer.id}><OfferTile offer={offer} tone={TONES[i % 3]} products={products} size="lg" /></li>)}
                    </ul>
                </div>
            </section>
            <section className="bg-accent-tint py-12 lg:py-16" aria-labelledby="how-offers-work">
                <div className="container-page">
                    <h2 id="how-offers-work" className="text-h3">How our offers work</h2>
                    <ol className="mt-8 grid gap-5 md:grid-cols-3">
                        {STEPS.map(({ icon: Icon, title, text }, i) => (
                            <li key={title} className="rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
                                <span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-primary text-accent"><Icon size={20} aria-hidden="true" /></span><span className="text-caption font-bold uppercase tracking-[0.14em] text-accent-ink">Step {i + 1}</span></span>
                                <h3 className="mt-4 font-sans text-h4 font-bold">{title}</h3>
                                <p className="mt-2 text-small text-muted">{text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
            <ClubBand products={products} />
        </>
    );
}

/** The BOGO product tile: the product card plus buttons that add the pair. */
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
                <span className="pointer-events-none absolute left-3 top-12 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent shadow-sm">Buy 1 Get 1</span>
            </div>
            <p className="text-center text-caption text-muted">Pay <strong className="text-ink">{formatPrice(product.price)}</strong> for 2</p>
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
    const eligible = useMemo(() => (offer ? offerPool(offer, products) : []), [offer, products]);
    const saving = offer ? maxSaving(offer, products) : 0;

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
            <section className="bg-gradient-to-br from-primary-deep via-primary-deep to-primary-night text-white">
                <div className="container-page relative py-10 lg:py-14">
                    {offer && <OfferPictures offer={offer} products={products} well="bg-accent-tint" tileClass="size-44 xl:size-52" className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:flex xl:right-10" />}
                    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-small text-white/70">
                        <Link to="/" className="hover:text-white">Home</Link><span aria-hidden="true">/</span>
                        <Link to="/offers" className="hover:text-white">Offers</Link><span aria-hidden="true">/</span>
                        <span className="text-white">{offer?.title ?? '…'}</span>
                    </nav>
                    <p className="mt-6 text-caption font-bold uppercase tracking-[0.18em] text-peach">{offer ? KIND_LABEL[offer.kind] : ''}</p>
                    <h1 className="mt-3 max-w-3xl text-white">{offer?.title ?? 'Loading…'}</h1>
                    {offer?.summary && <p className="mt-3 max-w-xl text-lead text-white/75">{offer.summary}</p>}
                    {offer?.kind === 'mix_match' && (
                        <p className="mt-6 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1.5 rounded-2xl bg-accent px-6 py-4 text-primary-deep shadow-lg">
                            <span className="font-display text-h2 leading-none">{formatPrice(offer.price)}</span>
                            <span className="text-small font-semibold">for any {offer.pickCount}, each product once</span>
                            {saving > 0 && <span className="rounded-full bg-primary px-3 py-0.5 text-caption font-bold text-white">Save up to {formatPrice(saving)}</span>}
                        </p>
                    )}
                    {offer?.kind === 'bogo' && <p className="mt-6 inline-flex rounded-2xl bg-accent px-6 py-4 text-small font-semibold text-primary-deep shadow-lg">Add a product and the second one is on us. You pay for one of the pair.</p>}
                </div>
            </section>
            <div className="container-page py-8 lg:py-12">
                {offer?.description && <p className="mb-8 max-w-2xl text-muted">{offer.description}</p>}
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
