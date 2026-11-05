import { useEffect, useRef, useState } from 'react';
import { Crown, Heart, Share2, ShoppingBag, Star } from 'lucide-react';
import ProductGallery from '@/components/product/ProductGallery';
import VariantPicker from '@/components/product/VariantPicker';
import ProductTabs from '@/components/product/ProductTabs';
import ReviewForm from '@/components/product/ReviewForm';
import ProductCard from '@/components/product/ProductCard';
import AddToBag from '@/components/product/AddToBag';
import BundleCard from '@/components/product/BundleCard';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import DeliveryCheck from '@/components/product/DeliveryCheck';
import OffersList from '@/components/product/OffersList';
import PaymentAssurance from '@/components/product/PaymentAssurance';
import ExpertChat from '@/components/product/ExpertChat';
import ClubPrice from '@/components/product/ClubPrice';
import { HeroIngredients, InfoBanners, ProductFaq, ProductHighlights, ProductVideos } from '@/components/product/ProductSections';
import { Banner } from '@/components/home/BannerSection';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import SectionHeader from '@/components/ui/SectionHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Seo, { SITE_URL } from '@/components/seo/Seo';
import { breadcrumbJsonLd, faqJsonLd, productJsonLd } from '@/utils/seoSchema';
import { imageUrl } from '@/services/api';
import { getRelatedProducts } from '@/utils/filterProducts';
import { humanizeSlug } from '@/utils/products';
import { formatPrice, cn } from '@/utils/formatPrice';
import { getProductTrustBadges } from '@/utils/productTrustBadges';
import { copyText } from '@/utils/copyText';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast } from '@/contexts/ToastContext';
import { useBundles, useCategories, useProducts } from '@/hooks/useApi';
import { recordProductView } from '@/hooks/useRecentlyViewed';

/**
 * The product page body. Used by the live page (a saved product) and by the admin's "Preview" (an unsaved draft),
 * so what the admin sees is exactly what shoppers get. In `preview` mode nothing is recorded or changed: no search
 * tags, no recently-viewed entry, no cart / wishlist changes, no review posting.
 */
/**
 * The star rating under the product name: the average (4.5) and how many reviews it comes from. Tapping it opens the Reviews tab and scrolls
 * straight to the reviews; with none yet it takes the shopper to the review form instead.
 */
function RatingLink({ rating, count }) {
    const go = () => {
        if (count > 0) window.dispatchEvent(new Event('chikit:show-reviews'));
        else document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    return (
        <button type="button" onClick={go} className="group mt-3 inline-flex min-h-9 items-center gap-2.5 text-left" aria-label={count > 0 ? `Rated ${Number(rating).toFixed(1)} out of 5 from ${count} reviews. See the reviews` : 'No reviews yet. Write the first review'}>
            {count > 0 ? (
                <>
                    <span className="inline-flex items-center gap-1 rounded-md bg-success px-2 py-1 text-small font-semibold leading-none text-white">{Number(rating).toFixed(1)} <Star size={13} strokeWidth={0} className="fill-white" aria-hidden="true" /></span>
                    <span className="text-small font-medium text-ink underline-offset-4 group-hover:underline">{count} {count === 1 ? 'review' : 'reviews'}</span>
                </>
            ) : (
                <span className="text-small text-muted underline-offset-4 group-hover:text-primary group-hover:underline">No reviews yet. Be the first to review</span>
            )}
        </button>
    );
}

export default function ProductDetailView({ product, reviews = [], refetchReviews = () => {}, productBanners = [], preview = false }) {
    const { products } = useProducts();
    const { bundles } = useBundles();
    const { categories } = useCategories();
    const { isMember } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { showToast } = useToast();
    const { content } = useSiteContent();

    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [showMobileBar, setShowMobileBar] = useState(false);
    const buyBoxRef = useRef(null);

    useEffect(() => {
        const variants = product?.variants;
        setSelectedVariantId(variants?.length ? (variants.find((v) => v.isDefault) || variants[0]).id : null);
    }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Recorded once per product, not on every variant change while comparing pack sizes.
    useEffect(() => {
        if (product?.id && !preview) recordProductView(product.id);
    }, [product?.id, preview]);

    // Show the sticky mobile buy bar whenever the real Add to bag button are not usable on screen: scrolled past, still
    // below the fold, or hidden behind the phone's bottom tab bar (its height is taken off the bottom of the visible area).
    useEffect(() => {
        const el = buyBoxRef.current;
        if (!el) return undefined;
        const tabbar = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tabbar-h'), 10) || 0;
        const observer = new IntersectionObserver(([entry]) => setShowMobileBar(!entry.isIntersecting), { threshold: 0.6, rootMargin: `0px 0px -${tabbar}px 0px` });
        observer.observe(el);
        return () => observer.disconnect();
    }, [product?.id]);

    const related = getRelatedProducts(products, product.id, product.category);
    const productBundles = bundles.filter((b) => b.items.some((i) => i.productId === product.id));
    const trustBadges = getProductTrustBadges(content, product);
    const wished = isInWishlist(product.id);
    const categoryLabel = categories.find((c) => c.slug === product.category)?.label ?? humanizeSlug(product.category);

    // Pack-size variants each carry their own price/stock; products without variants use their own values.
    // Smallest pack first (by units, then price) so the row always reads left to right from least to most.
    const variants = [...(product.variants || [])].sort((a, b) => (a.units || 1) - (b.units || 1) || a.price - b.price);
    const hasVariants = product.hasVariants && variants.length > 0;
    const activeVariant = hasVariants
        ? (variants.find((v) => v.id === selectedVariantId) || variants.find((v) => v.isDefault) || variants[0])
        : null;
    const galleryImages = activeVariant?.image
        ? [activeVariant.image, ...product.images.filter((img) => img !== activeVariant.image)]
        : product.images;

    const listPrice = activeVariant ? activeVariant.price : product.price;
    const memberPrice = (activeVariant ? activeVariant.memberPrice : product.memberPrice) ?? null;
    // A signed-in club member sees (and pays) the member price; everyone else sees what joining would save.
    const memberView = Boolean(isMember && memberPrice);
    const price = memberView ? memberPrice : listPrice;
    const originalPrice = activeVariant ? activeVariant.originalPrice : product.originalPrice;
    // What the shopper saves against the highest price on show (the original price, or the usual price when there is no original).
    const youSave = Math.max(0, Math.max(originalPrice || 0, listPrice) - price);
    const discount = memberView ? 0 : (activeVariant ? activeVariant.discount : product.discount);
    const stock = activeVariant ? activeVariant.stock : product.stock;
    const outOfStock = stock <= 0;

    // What actually goes to the cart: the base product with the selected variant's price/stock/id merged in.
    const cartProduct = activeVariant
        ? {
            ...product,
            variantId: activeVariant.id,
            variantLabel: activeVariant.label,
            price: activeVariant.price,
            originalPrice: activeVariant.originalPrice,
            discount: activeVariant.discount,
            stock: activeVariant.stock,
            images: activeVariant.image ? [activeVariant.image, ...product.images] : product.images,
        }
        : product;

    const previewOnly = () => showToast('This is a preview. Nothing was added.', 'info');
    // Phones open their own share sheet (WhatsApp, Instagram…); elsewhere the link is copied.
    const shareProduct = async () => {
        const url = `${window.location.origin}/product/${product.id}`;
        if (navigator.share) {
            try { await navigator.share({ title: product.title, text: `${product.title} on Chikit`, url }); } catch { /* closed the share sheet */ }
            return;
        }
        showToast((await copyText(url)) ? 'Link copied' : url, 'success');
    };

    // The one buying button: Add to bag, which turns into a quantity stepper once the product is in the bag. A draft preview adds nothing.
    const buyButton = (size) => (preview
        ? <Button size="lg" className="w-full" disabled={outOfStock} onClick={previewOnly}><ShoppingBag size={18} aria-hidden="true" /> {outOfStock ? 'Sold out' : 'Add to bag'}</Button>
        : <AddToBag product={cartProduct} size={size} />);

    const handleWishlist = () => {
        if (preview) return previewOnly();
        toggleWishlist(product);
        showToast(wished ? 'Removed from wishlist' : 'Added to wishlist', 'success');
    };

    return (
        <div className={cn('product-flow', showMobileBar && 'pb-24 lg:pb-0')}>
            {!preview && <Seo
                title={product.title}
                description={product.description}
                path={`/product/${product.id}`}
                image={product.images?.[0]}
                type="product"
                jsonLd={[
                    productJsonLd(product, { siteUrl: SITE_URL, brand: content.brandName, resolveImage: (img) => imageUrl(img), returnDays: content.delivery?.returnDays }),
                    breadcrumbJsonLd(SITE_URL, [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: categoryLabel, path: `/category/${product.category}` }, { name: product.title }]),
                    faqJsonLd(product.faqs),
                ]}
            />}
            <Breadcrumbs
                className="container-page py-5"
                crumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Shop', href: '/shop' },
                    { label: categoryLabel, href: `/category/${product.category}` },
                    { label: product.title },
                ]}
            />

            <div className="container-page grid gap-6 pb-8 lg:grid-cols-2 lg:gap-16 lg:pb-12">
                <div className={cn('min-w-0 lg:sticky lg:self-start', preview ? 'lg:top-6' : 'lg:top-28')}>
                    <ProductGallery images={galleryImages} title={product.title} tags={product.tags} />
                </div>

                <div className="min-w-0">
                    <div>
                        <p className="eyebrow mb-2">{categoryLabel}</p>
                        <h1 className="text-h2">{product.title}</h1>
                        <RatingLink rating={product.rating} count={product.reviewCount || reviews.length} />

                        <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-line pb-6">
                            <Price price={listPrice} originalPrice={originalPrice} memberPrice={memberPrice} isMember={isMember} size="lg" />
                            {discount > 0 && <span className="rounded-full bg-primary-tint px-2.5 py-0.5 text-caption font-semibold text-primary-deep">{discount}% off</span>}
                            {youSave > 0 && <span className="text-small font-medium text-success">You save {formatPrice(youSave)}</span>}
                            <ClubPrice memberPrice={memberPrice} className="py-1" />
                        </div>

                        {hasVariants && (
                            <div className="mt-5"><VariantPicker variants={variants} activeId={activeVariant?.id} onChange={setSelectedVariantId} productImage={product.images?.[0]} isMember={isMember} /></div>
                        )}

                        {outOfStock ? (
                            <p className="mt-6 font-medium text-danger">Out of stock</p>
                        ) : stock <= 5 && <p className="mt-6 font-medium text-warning">Only {stock} left in stock</p>}

                        <div className="mt-6 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleWishlist}
                                aria-pressed={wished}
                                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                                className={cn('grid size-11 place-items-center rounded-full border transition-colors', wished ? 'border-primary bg-primary-tint text-primary' : 'border-line-strong text-ink hover:border-primary hover:text-primary')}
                            >
                                <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
                            </button>
                            <button type="button" onClick={shareProduct} aria-label="Share this product" className="grid size-11 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-primary hover:text-primary">
                                <Share2 size={19} />
                            </button>
                        </div>

                        <div ref={buyBoxRef} className="mt-4">
                            {buyButton('large')}
                        </div>
                        <PaymentAssurance className="mt-4" />
                    </div>

                    <OffersList />
                    <DeliveryCheck price={price} />

                    {trustBadges.length > 0 && (
                        <ul className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
                            {trustBadges.map(({ icon: Icon, label }) => (
                                <li key={label} className="flex flex-col items-center gap-2 rounded-lg bg-canvas-alt p-3 text-center">
                                    <Icon size={20} className="text-primary" aria-hidden="true" />
                                    <span className="text-caption font-medium text-ink">{label}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-8"><ProductTabs product={product} reviews={reviews} /></div>
                    <ExpertChat product={product} />
                </div>
            </div>

            <ProductHighlights product={product} />
            <HeroIngredients product={product} />
            <InfoBanners product={product} />
            <ProductFaq product={product} />
            <ProductVideos product={product} />

            {productBanners.length > 0 && (
                <div className="container-page grid gap-4 pb-8 lg:pb-12">{productBanners.map((b) => <Banner key={b.id} banner={b} />)}</div>
            )}

            {productBundles.length > 0 && (
                <section className="section bg-canvas-alt">
                    <div className="container-page">
                        <SectionHeader eyebrow="Better together" title="Frequently bought together" align="left" />
                        <div className={cn('grid gap-6', productBundles.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl')}>
                            {productBundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}
                        </div>
                    </div>
                </section>
            )}

            <section id="write-review" className="section scroll-mt-24">
                <div className="container-page" inert={preview || undefined}><ReviewForm product={product} onSubmitted={refetchReviews} /></div>
            </section>

            {related.length > 0 && (
                <section className="section bg-canvas-alt">
                    <div className="container-page">
                        <SectionHeader eyebrow="Curated for you" title="You may also like" align="left" />
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 xl:grid-cols-4 lg:gap-x-6">
                            {related.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
                        </ul>
                    </div>
                </section>
            )}

            {!preview && <RecentlyViewed excludeId={product.id} />}

            {showMobileBar && (
                <div className="fixed inset-x-0 bottom-[var(--tabbar-h,0px)] z-40 animate-fade-up border-t border-line bg-surface px-4 py-3 lg:hidden">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-caption text-muted">{product.title}{activeVariant ? ` — ${activeVariant.label}` : ''}</p>
                            <p className="flex items-center gap-1 font-display text-h4 text-primary">{memberView && <Crown size={14} aria-label="Chikit Club price" />}{formatPrice(price)}</p>
                        </div>
                        <div className="w-44 shrink-0">{buyButton('card')}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
