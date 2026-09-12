import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Star, Check } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import Badge from '@/components/ui/Badge';

const TAG_VARIANTS = {
    New:          'new',
    'Best Seller':'bestseller',
    Sale:         'sale',
    Limited:      'sale',
};

function ProductCard({ product, compact = false, index = 0 }) {
    const { addToCart }                    = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { showToast }                    = useToast();
    const [hovered, setHovered]            = useState(false);
    const [justAdded, setJustAdded]        = useState(false);
    const [heartPulse, setHeartPulse]      = useState(false);

    const wished      = isInWishlist(product.id);
    const outOfStock  = typeof product.stock === 'number' && product.stock <= 0;
    const displayImage= hovered && product.images.length > 1 ? product.images[1] : product.images[0];

    const badges = [
        ...product.tags.map((tag) => ({ label: tag, variant: TAG_VARIANTS[tag] || 'default' })),
        ...(product.isNew        && !product.tags.includes('New')         ? [{ label: 'New',         variant: 'new'        }] : []),
        ...(product.isBestSeller && !product.tags.includes('Best Seller') ? [{ label: 'Best Seller', variant: 'bestseller'}] : []),
        ...(product.discount > 0 && !product.tags.includes('Sale')        ? [{ label: `-${product.discount}%`, variant: 'sale' }] : []),
    ];

    const handleAdd = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (outOfStock) {
            showToast('Out of stock', 'error');
            return;
        }
        if (addToCart(product)) {
            showCartToast(showToast, product);
            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 1800);
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
        }
    };

    const handleWishlist = (e) => {
        e.preventDefault();
        toggleWishlist(product);
        setHeartPulse(true);
        setTimeout(() => setHeartPulse(false), 400);
        showToast(wished ? 'Removed from wishlist' : 'Saved to wishlist', wished ? 'info' : 'success');
    };

    if (compact) {
        return (
            <motion.article
                className="group flex flex-col h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.32), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="relative overflow-hidden bg-warm-beige/60 rounded-lg border border-border/40 mb-2 transition-all duration-300 group-hover:border-wine/25 group-hover:shadow-md">
                    {badges[0] && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                            <Badge variant={badges[0].variant} className="!text-[8px] !px-1.5 !py-0.5 scale-90 origin-top-left">
                                {badges[0].label}
                            </Badge>
                        </div>
                    )}

                    <motion.button
                        type="button"
                        onClick={handleWishlist}
                        animate={heartPulse ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className={`absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-ivory/90 shadow-sm transition-colors ${wished ? 'text-wine' : 'text-soft-brown/70 hover:text-wine'}`}
                        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        <Heart size={11} strokeWidth={1.5} fill={wished ? 'currentColor' : 'none'} />
                    </motion.button>

                    <Link
                        to={`/product/${product.id}`}
                        className="block aspect-square overflow-hidden"
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        <img
                            src={imageUrl(displayImage)}
                            alt={product.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </Link>

                    {outOfStock && (
                        <div className="absolute inset-0 bg-charcoal/30 flex items-center justify-center">
                            <span className="type-eyebrow-sm bg-ivory px-2 py-1 rounded-full text-charcoal">Sold Out</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={outOfStock || justAdded}
                        className={`absolute bottom-1.5 right-1.5 z-10 p-2 rounded-full shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 disabled:opacity-50 ${
                            justAdded ? 'bg-emerald text-ivory' : 'bg-wine text-ivory hover:bg-wine-light'
                        }`}
                        aria-label="Add to bag"
                    >
                        {justAdded ? <Check size={12} strokeWidth={2} /> : <ShoppingBag size={12} strokeWidth={1.5} />}
                    </button>
                </div>

                <div className="px-0.5 space-y-0.5 flex-1">
                    <Link to={`/product/${product.id}`}>
                        <h3 className="text-xs sm:text-sm text-charcoal leading-snug line-clamp-2 group-hover:text-wine transition-colors font-normal">
                            {product.title}
                        </h3>
                    </Link>
                    {product.reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                            <Star size={9} className="text-gold fill-gold flex-shrink-0" strokeWidth={0} />
                            <span className="text-xs text-soft-brown">{product.rating}</span>
                        </div>
                    )}
                    <div className="flex items-baseline gap-1.5 pt-0.5">
                        <span className="text-xs sm:text-sm font-medium text-charcoal">{formatPrice(product.price)}</span>
                        {product.originalPrice > product.price && (
                            <span className="text-xs text-soft-brown/45 line-through">{formatPrice(product.originalPrice)}</span>
                        )}
                    </div>
                </div>
            </motion.article>
        );
    }

    return (
        <motion.div
            className="group h-full flex flex-col"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="relative overflow-hidden bg-warm-beige rounded-xl sm:rounded-2xl border border-border/30 mb-3 sm:mb-4 transition-all duration-500 group-hover:border-wine/20 group-hover:luxury-shadow-hover">
                <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-10 flex flex-col gap-1.5 sm:gap-2">
                    {badges.slice(0, 2).map((badge) => (
                        <Badge key={badge.label} variant={badge.variant}>{badge.label}</Badge>
                    ))}
                </div>

                <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300">
                    <motion.button
                        type="button"
                        onClick={handleWishlist}
                        animate={heartPulse ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className={`p-2 sm:p-2.5 rounded-full bg-ivory/95 shadow-sm backdrop-blur-sm transition-colors ${wished ? 'text-wine' : 'text-soft-brown hover:text-wine'}`}
                        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        <Heart size={14} strokeWidth={1.25} fill={wished ? 'currentColor' : 'none'} />
                    </motion.button>
                </div>

                <Link
                    to={`/product/${product.id}`}
                    className="block aspect-[3/4] overflow-hidden"
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    <img
                        src={imageUrl(displayImage)}
                        alt={product.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                </Link>

                {outOfStock && (
                    <div className="absolute inset-0 bg-charcoal/35 flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1.5 rounded-full bg-ivory type-eyebrow-sm text-charcoal">Sold Out</span>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300">
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={outOfStock || justAdded}
                        className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full type-eyebrow-sm font-medium transition-colors disabled:opacity-60 shadow-lg ${
                            justAdded
                                ? 'bg-emerald text-ivory shadow-emerald/20'
                                : 'bg-wine text-ivory hover:bg-wine-light shadow-wine/20'
                        }`}
                    >
                        <AnimatePresence mode="wait">
                            {justAdded ? (
                                <motion.span key="added" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
                                    <Check size={13} strokeWidth={2} /> Added
                                </motion.span>
                            ) : (
                                <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
                                    <ShoppingBag size={13} strokeWidth={1.25} />
                                    {outOfStock ? 'Sold Out' : 'Add to Bag'}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </div>

            <div className="space-y-1 px-0.5 flex-1 flex flex-col">
                <p className="type-eyebrow-sm text-wine/65 capitalize">{product.category}</p>
                <Link to={`/product/${product.id}`}>
                    <h3 className="font-serif text-[15px] sm:text-lg font-light text-charcoal hover:text-wine transition-colors line-clamp-2 leading-snug">
                        {product.title}
                    </h3>
                </Link>
                {product.reviewCount > 0 && (
                    <div className="flex items-center gap-1">
                        <Star size={10} className="text-gold fill-gold" strokeWidth={0} />
                        <span className="text-xs text-soft-brown">{product.rating} · {product.reviewCount}</span>
                    </div>
                )}
                <div className="flex items-baseline gap-2 pt-0.5 mt-auto">
                    <span className="font-serif text-base sm:text-lg text-charcoal">{formatPrice(product.price)}</span>
                    {product.originalPrice > product.price && (
                        <span className="text-xs text-soft-brown/50 line-through">{formatPrice(product.originalPrice)}</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default memo(ProductCard);
