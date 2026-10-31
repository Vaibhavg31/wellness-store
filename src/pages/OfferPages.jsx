import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Gift, ShoppingBag, Tag } from 'lucide-react';
import Seo, { SITE_URL } from '@/components/seo/Seo';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProductCard from '@/components/product/ProductCard';
import MixBox from '@/components/offer/MixBox';
import { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { useOffers, useProducts } from '@/hooks/useApi';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { breadcrumbJsonLd } from '@/utils/seoSchema';
import { formatPrice } from '@/utils/formatPrice';

const KIND_LABEL = { mix_match: 'Pick & Mix', bogo: 'Buy 1 Get 1 Free', collection: 'Offer' };

/** /offers: every offer page that is live, as cards. */
export function OffersHubPage() {
    const { offers, loading } = useOffers();
    return (
        <>
            <Seo title="Offers" description="Pick & Mix boxes, Buy 1 Get 1 Free and more offers on Chikit Ayurvedic wellness." path="/offers" />
            <PageHeader compact crumbs={[{ label: 'Home', href: '/' }, { label: 'Offers' }]} eyebrow="Save more" title="Offers" description="Our current offers. New ones appear here as soon as they start." />
            <div className="container-page py-8 lg:py-12">
                {!loading && offers.length === 0 && <p className="py-16 text-center text-muted">No offers are running right now. Check back soon, or <Link to="/club" className="font-medium text-primary underline">join the Chikit Club</Link> for member prices.</p>}
                <ul className="grid gap-5 md:grid-cols-2">
                    {offers.map((offer) => (
                        <li key={offer.id}>
                            <Link to={`/offers/${offer.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-md">
                                <div className="relative aspect-[16/7] bg-gradient-to-br from-primary to-primary-deep">
                                    {offer.image
                                        ? <img src={imageUrl(offer.image, 900)} alt="" loading="lazy" className="size-full object-cover" />
                                        : (
                                            <div className="flex size-full flex-col justify-center px-6 text-white">
                                                <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-caption font-bold uppercase tracking-wide text-ink"><Tag size={13} aria-hidden="true" /> {KIND_LABEL[offer.kind]}</span>
                                                <span className="font-display text-h2 leading-tight">{offer.kind === 'mix_match' ? `Any ${offer.pickCount} for ${formatPrice(offer.price)}` : offer.kind === 'bogo' ? 'Buy 1 Get 1 Free' : offer.title}</span>
                                            </div>
                                        )}
                                </div>
                                <div className="flex flex-1 flex-col gap-2 p-5">
                                    <h2 className="font-sans text-h4">{offer.title}</h2>
                                    {offer.summary && <p className="text-small text-muted">{offer.summary}</p>}
                                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-small font-semibold text-primary">Shop this offer <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
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
                <ProductCard product={product} />
                <Badge variant="bestseller" className="pointer-events-none absolute left-3 top-12 z-10 uppercase tracking-wide">Buy 1 Get 1</Badge>
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
            <PageHeader
                compact
                crumbs={[{ label: 'Home', href: '/' }, { label: 'Offers', href: '/offers' }, { label: offer?.title ?? '…' }]}
                eyebrow={offer ? KIND_LABEL[offer.kind] : ''}
                title={offer?.title ?? 'Loading…'}
                description={offer?.summary}
            >
                {offer?.kind === 'mix_match' && (
                    <p className="mt-4 inline-flex flex-wrap items-baseline gap-x-3 rounded-xl bg-surface px-5 py-3 shadow-xs ring-1 ring-line">
                        <span className="font-display text-h2 text-primary">{formatPrice(offer.price)}</span>
                        <span className="text-small text-muted">for any {offer.pickCount} · each product once</span>
                    </p>
                )}
            </PageHeader>
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
