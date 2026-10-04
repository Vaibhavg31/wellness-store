import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Minus, Plus, ShoppingBag, ChevronLeft, Sparkles, ShieldCheck, Camera, X, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { getRelatedProducts } from '@/utils/filterProducts';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl, api } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useBundles, useProduct, useProducts, useReviews, useBanners } from '@/hooks/useApi';
import ProductCard from '@/components/product/ProductCard';
import BundleCard from '@/components/product/BundleCard';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import { recordProductView } from '@/hooks/useRecentlyViewed';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SectionTitle from '@/components/ui/SectionTitle';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { getProductTrustBadges } from '@/utils/productTrustBadges';
import { loginUrl } from '@/utils/authRedirect';

const TABS = ['Description', 'Features', 'Reviews'];
const MAX_REVIEW_IMAGES = 4;

/** Reads a duration straight out of the variant's own label ("1 Month
 *  Supply", "2 Week Pack") to show a rough per-day cost — no schema change,
 *  just a nicer way to read a price that already exists. Returns null for
 *  anything that isn't phrased as a month/week duration. */
function estimateDailyCost(label, price) {
    if (!label || !price) return null;
    const month = label.match(/(\d+)\s*month/i);
    const week = !month && label.match(/(\d+)\s*week/i);
    const days = month ? Number(month[1]) * 30 : week ? Number(week[1]) * 7 : null;
    if (!days) return null;
    const perDay = price / days;
    return perDay >= 1 ? Math.round(perDay) : Math.round(perDay * 100) / 100;
}

/** Full-bleed strip of admin-managed banners for this one product's page —
 *  a completely separate slot from every homepage banner section. Auto-
 *  advances only when there's more than one, so a single banner just sits
 *  still like a plain promo image. */
function ProductBannerStrip({ banners }) {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (banners.length <= 1) return undefined;
        const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
        return () => clearInterval(id);
    }, [banners.length]);

    if (banners.length === 0) return null;
    const banner = banners[index];

    const inner = (
        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] overflow-hidden rounded-xl sm:rounded-2xl bg-sand/40">
            <AnimatePresence mode="wait">
                <motion.img
                    key={banner.id}
                    src={imageUrl(banner.image)}
                    alt={banner.title || ''}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </AnimatePresence>
            {(banner.title || banner.subtitle || banner.ctaLabel) && (
                <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/20 to-transparent flex flex-col justify-center p-4 sm:p-6">
                    {banner.subtitle && <p className="eyebrow text-canvas/75 mb-1">{banner.subtitle}</p>}
                    {banner.title && <p className="font-display text-base sm:text-xl text-canvas mb-2 max-w-xs">{banner.title}</p>}
                    {banner.ctaLabel && (
                        <span className="inline-flex items-center gap-1 w-fit text-[11px] sm:text-xs uppercase tracking-wide font-medium text-ink bg-canvas px-3 py-1.5 rounded-full">
                            {banner.ctaLabel} <ChevronRightIcon size={12} />
                        </span>
                    )}
                </div>
            )}
            {banners.length > 1 && (
                <div className="absolute bottom-2 sm:bottom-3 right-3 flex gap-1">
                    {banners.map((b, i) => (
                        <span key={b.id} className={`block h-1 rounded-full transition-all ${i === index ? 'w-4 bg-canvas' : 'w-1 bg-canvas/50'}`} />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="mt-3 sm:mt-4">
            {banner.ctaHref ? (
                /^https?:\/\//i.test(banner.ctaHref)
                    ? <a href={banner.ctaHref} target="_blank" rel="noopener noreferrer">{inner}</a>
                    : <Link to={banner.ctaHref}>{inner}</Link>
            ) : inner}
        </div>
    );
}

export default function ProductDetailPage() {
    const { id = '' }  = useParams();
    const navigate     = useNavigate();
    const location     = useLocation();
    const { product, loading } = useProduct(id);
    const { products } = useProducts();
    const { bundles } = useBundles();
    const { reviews, refetch: refetchReviews } = useReviews(id);
    const { banners: productBanners } = useBanners('product', product?.id);
    const { addToCart }                    = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { isAuthenticated, token }       = useAuth();
    const { showToast }                    = useToast();
    const { content }                      = useSiteContent();
    const trustBadges                      = getProductTrustBadges(content, product);

    const [selectedImage, setSelectedImage]    = useState(0);
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [quantity, setQuantity]              = useState(1);
    const [activeTab, setActiveTab]            = useState('Description');
    const [reviewError, setReviewError]        = useState('');
    const [reviewForm, setReviewForm]          = useState({ rating: 5, comment: '' });
    const [reviewImages, setReviewImages]      = useState([]); // [{file, previewUrl}]
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSubmitted, setReviewSubmitted]= useState(false);
    const [eligibility, setEligibility]        = useState({ loading: true, eligible: false, reason: null });
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

    // Recorded once per product (not per variant change) — "recently viewed"
    // tracks that the shopper looked at this product, not every click while
    // comparing pack sizes on the same page.
    useEffect(() => {
        if (product?.id) recordProductView(product.id);
    }, [product?.id]);

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

    // Only a signed-in customer who has actually bought this product can
    // review it — checked against the account's real order history on the
    // server, not just inferred client-side, but this fetch is what decides
    // whether the write-a-review form even appears.
    useEffect(() => {
        if (!product?.id) return undefined;
        if (!isAuthenticated) {
            setEligibility({ loading: false, eligible: false, reason: 'signed_out' });
            return undefined;
        }
        let cancelled = false;
        setEligibility((prev) => ({ ...prev, loading: true }));
        api.get(`/api/reviews/eligibility?productId=${encodeURIComponent(product.id)}`, token)
            .then((res) => { if (!cancelled) setEligibility({ loading: false, eligible: !!res.eligible, reason: res.reason || null }); })
            .catch(() => { if (!cancelled) setEligibility({ loading: false, eligible: false, reason: null }); });
        return () => { cancelled = true; };
    }, [product?.id, isAuthenticated, token]);

    useEffect(() => () => {
        reviewImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    }, [reviewImages]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-forest rounded-full animate-spin" aria-label="Loading product" />
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

    const handleReviewImagePick = (e) => {
        const files = Array.from(e.target.files || []).slice(0, MAX_REVIEW_IMAGES - reviewImages.length);
        if (files.length === 0) return;
        setReviewImages((prev) => [
            ...prev,
            ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
        ].slice(0, MAX_REVIEW_IMAGES));
        e.target.value = '';
    };

    const removeReviewImage = (previewUrl) => {
        setReviewImages((prev) => {
            const target = prev.find((p) => p.previewUrl === previewUrl);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((p) => p.previewUrl !== previewUrl);
        });
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setReviewError('');
        setSubmittingReview(true);
        try {
            let images = [];
            if (reviewImages.length > 0) {
                images = await api.uploadReviewImages(reviewImages.map((r) => r.file), token);
            }
            await api.post('/api/reviews', {
                productId: product.id,
                rating: reviewForm.rating,
                comment: reviewForm.comment,
                images,
            }, token);
            setReviewSubmitted(true);
            setReviewForm({ rating: 5, comment: '' });
            setReviewImages([]);
            refetchReviews();
            setEligibility({ loading: false, eligible: false, reason: 'already_reviewed' });
        } catch (err) {
            setReviewError(err instanceof Error ? err.message : 'Failed to submit review. Please try again.');
        } finally {
            setSubmittingReview(false);
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
                <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary mb-6 sm:mb-8 group transition-colors">
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
                        <p className="eyebrow text-muted mb-3">Product gallery</p>

                        <div className="relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-sand/40 shadow-lg mb-3 sm:mb-4 group">
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
                                        selectedImage === i ? 'border-primary shadow-sm scale-[1.03]' : 'border-transparent opacity-55 hover:opacity-90'
                                    }`}
                                    aria-label={`View image ${i + 1}`}
                                >
                                    <img src={imageUrl(img)} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>

                        {/* Admin-managed banner(s) for this product's page only —
                            separate slot from every homepage banner section. */}
                        <ProductBannerStrip banners={productBanners} />
                    </motion.div>

                    <motion.div
                        ref={buyBoxRef}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className="lg:sticky lg:top-[calc(var(--site-header-h,7rem)+1rem)] lg:self-start min-w-0"
                    >
                        <p className="eyebrow text-primary/75 mb-2 sm:mb-3 capitalize">{product.category}</p>
                        <h1 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-medium text-ink mb-4 sm:mb-5 leading-tight">{product.title}</h1>

                        {product.reviewCount > 0 && (
                            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                                <div className="flex gap-0.5" aria-label={`${product.rating} out of 5 stars`}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} size={14} className={i < Math.floor(product.rating) ? 'text-accent fill-accent' : 'text-line'} strokeWidth={0} />
                                    ))}
                                </div>
                                <span className="text-sm text-muted">{product.rating} ({product.reviewCount} reviews)</span>
                            </div>
                        )}

                        <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-line/60">
                            <span className="font-display text-2xl sm:text-3xl text-ink">{formatPrice(displayPrice)}</span>
                            {displayOriginalPrice > displayPrice && (
                                <span className="text-base sm:text-lg text-muted/50 line-through">{formatPrice(displayOriginalPrice)}</span>
                            )}
                            {displayDiscount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                    {displayDiscount}% off
                                </span>
                            )}
                        </div>

                        {hasVariants && (
                            <div className="mb-6 sm:mb-8">
                                <p className="eyebrow text-muted mb-3">Choose a Pack</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {variants.map((v) => {
                                        const active = v.id === activeVariant?.id;
                                        const sold = v.stock <= 0;
                                        const savings = v.originalPrice > v.price ? v.originalPrice - v.price : 0;
                                        const perDay = estimateDailyCost(v.label, v.price);
                                        return (
                                            <button
                                                key={v.id}
                                                type="button"
                                                disabled={sold}
                                                onClick={() => setSelectedVariantId(v.id)}
                                                className={`relative text-left px-4 py-4 rounded-2xl border-2 transition-all duration-200 flex flex-col ${
                                                    active
                                                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                                        : 'border-line/70 hover:border-primary/40'
                                                } ${sold ? 'opacity-45 cursor-not-allowed' : ''}`}
                                                aria-pressed={active}
                                            >
                                                {v.isDefault && !sold && (
                                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-ink text-[10px] font-semibold shadow-sm whitespace-nowrap">
                                                        <Sparkles size={10} /> RECOMMENDED
                                                    </span>
                                                )}

                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {v.image && (
                                                        <img
                                                            src={imageUrl(v.image)}
                                                            alt=""
                                                            className="w-9 h-9 rounded-lg object-cover border border-line/50 flex-shrink-0"
                                                        />
                                                    )}
                                                    <span className={`block text-sm font-semibold ${active ? 'text-primary' : 'text-ink'}`}>
                                                        {v.label}
                                                    </span>
                                                </div>
                                                {v.netQuantity && (
                                                    <span className="block text-xs text-muted/70 mt-1">{v.netQuantity}</span>
                                                )}

                                                <div className="mt-3 pt-3 border-t border-line/40">
                                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                                        <span className="font-display text-lg text-ink">{formatPrice(v.price)}</span>
                                                        {v.originalPrice > v.price && (
                                                            <span className="text-xs text-muted/50 line-through">{formatPrice(v.originalPrice)}</span>
                                                        )}
                                                        {v.discount > 0 && !sold && (
                                                            <span className="text-[10px] font-semibold text-accent-ink">{v.discount}% off</span>
                                                        )}
                                                    </div>
                                                    {savings > 0 && !sold && (
                                                        <p className="text-[11px] text-primary font-medium mt-1">Save {formatPrice(savings)} today</p>
                                                    )}
                                                    {perDay && !sold && (
                                                        <p className="text-[11px] text-muted/60 mt-0.5">≈ {formatPrice(perDay)}/day</p>
                                                    )}
                                                </div>
                                                {sold && <span className="block text-[11px] text-red-600 mt-2">Out of stock</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mb-6 sm:mb-8">
                            <div className="flex gap-0 border-b border-line/40 mb-4 sm:mb-5 overflow-x-auto">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3 sm:px-4 pb-3 eyebrow transition-all duration-300 border-b-2 -mb-px whitespace-nowrap ${
                                            activeTab === tab
                                                ? 'text-primary border-primary font-medium'
                                                : 'text-muted/60 border-transparent hover:text-muted'
                                        }`}
                                    >
                                        {tab}
                                        {tab === 'Reviews' && reviews.length > 0 && (
                                            <span className="ml-1.5 text-[11px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{reviews.length}</span>
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
                                        className="text-muted font-light leading-relaxed text-sm sm:text-base"
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
                                            <li key={feature} className="flex items-center gap-3 text-sm text-muted">
                                                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full flex-shrink-0" />
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
                                            <p className="text-muted/60 text-sm">No reviews yet. Be the first!</p>
                                        ) : (
                                            <div className="space-y-4 max-h-56 overflow-y-auto pr-2">
                                                {reviews.map((review) => (
                                                    <div key={review.id} className="border-b border-line/40 pb-4 last:border-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <p className="text-sm font-medium text-ink">{review.name}</p>
                                                            <div className="flex gap-0.5">
                                                                {Array.from({ length: 5 }).map((_, j) => (
                                                                    <Star key={j} size={11} className={j < review.rating ? 'text-accent fill-accent' : 'text-line'} strokeWidth={0} />
                                                                ))}
                                                            </div>
                                                            {review.isVerifiedPurchase && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/8 px-1.5 py-0.5 rounded-full">
                                                                    <ShieldCheck size={10} /> Verified Purchase
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-muted text-sm leading-relaxed">{review.comment}</p>
                                                        {review.images?.length > 0 && (
                                                            <div className="flex gap-2 mt-2">
                                                                {review.images.map((src) => (
                                                                    <a key={src} href={imageUrl(src)} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 rounded-lg overflow-hidden border border-line/50 flex-shrink-0">
                                                                        <img src={imageUrl(src)} alt="Customer photo" className="w-full h-full object-cover" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
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
                            <p className="text-sm text-primary/80 mb-5 font-medium">Only {displayStock} left in stock</p>
                        )}

                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <div className="flex items-center rounded-full border border-line/80 overflow-hidden">
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
                                className={`p-3 sm:p-3.5 rounded-full border transition-all duration-300 ${wished ? 'border-primary text-primary bg-primary/8' : 'border-line/80 hover:border-primary/40 hover:text-primary'}`}
                                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                            >
                                <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        <div className="hidden sm:flex flex-col sm:flex-row gap-3 mb-10">
                            <Button
                                variant="primary"
                                size="lg"
                                className="flex-1 bg-primary hover:bg-primary-hover text-canvas"
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
                                className="w-full bg-primary hover:bg-primary-hover text-canvas"
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
                                    <div key={label} className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-sand/40 border border-line/40 text-center">
                                        <Icon size={16} className="text-primary/70" />
                                        <span className="eyebrow text-muted leading-tight">{label}</span>
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

                <section className="mt-12 sm:mt-16 bg-canvas rounded-2xl p-5 sm:p-8 border border-line/40">
                    <h2 className="font-display text-xl sm:text-2xl mb-6 text-ink">Write a Review</h2>

                    {reviewSubmitted ? (
                        <p className="text-primary/80 font-light">Thank you! Your review has been submitted for approval.</p>
                    ) : eligibility.loading ? (
                        <div className="h-24 rounded-xl bg-sand/40 animate-pulse" aria-hidden="true" />
                    ) : eligibility.reason === 'already_reviewed' ? (
                        <p className="text-muted font-light">You have already reviewed this product — thank you for sharing your experience!</p>
                    ) : eligibility.reason === 'signed_out' ? (
                        <div className="max-w-lg">
                            <p className="text-muted font-light mb-4">Sign in and purchase this product to write a review — reviews here are only from verified buyers.</p>
                            <Link to={loginUrl(location.pathname)}>
                                <Button variant="turmeric">Sign In</Button>
                            </Link>
                        </div>
                    ) : eligibility.reason === 'not_purchased' ? (
                        <p className="text-muted font-light max-w-lg">
                            Only customers who have purchased this product can write a review. Once your order for {product.title} is placed, you will be able to share your experience here.
                        </p>
                    ) : eligibility.eligible ? (
                        <form onSubmit={handleReviewSubmit} className="space-y-4 max-w-lg">
                            <div className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/8 px-3 py-1.5 rounded-full mb-1">
                                <ShieldCheck size={13} /> Verified purchase
                            </div>
                            <div>
                                <label className="block text-xs tracking-[0.15em] uppercase text-muted mb-2">Rating</label>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: r })}
                                            className={reviewForm.rating >= r ? 'text-accent' : 'text-line'}
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
                                className="w-full px-4 py-3 border border-sand/60 rounded-lg resize-none bg-canvas focus:outline-none focus:ring-1 focus:ring-primary/30 text-ink placeholder:text-muted/40 font-light"
                                placeholder="Share your experience…"
                            />

                            <div>
                                <label className="block text-xs tracking-[0.15em] uppercase text-muted mb-2">
                                    Add photos <span className="normal-case text-muted/50">(optional, up to {MAX_REVIEW_IMAGES})</span>
                                </label>
                                <div className="flex flex-wrap gap-2.5">
                                    {reviewImages.map((img) => (
                                        <div key={img.previewUrl} className="relative w-16 h-16 rounded-lg overflow-hidden border border-line/50">
                                            <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeReviewImage(img.previewUrl)}
                                                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-ink/70 text-canvas hover:bg-ink"
                                                aria-label="Remove photo"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                    {reviewImages.length < MAX_REVIEW_IMAGES && (
                                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-muted/50 hover:border-primary/40 hover:text-primary cursor-pointer transition-colors">
                                            <Camera size={16} />
                                            <span className="text-[9px]">Add</span>
                                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleReviewImagePick} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {reviewError && (
                                <p className="text-red-600 text-sm" role="alert">{reviewError}</p>
                            )}
                            <Button variant="turmeric" type="submit" disabled={submittingReview}>
                                {submittingReview ? 'Submitting…' : 'Submit Review'}
                            </Button>
                        </form>
                    ) : (
                        <p className="text-muted/60 text-sm">Reviews are open to verified buyers only.</p>
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

                <RecentlyViewed excludeId={product.id} className="mt-16 sm:mt-20" />
            </div>

            {/* Sticky mobile buy bar */}
            <AnimatePresence>
                {showMobileBar && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-canvas/95 backdrop-blur-md border-t border-line/60 px-4 py-3 safe-area-pb"
                    >
                        <div className="max-w-7xl mx-auto flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted line-clamp-1">
                                    {product.title}{activeVariant ? ` — ${activeVariant.label}` : ''}
                                </p>
                                <p className="font-display text-lg text-primary">{formatPrice(displayPrice)}</p>
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
