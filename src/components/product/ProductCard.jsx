import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Heart, ShoppingBag } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import FadeImage from '@/components/ui/FadeImage';
import Price from '@/components/ui/Price';
import Rating from '@/components/ui/Rating';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const TAG_VARIANTS = { New: 'new', 'Best Seller': 'bestseller', Sale: 'sale', Limited: 'sale' };

function badgesFor(product) {
    const tags = product.tags ?? [];
    return [
        ...tags.map((label) => ({ label, variant: TAG_VARIANTS[label] || 'default' })),
        ...(product.isNew && !tags.includes('New') ? [{ label: 'New', variant: 'new' }] : []),
        ...(product.isBestSeller && !tags.includes('Best Seller') ? [{ label: 'Best Seller', variant: 'bestseller' }] : []),
        ...(product.discount > 0 && !tags.includes('Sale') ? [{ label: `-${product.discount}%`, variant: 'sale' }] : []),
    ].slice(0, 2);
}

function ProductCard({ product, priority = false }) {
    const { addToCart } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { showToast } = useToast();
    const [added, setAdded] = useState(false);

    const wished = isInWishlist(product.id);
    const outOfStock = typeof product.stock === 'number' && product.stock <= 0;
    const [primary, secondary] = product.images ?? [];
    const href = `/product/${product.id}`;

    const handleAdd = () => {
        if (outOfStock) return showToast('Out of stock', 'error');
        if (addToCart(product)) {
            showCartToast(showToast, product);
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
        }
        return undefined;
    };

    const handleWishlist = () => {
        toggleWishlist(product);
        showToast(wished ? 'Removed from wishlist' : 'Saved to wishlist', wished ? 'info' : 'success');
    };

    return (
        <article className="group relative flex h-full flex-col">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-canvas-alt">
                <Link to={href} tabIndex={-1} aria-hidden="true" className="block size-full">
                    <FadeImage
                        src={imageUrl(primary, 480)}
                        alt=""
                        width="480"
                        height="600"
                        instant={priority}
                        loading={priority ? 'eager' : 'lazy'}
                        decoding="async"
                        className={cn('size-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-105', secondary && 'group-hover:opacity-0')}
                    />
                    {secondary && (
                        <img src={imageUrl(secondary, 480)} alt="" width="480" height="600" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-105 object-cover opacity-0 transition-[transform,opacity] duration-500 group-hover:scale-100 group-hover:opacity-100" />
                    )}
                </Link>

                <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                    {badgesFor(product).map((b) => <Badge key={b.label} variant={b.variant}>{b.label}</Badge>)}
                </div>

                <button
                    type="button"
                    onClick={handleWishlist}
                    aria-pressed={wished}
                    aria-label={wished ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
                    className={cn('absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-surface/95 shadow-xs transition-colors hover:bg-surface', wished ? 'text-primary' : 'text-muted hover:text-primary')}
                >
                    <Heart size={18} fill={wished ? 'currentColor' : 'none'} />
                </button>

                {outOfStock && (
                    <span className="absolute inset-x-3 bottom-3 rounded-full bg-surface/95 py-1.5 text-center text-caption font-semibold text-ink">Sold out</span>
                )}
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={outOfStock || added}
                    aria-label={`Add ${product.title} to bag`}
                    className={cn(
                        'absolute bottom-3 right-3 z-10 grid size-11 place-items-center rounded-full text-white shadow-md transition-[opacity,transform,background-color] duration-300',
                        'opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100',
                        added ? 'bg-success' : 'bg-primary hover:bg-primary-hover',
                        'disabled:bg-disabled disabled:text-subtle',
                    )}
                >
                    {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 pt-3">
                <h3 className="font-sans text-body font-medium leading-snug">
                    <Link to={href} className="line-clamp-2 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {product.title}
                    </Link>
                </h3>
                {product.reviewCount > 0 && <Rating value={product.rating} count={product.reviewCount} size={13} />}
                <Price price={product.price} originalPrice={product.originalPrice} className="mt-auto" />
            </div>

        </article>
    );
}

export default memo(ProductCard);
