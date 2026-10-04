import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import ProductGallery from '@/components/product/ProductGallery';
import VariantPicker from '@/components/product/VariantPicker';
import ProductTabs from '@/components/product/ProductTabs';
import ReviewForm from '@/components/product/ReviewForm';
import ProductCard from '@/components/product/ProductCard';
import BundleCard from '@/components/product/BundleCard';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import DeliveryCheck from '@/components/product/DeliveryCheck';
import OffersList from '@/components/product/OffersList';
import ExpertChat from '@/components/product/ExpertChat';
import { Banner } from '@/components/home/BannerSection';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import Rating from '@/components/ui/Rating';
import Skeleton from '@/components/ui/Skeleton';
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
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useBundles, useCategories, useProduct, useProducts, useReviews, useBanners } from '@/hooks/useApi';
import { recordProductView } from '@/hooks/useRecentlyViewed';

function ProductSkeleton() {
    return (
        <div className="container-page grid gap-10 py-10 lg:grid-cols-2 lg:gap-16" aria-busy="true" aria-label="Loading product">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
}

export default function ProductDetailPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const { product, loading } = useProduct(id);
    const { products } = useProducts();
    const { bundles } = useBundles();
    const { categories } = useCategories();
    const { reviews, refetch: refetchReviews } = useReviews(id);
    const { banners: productBanners } = useBanners('product', product?.id);
    const { addToCart } = useCart();
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

    // Recorded once per product, not on every variant change while comparing pack sizes.
    useEffect(() => {
        if (product?.id) recordProductView(product.id);
    }, [product?.id]);

    // Show the sticky mobile buy bar once the main buy box has scrolled out of view.
    useEffect(() => {
        const el = buyBoxRef.current;
        if (!el) return undefined;
        const observer = new IntersectionObserver(([entry]) => setShowMobileBar(!entry.isIntersecting), { threshold: 0 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [product?.id]);

    if (loading) return <ProductSkeleton />;

    if (!product) {
        return (
            <div className="container-page py-24 text-center">
                <h1>Product not found</h1>
                <Link to="/shop" className="mt-6 inline-block"><Button variant="outline">Back to shop</Button></Link>
            </div>
        );
    }

    const related = getRelatedProducts(products, product.id, product.category);
    const productBundles = bundles.filter((b) => b.items.some((i) => i.productId === product.id));
    const trustBadges = getProductTrustBadges(content, product);
    const wished = isInWishlist(product.id);
    const categoryLabel = categories.find((c) => c.slug === product.category)?.label ?? humanizeSlug(product.category);

    // Pack-size variants each carry their own price/stock; products without variants use their own values.
    const variants = product.variants || [];
    const hasVariants = product.hasVariants && variants.length > 0;
    const activeVariant = hasVariants
        ? (variants.find((v) => v.id === selectedVariantId) || variants.find((v) => v.isDefault) || variants[0])
        : null;
    const galleryImages = activeVariant?.image
        ? [activeVariant.image, ...product.images.filter((img) => img !== activeVariant.image)]
        : product.images;

    const price = activeVariant ? activeVariant.price : product.price;
    const originalPrice = activeVariant ? activeVariant.originalPrice : product.originalPrice;
    const discount = activeVariant ? activeVariant.discount : product.discount;
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

    const handleAddToCart = () => {
        if (outOfStock) return showToast('This item is out of stock', 'error');
        if (addToCart(cartProduct, quantity)) showCartToast(showToast, cartProduct);
        else showToast('You already have the maximum available quantity in your bag', 'error');
        return undefined;
    };

    const handleBuyNow = () => {
        if (outOfStock) return showToast('This item is out of stock', 'error');
        if (addToCart(cartProduct, quantity)) showCartToast(showToast, cartProduct, 'Added. Proceeding to checkout');
        else showToast('You already have the maximum available quantity in your bag', 'error');
        navigate('/checkout');
        return undefined;
    };

    const handleWishlist = () => {
        toggleWishlist(product);
        showToast(wished ? 'Removed from wishlist' : 'Added to wishlist', 'success');
    };

    return (
        <div className={cn(showMobileBar && 'pb-24 lg:pb-0')}>
            <Seo
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
            />
            <Breadcrumbs
                className="container-page py-5"
                crumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Shop', href: '/shop' },
                    { label: categoryLabel, href: `/category/${product.category}` },
                    { label: product.title },
                ]}
            />

            <div className="container-page grid gap-10 pb-12 lg:grid-cols-2 lg:gap-16 lg:pb-20">
                <div>
                    <ProductGallery images={galleryImages} title={product.title} tags={product.tags} />
                    {productBanners.length > 0 && (
                        <div className="mt-6 space-y-4">{productBanners.map((b) => <Banner key={b.id} banner={b} />)}</div>
                    )}
                </div>

                <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
                    <div ref={buyBoxRef}>
                        <p className="eyebrow mb-2">{categoryLabel}</p>
                        <h1 className="text-h2">{product.title}</h1>
                        {product.reviewCount > 0 && <Rating value={product.rating} count={`${product.reviewCount} reviews`} className="mt-3" />}

                        <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-line pb-6">
                            <Price price={price} originalPrice={originalPrice} size="lg" />
                            {discount > 0 && <span className="rounded-full bg-primary-tint px-2.5 py-0.5 text-caption font-semibold text-primary-deep">{discount}% off</span>}
                            {originalPrice > price && <span className="text-small font-medium text-success">You save {formatPrice(originalPrice - price)}</span>}
                        </div>

                        {hasVariants && (
                            <div className="mt-8"><VariantPicker variants={variants} activeId={activeVariant?.id} onChange={setSelectedVariantId} /></div>
                        )}

                        {outOfStock ? (
                            <p className="mt-6 font-medium text-danger">Out of stock</p>
                        ) : stock <= 5 && <p className="mt-6 font-medium text-warning">Only {stock} left in stock</p>}

                        <div className="mt-6 flex items-center gap-3">
                            <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, stock || 1)} />
                            <button
                                type="button"
                                onClick={handleWishlist}
                                aria-pressed={wished}
                                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                                className={cn('grid size-11 place-items-center rounded-full border transition-colors', wished ? 'border-primary bg-primary-tint text-primary' : 'border-line-strong text-ink hover:border-primary hover:text-primary')}
                            >
                                <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <Button size="lg" disabled={outOfStock} onClick={handleAddToCart}><ShoppingBag size={18} aria-hidden="true" /> Add to bag</Button>
                            <Button size="lg" variant="accent" disabled={outOfStock} onClick={handleBuyNow}>Buy now</Button>
                        </div>
                    </div>

                    <OffersList />
                    <DeliveryCheck price={price} />

                    {trustBadges.length > 0 && (
                        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {trustBadges.map(({ icon: Icon, label }) => (
                                <li key={label} className="flex flex-col items-center gap-2 rounded-lg bg-canvas-alt p-3 text-center">
                                    <Icon size={20} className="text-primary" aria-hidden="true" />
                                    <span className="text-caption font-medium text-ink">{label}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-10"><ProductTabs product={product} reviews={reviews} /></div>
                    <ExpertChat product={product} />
                </div>
            </div>

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

            <section className="section">
                <div className="container-page"><ReviewForm product={product} onSubmitted={refetchReviews} /></div>
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

            <RecentlyViewed excludeId={product.id} />

            {showMobileBar && (
                <div className="safe-area-pb fixed inset-x-0 bottom-0 z-40 animate-fade-up border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-caption text-muted">{product.title}{activeVariant ? ` — ${activeVariant.label}` : ''}</p>
                            <p className="font-display text-h4 text-primary">{formatPrice(price)}</p>
                        </div>
                        <Button variant="accent" disabled={outOfStock} onClick={handleBuyNow}>{outOfStock ? 'Sold out' : 'Buy now'}</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
