import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Heart, Plus, Star } from 'lucide-react';
import FadeImage from '@/components/ui/FadeImage';
import Price from '@/components/commerce/Price';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

/** One badge only, the most useful one: sold out, then New, then Best seller. A calm card says one thing. */
function badgeFor(product, outOfStock) {
    if (outOfStock) return { label: 'Sold out', tone: 'bg-ink text-white' };
    if (product.isNew) return { label: 'New', tone: 'bg-primary text-white' };
    if (product.isBestSeller) return { label: 'Bestseller', tone: 'bg-accent text-primary-deep' };
    return null;
}

/** One short line on what the product is for: its first listed benefit, else the first sentence of its description. */
function oneLiner(product) {
    const first = (product.features ?? []).find(Boolean);
    if (first) return String(first).slice(0, 80);
    const plain = String(product.description ?? '').replace(/\s+/g, ' ').trim();
    const end = plain.search(/[.!?](\s|$)/);
    return (end > 12 ? plain.slice(0, end) : plain).slice(0, 80);
}

/**
 * The product tile used across the shop. A soft beige picture tile with one badge, a heart, and a round "+" that drops the product
 * in the bag without leaving the page; under it the name, one line on what it is for, the rating and the price (member aware).
 * `action={false}` hides the "+" where the page brings its own button.
 */
function ProductCard({ product, priority = false, action = true }) {
    const { addToCart } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { showToast } = useToast();
    const [added, setAdded] = useState(false);

    const wished = isInWishlist(product.id);
    const outOfStock = typeof product.stock === 'number' && product.stock <= 0;
    const [primary, secondary] = product.images ?? [];
    const href = `/product/${product.id}`;
    const badge = badgeFor(product, outOfStock);
    const line = oneLiner(product);

    const handleAdd = () => {
        if (outOfStock) return;
        if (addToCart(product)) {
            showCartToast(showToast, product);
            setAdded(true);
            setTimeout(() => setAdded(false), 1600);
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
        }
    };

    const handleWishlist = () => {
        toggleWishlist(product);
        showToast(wished ? 'Removed from wishlist' : 'Saved to wishlist', wished ? 'info' : 'success');
    };

    return (
        <article className="group relative flex h-full flex-col">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-accent-tint ring-1 ring-line/70 transition-shadow duration-300 group-hover:shadow-md">
                <Link to={href} tabIndex={-1} aria-hidden="true" className="block size-full">
                    <FadeImage
                        src={imageUrl(primary, 480)}
                        alt=""
                        width="480"
                        height="600"
                        instant={priority}
                        loading={priority ? 'eager' : 'lazy'}
                        decoding="async"
                        className={cn('size-full object-contain mix-blend-multiply transition-[transform,opacity] duration-500 group-hover:scale-[1.05]', secondary && 'group-hover:opacity-0')}
                    />
                    {secondary && (
                        <img src={imageUrl(secondary, 480)} alt="" width="480" height="600" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-[1.05] object-contain mix-blend-multiply opacity-0 transition-[transform,opacity] duration-500 group-hover:scale-100 group-hover:opacity-100" />
                    )}
                </Link>

                {badge && <span className={cn('absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', badge.tone)}>{badge.label}</span>}

                <button
                    type="button"
                    onClick={handleWishlist}
                    aria-pressed={wished}
                    aria-label={wished ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
                    className="absolute right-1.5 top-1.5 z-10 grid size-11 place-items-center"
                >
                    <span className={cn('grid size-9 place-items-center rounded-full bg-surface/95 shadow-xs transition-colors', wished ? 'text-primary' : 'text-muted group-hover:text-primary')}><Heart size={17} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" /></span>
                </button>

                {action && !outOfStock && (
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={added}
                        aria-label={`Add ${product.title} to bag`}
                        className="absolute bottom-1.5 right-1.5 z-10 grid size-12 place-items-center"
                    >
                        <span className={cn('grid size-10 place-items-center rounded-full shadow-md transition-all duration-200 group-hover:scale-105', added ? 'bg-success text-white' : 'bg-primary text-white hover:bg-primary-hover')}>
                            {added ? <Check size={18} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
                        </span>
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-col pt-3.5">
                <h3 className="font-sans text-small font-semibold leading-snug text-ink sm:text-[0.9375rem]">
                    <Link to={href} className="line-clamp-2 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {product.title}
                    </Link>
                </h3>
                {line && <p className="mt-1 line-clamp-1 text-caption text-muted">{line}</p>}
                {product.reviewCount > 0 && (
                    <p className="mt-1.5 flex items-center gap-1 text-caption text-muted" aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}>
                        <Star size={13} strokeWidth={0} className="fill-star" aria-hidden="true" />
                        <span className="font-bold text-ink">{Number(product.rating).toFixed(1)}</span>
                        <span>({product.reviewCount})</span>
                    </p>
                )}
                <div className="relative z-10 mt-auto pt-2.5">
                    <Price item={product} title={product.title} size="sm" compact />
                </div>
            </div>
        </article>
    );
}

export default memo(ProductCard);
