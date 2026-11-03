import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Heart, Share2, ShoppingBag } from 'lucide-react';
import ProductGallery from '@/components/product/ProductGallery';
import VariantPicker from '@/components/product/VariantPicker';
import ProductInfo from '@/components/product/ProductInfo';
import ReviewForm from '@/components/product/ReviewForm';
import ProductCard from '@/components/product/ProductCard';
import BundleCard from '@/components/product/BundleCard';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import DeliveryCheck from '@/components/product/DeliveryCheck';
import OffersList from '@/components/product/OffersList';
import PaymentAssurance from '@/components/product/PaymentAssurance';
import ExpertChat from '@/components/product/ExpertChat';
import { HeroIngredients, InfoBanners, ProductFaq, ProductVideos } from '@/components/product/ProductSections';
import { Banner } from '@/components/home/BannerSection';
import Price from '@/components/commerce/Price';
import Rating from '@/components/ui/Rating';
import QuantityStepper from '@/components/ui/QuantityStepper';
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
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useBundles, useCategories, useProducts } from '@/hooks/useApi';
import { recordProductView } from '@/hooks/useRecentlyViewed';

/**
 * The product page body. Used by the live page (a saved product) and by the admin's "Preview" (an unsaved draft), so what the admin
 * sees is exactly what shoppers get. In `preview` mode nothing is recorded or changed: no search tags, no recently-viewed entry, no
 * cart or wishlist changes, no review posting.
 *
 * Layout: pictures left (sticky), the buying column right: name, rating, price (Club aware), pack choice, quantity, Add to bag, then
 * delivery, offers and the product's information. Below: hero ingredients, information banners, FAQ, videos, reviews, related products.
 */
export default function ProductDetailView({ product, reviews = [], refetchReviews = () => {}, productBanners = [], preview = false }) {
    const navigate = useNavigate();
    const { products } = useProducts();
    const { bundles } = useBundles();
    const { categories } = useCategories();
    const { addToCart, isMember } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { showToast } = useToast();
    const { content } = useSiteContent();

    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [showMobileBar, setShowMobileBar] = useState(false);
    const buyBoxRef = useRef(null);

    useEffect(() => {
        setQuantity(1);
        const variants = product?.variants;
        setSelectedVariantId(variants?.length ? (variants.find((v) => v.isDefault) || variants[0]).id : null);
    }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => setQuantity(1), [selectedVariantId]);

    useEffect(() => {
        if (product?.id && !preview) recordProductView(product.id);
    }, [product?.id, preview]);

    // The sticky phone buy bar appears once the main buy box has scrolled out of view.
    useEffect(() => {
        const el = buyBoxRef.current;
        if (!el) return undefined;
        const observer = new IntersectionObserver(([entry]) => setShowMobileBar(!entry.isIntersecting), { threshold: 0 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [product?.id]);

    const related = getRelatedProducts(products, product.id, product.category);
    const productBundles = bundles.filter((b) => b.items.some((i) => i.productId === product.id));
    const trustBadges = getProductTrustBadges(content, product);
    const wished = isInWishlist(product.id);
    const categoryLabel = categories.find((c) => c.slug === product.category)?.label ?? humanizeSlug(product.category);

    // Pack-size variants each carry their own price and stock; products without variants use their own values.
    const variants = product.variants || [];
    const hasVariants = product.hasVariants && variants.length > 0;
    const activeVariant = hasVariants ? (variants.find((v) => v.id === selectedVariantId) || variants.find((v) => v.isDefault) || variants[0]) : null;
    const galleryImages = activeVariant?.image ? [activeVariant.image, ...product.images.filter((img) => img !== activeVariant.image)] : product.images;

    const priceItem = activeVariant
        ? { price: activeVariant.price, originalPrice: activeVariant.originalPrice, memberPrice: activeVariant.memberPrice }
        : { price: product.price, originalPrice: product.originalPrice, memberPrice: product.memberPrice };
    const memberView = Boolean(isMember && priceItem.memberPrice && priceItem.memberPrice < priceItem.price);
    const payPrice = memberView ? priceItem.memberPrice : priceItem.price;
    const stock = activeVariant ? activeVariant.stock : product.stock;
    const outOfStock = stock <= 0;
    const badge = product.isNew ? 'New' : product.isBestSeller ? 'Bestseller' : '';

    // What actually goes to the cart: the base product with the selected variant's price, stock and id merged in.
    const cartProduct = activeVariant
        ? { ...product, variantId: activeVariant.id, variantLabel: activeVariant.label, price: activeVariant.price, originalPrice: activeVariant.originalPrice, discount: activeVariant.discount, stock: activeVariant.stock, images: activeVariant.image ? [activeVariant.image, ...product.images] : product.images }
        : product;

    const previewOnly = () => showToast('This is a preview. Nothing was added.', 'info');
    const shareProduct = async () => {
        const url = `${window.location.origin}/product/${product.id}`;
        if (navigator.share) {
            try { await navigator.share({ title: product.title, text: `${product.title} on Chikit`, url }); } catch { /* closed the share sheet */ }
            return;
        }
        showToast((await copyText(url)) ? 'Link copied' : url, 'success');
    };

    const handleAddToCart = () => {
        if (preview) return previewOnly();
        if (outOfStock) return showToast('This item is out of stock', 'error');
        if (addToCart(cartProduct, quantity)) showCartToast(showToast, cartProduct);
        else showToast('You already have the maximum available quantity in your bag', 'error');
        return undefined;
    };

    const handleBuyNow = () => {
        if (preview) return previewOnly();
        if (outOfStock) return showToast('This item is out of stock', 'error');
        if (addToCart(cartProduct, quantity)) showCartToast(showToast, cartProduct, 'Added. Proceeding to checkout');
        else showToast('You already have the maximum available quantity in your bag', 'error');
        navigate('/checkout');
        return undefined;
    };

    const handleWishlist = () => {
        if (preview) return previewOnly();
        toggleWishlist(product);
        showToast(wished ? 'Removed from wishlist' : 'Added to wishlist', 'success');
    };

    return (
        <div className={cn(showMobileBar && 'pb-24 lg:pb-0')}>
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
            <Breadcrumbs className="container-page py-5" crumbs={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: categoryLabel, href: `/category/${product.category}` }, { label: product.title }]} />

            <div className="container-page grid gap-8 pb-12 lg:grid-cols-12 lg:gap-12 lg:pb-20">
                <div className={cn('min-w-0 lg:col-span-7 lg:sticky lg:self-start', preview ? 'lg:top-6' : 'lg:top-32')}>
                    <ProductGallery images={galleryImages} title={product.title} badge={badge} />
                </div>

                <div className="min-w-0 lg:col-span-5">
                    <div ref={buyBoxRef}>
                        <p className="eyebrow mb-2">{categoryLabel}</p>
                        <h1 className="text-h2">{product.title}</h1>
                        {product.reviewCount > 0 && <a href="#reviews" className="mt-3 inline-block"><Rating value={product.rating} count={`${product.reviewCount} reviews`} /></a>}

                        <Price item={priceItem} title={product.title} size="lg" className="mt-5" />
                        {memberView && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-caption font-bold text-primary-deep"><Crown size={13} aria-hidden="true" /> Club member price</p>}

                        {hasVariants && <div className="mt-7"><VariantPicker variants={variants} activeId={activeVariant?.id} onChange={setSelectedVariantId} productImage={product.images?.[0]} isMember={isMember} title={product.title} /></div>}

                        {outOfStock ? <p className="mt-6 font-bold text-danger">Out of stock</p> : stock <= 5 && <p className="mt-6 text-small font-bold text-warning">Only {stock} left in stock</p>}

                        <div className="mt-6 flex items-center gap-3">
                            <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, stock || 1)} />
                            <button type="button" disabled={outOfStock} onClick={handleAddToCart} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-body font-bold text-white shadow-md transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-subtle disabled:shadow-none"><ShoppingBag size={19} aria-hidden="true" /> Add to bag</button>
                            <button type="button" onClick={handleWishlist} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} className={cn('grid size-12 shrink-0 place-items-center rounded-full border-2 transition-colors', wished ? 'border-primary bg-primary-tint text-primary' : 'border-line-strong text-ink hover:border-primary hover:text-primary')}><Heart size={20} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" /></button>
                        </div>
                        <div className="mt-3 flex gap-3">
                            <button type="button" disabled={outOfStock} onClick={handleBuyNow} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-accent px-6 text-body font-bold text-primary-deep transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-subtle">Buy now</button>
                            <button type="button" onClick={shareProduct} aria-label="Share this product" className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-line-strong text-ink transition-colors hover:border-primary hover:text-primary"><Share2 size={19} aria-hidden="true" /></button>
                        </div>
                        <PaymentAssurance className="mt-4" />
                    </div>

                    <OffersList />
                    <DeliveryCheck price={payPrice} />

                    {trustBadges.length > 0 && (
                        <ul className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
                            {trustBadges.map(({ icon: Icon, label }) => (
                                <li key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-accent-tint p-3 text-center ring-1 ring-line">
                                    <Icon size={20} className="text-primary" aria-hidden="true" />
                                    <span className="text-caption font-semibold text-ink">{label}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-8"><ProductInfo product={product} reviews={reviews} /></div>
                    <ExpertChat product={product} />
                </div>
            </div>

            <HeroIngredients product={product} />
            <InfoBanners product={product} />
            <ProductFaq product={product} />
            <ProductVideos product={product} />

            {productBanners.length > 0 && <div className="container-page grid gap-4 pb-12 lg:pb-20">{productBanners.map((b) => <Banner key={b.id} banner={b} />)}</div>}

            {productBundles.length > 0 && (
                <section className="section bg-accent-tint">
                    <div className="container-page">
                        <SectionHeader eyebrow="Better together" title="Frequently bought together" align="left" />
                        <div className={cn('grid gap-6', productBundles.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl')}>{productBundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}</div>
                    </div>
                </section>
            )}

            <section className="section"><div className="container-page" inert={preview || undefined}><ReviewForm product={product} onSubmitted={refetchReviews} /></div></section>

            {related.length > 0 && (
                <section className="section bg-accent-tint">
                    <div className="container-page">
                        <SectionHeader eyebrow="Curated for you" title="You may also like" align="left" />
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">{related.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}</ul>
                    </div>
                </section>
            )}

            {!preview && <RecentlyViewed excludeId={product.id} />}

            {showMobileBar && (
                <div className="safe-area-pb fixed inset-x-0 bottom-0 z-40 animate-fade-up border-t border-line bg-surface/97 px-4 py-3 shadow-[0_-8px_24px_rgb(56_18_58/0.1)] backdrop-blur lg:hidden">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-caption text-muted">{product.title}{activeVariant ? ` · ${activeVariant.label}` : ''}</p>
                            <p className="flex items-center gap-1.5 font-display text-h4 leading-tight text-primary">{memberView && <Crown size={15} className="text-gold" aria-hidden="true" />}{formatPrice(payPrice)}</p>
                        </div>
                        <button type="button" disabled={outOfStock} onClick={handleAddToCart} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-small font-bold text-white disabled:bg-disabled disabled:text-subtle"><ShoppingBag size={18} aria-hidden="true" /> {outOfStock ? 'Sold out' : 'Add to bag'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
