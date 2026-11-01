import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Heart, ShoppingBag, Star } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import FadeImage from '@/components/ui/FadeImage';
import Price from '@/components/ui/Price';
import ClubPrice from '@/components/product/ClubPrice';
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
    ].slice(0, 1); // one badge only: a calmer card
}

/** One short line on what the product is for: its first listed benefit, else the first sentence of its description. */
function oneLiner(product) {
    const first = (product.features ?? []).find(Boolean);
    if (first) return String(first).slice(0, 90);
    const plain = String(product.description ?? '').replace(/\s+/g, ' ').trim();
    const end = plain.search(/[.!?](\s|$)/);
    return (end > 12 ? plain.slice(0, end) : plain).slice(0, 90);
}

/**
 * The product tile used across the shop: picture, name, one-line benefit, rating, price, Club price and a full-width Add to bag.
 * `action={false}` hides the button where the page brings its own (Buy 1 Get 1).
 */
function ProductCard({ product, priority = false, action = true }) {
    const { addToCart, isMember } = useCart();
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

    const showPrice = isMember && product.memberPrice ? product.memberPrice : product.price;
    const wasPrice = isMember && product.memberPrice ? product.price : product.originalPrice;

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line transition-shadow duration-300 hover:shadow-md">
            <div className="relative aspect-[4/5] overflow-hidden bg-canvas-alt">
                <Link to={href} tabIndex={-1} aria-hidden="true" className="block size-full">
                    <FadeImage
                        src={imageUrl(primary, 480)}
                        alt=""
                        width="480"
                        height="600"
                        instant={priority}
                        loading={priority ? 'eager' : 'lazy'}
                        decoding="async"
                        className={cn('size-full object-contain mix-blend-multiply transition-[transform,opacity] duration-500 group-hover:scale-[1.04]', secondary && 'group-hover:opacity-0')}
                    />
                    {secondary && (
                        <img src={imageUrl(secondary, 480)} alt="" width="480" height="600" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-[1.04] object-contain mix-blend-multiply opacity-0 transition-[transform,opacity] duration-500 group-hover:scale-100 group-hover:opacity-100" />
                    )}
                </Link>

                <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
                    {badgesFor(product).map((b) => <Badge key={b.label} variant={b.variant}>{b.label}</Badge>)}
                </div>

                <button
                    type="button"
                    onClick={handleWishlist}
                    aria-pressed={wished}
                    aria-label={wished ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
                    className={cn('absolute right-1 top-1 z-10 grid size-11 place-items-center rounded-full transition-colors', wished ? 'text-primary' : 'text-muted hover:text-primary')}
                >
                    <span className="grid size-8 place-items-center rounded-full bg-surface/95 shadow-xs"><Heart size={16} fill={wished ? 'currentColor' : 'none'} /></span>
                </button>
            </div>

            <div className="flex flex-1 flex-col p-3 sm:p-4">
                <h3 className="font-sans text-small font-medium leading-snug text-ink sm:text-[0.9375rem]">
                    <Link to={href} className="line-clamp-2 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {product.title}
                    </Link>
                </h3>
                {oneLiner(product) && <p className="mt-1 line-clamp-1 text-caption text-muted">{oneLiner(product)}</p>}
                {product.reviewCount > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-caption text-muted" aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}>
                        <Star size={13} strokeWidth={0} className="fill-star" aria-hidden="true" />
                        <span className="font-semibold text-ink">{Number(product.rating).toFixed(1)}</span>
                        <span>({product.reviewCount})</span>
                    </p>
                )}
                <div className="mt-auto pt-2">
                    <Price price={showPrice} originalPrice={wasPrice} />
                    <ClubPrice memberPrice={product.memberPrice} compact className="relative z-10 mt-1.5" />
                </div>
                {action && (
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={outOfStock || added}
                        aria-label={outOfStock ? `${product.title} is sold out` : `Add ${product.title} to bag`}
                        className={cn(
                            'relative z-10 mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border text-small font-semibold transition-colors sm:h-11',
                            added ? 'border-success bg-success text-white' : 'border-primary text-primary hover:bg-primary hover:text-white',
                            'disabled:cursor-not-allowed',
                            outOfStock && 'border-line-strong text-subtle hover:bg-transparent hover:text-subtle',
                        )}
                    >
                        {added ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
                        {outOfStock ? 'Sold out' : added ? 'Added' : 'Add to bag'}
                    </button>
                )}
            </div>
        </article>
    );
}

export default memo(ProductCard);
