import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Minus, Plus, ShoppingBag, ChevronLeft } from 'lucide-react';
import { getRelatedProducts } from '@/utils/filterProducts';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useBundles, useProduct, useProducts, useReviews } from '@/hooks/useApi';
import ProductCard from '@/components/product/ProductCard';
import BundleCard from '@/components/product/BundleCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SectionTitle from '@/components/ui/SectionTitle';
import Input from '@/components/ui/Input';
import { api } from '@/services/api';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { getProductTrustBadges } from '@/utils/productTrustBadges';

const TABS = ['Description', 'Features', 'Reviews'];

export default function ProductDetailPage() {
    const { id = '' }  = useParams();
    const navigate     = useNavigate();
    const { product, loading } = useProduct(id);
    const { products } = useProducts();
    const { bundles } = useBundles();
    const { reviews, refetch: refetchReviews } = useReviews(id);
    const { addToCart }                    = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { showToast }                    = useToast();
    const { content }                      = useSiteContent();
    const trustBadges                      = getProductTrustBadges(content, product);

    const [selectedImage, setSelectedImage]    = useState(0);
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [quantity, setQuantity]              = useState(1);
    const [activeTab, setActiveTab]            = useState('Description');
    const [reviewError, setReviewError]        = useState('');
    const [reviewForm, setReviewForm]          = useState({ name: '', email: '', rating: 5, comment: '' });
    const [reviewSubmitted, setReviewSubmitted]= useState(false);
    const [showMobileBar, setShowMobileBar]    = useState(false);
    const buyBoxRef = useRef(null);

    useEffect(() => {
        setSelectedImage(0);
        setQuantity(1);
        const variants = product?.variants;
        setSelectedVariantId(
            variants?.length ? (variants.find((v) => v.isDefault) || variants[0]).id : null
        );
    }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setQuantity(1);
        setSelectedImage(0);
    }, [selectedVariantId]);

    useEffect(() => {
        const el = buyBoxRef.current;
        if (!el) return undefined;
        const observer = new IntersectionObserver(
            ([entry]) => setShowMobileBar(!entry.isIntersecting),
            { rootMargin: '-80px 0px 0px 0px', threshold: 0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [product?.id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-forest/30 border-t-forest rounded-full animate-spin" aria-label="Loading product" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="pb-20 pt-8 text-center px-6">
                <h1 className="font-display text-3xl mb-4">Product Not Found</h1>
                <Link to="/shop"><Button variant="outline">Back to Shop</Button></Link>
            </div>
        );
    }

    const related = getRelatedProducts(products, product.id, product.category);
    const productBundles = bundles.filter((b) => b.items.some((i) => i.productId === product.id));
    const wished  = isInWishlist(product.id);

    // Pack-size/duration variants (e.g. "1/3/6 Month Supply") each carry
    // their own price/stock — everything below reads from the selected one
    // when the product has variants, and falls back to the product itself
    // when it doesn't (so non-variant products are unaffected).
    const variants = product.variants || [];
    const hasVariants = product.hasVariants && variants.length > 0;
    const activeVariant = hasVariants
        ? (variants.find((v) => v.id === selectedVariantId) || variants.find((v) => v.isDefault) || variants[0])
        : null;
    // Most variants reuse the product's own photos as-is; a variant can
    // optionally override with its own cover photo (e.g. a different
    // color) — when set, it's shown first in the gallery and auto-selected.
    const galleryImages = activeVariant?.image
        ? [activeVariant.image, ...product.images.filter((img) => img !== activeVariant.image)]
        : product.images;

    const displayPrice = activeVariant ? activeVariant.price : product.price;
    const displayOriginalPrice = activeVariant ? activeVariant.originalPrice : product.originalPrice;
    const displayDiscount = activeVariant ? activeVariant.discount : product.discount;
    const displayStock = activeVariant ? activeVariant.stock : product.stock;

    const outOfStock = displayStock <= 0;
    const maxQty = Math.max(1, displayStock || 1);

    // What actually gets added to the cart / sent to checkout — merges the
    // selected variant's price/stock/id onto the base product.
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

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setReviewError('');
        try {
            await api.post('/api/reviews', { ...reviewForm, productId: product.id });
            setReviewSubmitted(true);
            setReviewForm({ name: '', email: '', rating: 5, comment: '' });
            refetchReviews();
        } catch (err) {
            setReviewError(err instanceof Error ? err.message : 'Failed to submit review. Please try again.');
        }
    };

    const handleAddToCart = () => {
        if (outOfStock) {
            showToast('This item is out of stock', 'error');
            return;
        }
        if (addToCart(cartProduct, quantity)) {
            showCartToast(showToast, cartProduct);
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
        }
    };

    const handleBuyNow = () => {
        if (outOfStock) {
            showToast('This item is out of stock', 'error');
            return;
        }
        if (addToCart(cartProduct, quantity)) {
            showCartToast(showToast, cartProduct, 'Added. Proceeding to checkout');
            navigate('/checkout');
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
            navigate('/checkout');
        }
    };

    return (
        <div className="pb-28 lg:pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-slate hover:text-forest mb-6 sm:mb-8 group transition-colors">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Shop
                </Link>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-20">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="min-w-0"
                    >
                        <p className="type-eyebrow text-slate mb-3">Product gallery</p>

                        <div className="relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-sand/40 soft-shadow-lg mb-3 sm:mb-4 group">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={`photo-${selectedImage}`}
                                    src={imageUrl(galleryImages[selectedImage])}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                    initial={{ opacity: 0, scale: 1.04 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                />
                            </AnimatePresence>
                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-2">
                                {product.tags.map((tag) => (
                                    <Badge key={tag} variant={tag === 'Sale' ? 'sale' : tag === 'New' ? 'new' : 'bestseller'}>{tag}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                            {galleryImages.map((img, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedImage(i)}
                                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                                        selectedImage === i ? 'border-forest soft-shadow scale-[1.03]' : 'border-transparent opacity-55 hover:opacity-90'
                                    }`}
                                    aria-label={`View image ${i + 1}`}
                                >
                                    <img src={imageUrl(img)} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        ref={buyBoxRef}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className="lg:sticky lg:top-[calc(var(--site-header-h,7rem)+1rem)] lg:self-start min-w-0"
                    >
                        <p className="type-eyebrow text-forest/75 mb-2 sm:mb-3 capitalize">{product.category}</p>
                        <h1 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-medium text-ink mb-4 sm:mb-5 leading-tight">{product.title}</h1>

                        {product.reviewCount > 0 && (
                            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                                <div className="flex gap-0.5" aria-label={`${product.rating} out of 5 stars`}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} size={14} className={i < Math.floor(product.rating) ? 'text-turmeric fill-turmeric' : 'text-border'} strokeWidth={0} />
                                    ))}
                                </div>
                                <span className="text-sm text-slate">{product.rating} ({product.reviewCount} reviews)</span>
                            </div>
                        )}

                        <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border/60">
                            <span className="font-display text-2xl sm:text-3xl text-ink">{formatPrice(displayPrice)}</span>
                            {displayOriginalPrice > displayPrice && (
                                <span className="text-base sm:text-lg text-slate/50 line-through">{formatPrice(displayOriginalPrice)}</span>
                            )}
                            {displayDiscount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-forest/10 text-forest text-xs font-medium">
                                    {displayDiscount}% off
                                </span>
                            )}
                        </div>

                        {hasVariants && (
                            <div className="mb-6 sm:mb-8">
                                <p className="type-eyebrow text-slate mb-3">Choose an Option</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                                    {variants.map((v) => {
                                        const active = v.id === activeVariant?.id;
                                        const sold = v.stock <= 0;
                                        return (
                                            <button
                                                key={v.id}
                                                type="button"
                                                disabled={sold}
                                                onClick={() => setSelectedVariantId(v.id)}
                                                className={`relative text-left px-3.5 py-3 rounded-xl border transition-all duration-200 ${
                                                    active
                                                        ? 'border-forest bg-forest/5 ring-1 ring-forest'
                                                        : 'border-border/70 hover:border-forest/40'
                                                } ${sold ? 'opacity-45 cursor-not-allowed' : ''}`}
                                                aria-pressed={active}
                                            >
                                                {v.discount > 0 && !sold && (
                                                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-turmeric text-cream text-[10px] font-medium shadow-sm">
                                                        -{v.discount}%
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-2">
                                                    {v.image && (
                                                        <img
                                                            src={imageUrl(v.image)}
                                                            alt=""
                                                            className="w-8 h-8 rounded-lg object-cover border border-border/50 flex-shrink-0"
                                                        />
                                                    )}
                                                    <span className={`block text-sm font-medium ${active ? 'text-forest' : 'text-ink'}`}>
                                                        {v.label}
                                                    </span>
                                                </span>
                                                {v.netQuantity && (
                                                    <span className="block text-xs text-slate/70 mt-0.5">{v.netQuantity}</span>
                                                )}
                                                <span className="block text-sm font-display text-ink mt-1.5">
                                                    {formatPrice(v.price)}
                                                    {v.originalPrice > v.price && (
                                                        <span className="ml-1.5 text-xs text-slate/50 line-through">{formatPrice(v.originalPrice)}</span>
                                                    )}
                                                </span>
                                                {sold && <span className="block text-[11px] text-red-600 mt-1">Out of stock</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mb-6 sm:mb-8">
                            <div className="flex gap-0 border-b border-border/40 mb-4 sm:mb-5 overflow-x-auto">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3 sm:px-4 pb-3 type-eyebrow transition-all duration-300 border-b-2 -mb-px whitespace-nowrap ${
                                            activeTab === tab
                                                ? 'text-forest border-forest font-medium'
                                                : 'text-slate/60 border-transparent hover:text-slate'
                                        }`}
                                    >
                                        {tab}
                                        {tab === 'Reviews' && reviews.length > 0 && (
                                            <span className="ml-1.5 text-[11px] bg-forest/10 text-forest rounded-full px-1.5 py-0.5">{reviews.length}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === 'Description' && (
                                    <motion.p
                                        key="desc"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-slate font-light leading-relaxed text-sm sm:text-base"
                                    >
                                        {product.description}
                                    </motion.p>
                                )}
                                {activeTab === 'Features' && (
                                    <motion.ul
                                        key="feat"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-3"
                                    >
                                        {product.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-3 text-sm text-slate">
                                                <span className="w-1.5 h-1.5 bg-forest/50 rounded-full flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </motion.ul>
                                )}
                                {activeTab === 'Reviews' && (
                                    <motion.div
                                        key="rev"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        {reviews.length === 0 ? (
                                            <p className="text-slate/60 text-sm">No reviews yet. Be the first!</p>
                                        ) : (
                                            <div className="space-y-4 max-h-56 overflow-y-auto pr-2">
                                                {reviews.map((review) => (
                                                    <div key={review.id} className="border-b border-border/40 pb-4 last:border-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-medium text-ink">{review.name}</p>
                                                            <div className="flex gap-0.5">
                                                                {Array.from({ length: 5 }).map((_, j) => (
                                                                    <Star key={j} size={11} className={j < review.rating ? 'text-turmeric fill-turmeric' : 'text-border'} strokeWidth={0} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-slate text-sm leading-relaxed">{review.comment}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {outOfStock ? (
                            <p className="text-sm text-red-600 mb-5 font-medium">Out of stock</p>
                        ) : displayStock <= 5 && (
                            <p className="text-sm text-forest/80 mb-5 font-medium">Only {displayStock} left in stock</p>
                        )}

                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <div className="flex items-center rounded-full border border-border/80 overflow-hidden">
                                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 sm:p-3.5 hover:bg-sand/60 transition-colors" aria-label="Decrease quantity">
                                    <Minus size={16} />
                                </button>
                                <span className="px-4 sm:px-5 text-sm font-medium" aria-live="polite">{quantity}</span>
                                <button type="button" onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={outOfStock} className="p-3 sm:p-3.5 hover:bg-sand/60 transition-colors disabled:opacity-40" aria-label="Increase quantity">
                                    <Plus size={16} />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => { toggleWishlist(product); showToast(wished ? 'Removed from wishlist' : 'Added to wishlist', 'success'); }}
                                className={`p-3 sm:p-3.5 rounded-full border transition-all duration-300 ${wished ? 'border-forest text-forest bg-forest/8' : 'border-border/80 hover:border-forest/40 hover:text-forest'}`}
                                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                            >
                                <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        <div className="hidden sm:flex flex-col sm:flex-row gap-3 mb-10">
                            <Button
                                variant="primary"
                                size="lg"
                                className="flex-1 bg-forest hover:bg-forest-light text-cream"
                                disabled={outOfStock}
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag size={18} /> Add to Cart
                            </Button>
                            <Button
                                variant="turmeric"
                                size="lg"
                                className="flex-1"
                                disabled={outOfStock}
                                onClick={handleBuyNow}
                            >
                                Buy Now
                            </Button>
                        </div>

                        {/* Mobile inline CTAs (also mirrored in sticky bar) */}
                        <div className="flex sm:hidden flex-col gap-2.5 mb-8">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full bg-forest hover:bg-forest-light text-cream"
                                disabled={outOfStock}
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag size={18} /> Add to Cart
                            </Button>
                            <Button
                                variant="turmeric"
                                size="lg"
                                className="w-full"
                                disabled={outOfStock}
                                onClick={handleBuyNow}
                            >
                                Buy Now
                            </Button>
                        </div>

                        {trustBadges.length > 0 && (
                            <div className={`grid gap-2 sm:gap-3 ${
                                trustBadges.length === 1 ? 'grid-cols-1 max-w-[10rem]'
                                    : trustBadges.length === 2 ? 'grid-cols-2'
                                    : trustBadges.length === 4 ? 'grid-cols-2 sm:grid-cols-4'
                                    : 'grid-cols-3'
                            }`}>
                                {trustBadges.map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-sand/40 border border-border/40 text-center">
                                        <Icon size={16} className="text-forest/70" />
                                        <span className="type-eyebrow-sm text-slate leading-tight">{label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {productBundles.length > 0 && (
                    <section className="mt-12 sm:mt-16">
                        <SectionTitle subtitle="Better Together" title="Frequently Bought Together" className="mb-6 sm:mb-8" />
                        <div className={`grid gap-4 sm:gap-6 ${productBundles.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl'}`}>
                            {productBundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}
                        </div>
                    </section>
                )}

                <section className="mt-12 sm:mt-16 bg-cream rounded-2xl p-5 sm:p-8 border border-border/40">
                    <h2 className="font-display text-xl sm:text-2xl mb-6 text-ink">Write a Review</h2>
                    {reviewSubmitted ? (
                        <p className="text-forest/80 font-light">Thank you! Your review has been submitted for approval.</p>
                    ) : (
                        <form onSubmit={handleReviewSubmit} className="space-y-4 max-w-lg">
                            <Input label="Name" value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} required />
                            <Input label="Email" type="email" value={reviewForm.email} onChange={(e) => setReviewForm({ ...reviewForm, email: e.target.value })} required />
                            <div>
                                <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-2">Rating</label>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: r })}
                                            className={reviewForm.rating >= r ? 'text-turmeric' : 'text-border'}
                                            aria-label={`Rate ${r} star${r !== 1 ? 's' : ''}`}
                                        >
                                            <Star size={18} fill={reviewForm.rating >= r ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                value={reviewForm.comment}
                                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                rows={3}
                                required
                                minLength={10}
                                className="w-full px-4 py-3 border border-sand/60 rounded-lg resize-none bg-cream focus:outline-none focus:ring-1 focus:ring-forest/30 text-ink placeholder:text-slate/40 font-light"
                                placeholder="Share your experience…"
                            />
                            {reviewError && (
                                <p className="text-red-600 text-sm" role="alert">{reviewError}</p>
                            )}
                            <Button variant="turmeric" type="submit">Submit Review</Button>
                        </form>
                    )}
                </section>

                {related.length > 0 && (
                    <section className="mt-16 sm:mt-28">
                        <SectionTitle subtitle="Curated For You" title="You May Also Like" />
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8">
                            {related.map((p) => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </section>
                )}
            </div>

            {/* Sticky mobile buy bar */}
            <AnimatePresence>
                {showMobileBar && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream/95 backdrop-blur-md border-t border-border/60 px-4 py-3 safe-area-pb"
                    >
                        <div className="max-w-7xl mx-auto flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate line-clamp-1">
                                    {product.title}{activeVariant ? ` — ${activeVariant.label}` : ''}
                                </p>
                                <p className="font-display text-lg text-forest">{formatPrice(displayPrice)}</p>
                            </div>
                            <Button
                                variant="turmeric"
                                size="md"
                                disabled={outOfStock}
                                onClick={handleBuyNow}
                                className="flex-shrink-0"
                            >
                                {outOfStock ? 'Sold Out' : 'Buy Now'}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
