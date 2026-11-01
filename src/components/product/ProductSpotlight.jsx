import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShoppingBag, Star } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import FadeImage from '@/components/ui/FadeImage';
import Price from '@/components/ui/Price';
import ClubPrice from '@/components/product/ClubPrice';
import { useCart } from '@/contexts/CartContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';

/** First sentence of the description, so the card says what the product is for without becoming a paragraph. */
function oneLiner(text) {
    const plain = String(text ?? '').replace(/\s+/g, ' ').trim();
    const end = plain.search(/[.!?](\s|$)/);
    return (end > 20 ? plain.slice(0, end + 1) : plain).slice(0, 140);
}

/**
 * A wide product card for a category that has only one or two products. A single narrow card in a wide row looks
 * unfinished; this one uses the room to show the picture, a line about it and the buy button together.
 */
function ProductSpotlight({ product }) {
    const { addToCart, isMember } = useCart();
    const { showToast } = useToast();
    const [added, setAdded] = useState(false);
    const outOfStock = typeof product.stock === 'number' && product.stock <= 0;
    const href = `/product/${product.id}`;
    const badge = (product.isBestSeller && 'Best Seller') || (product.isNew && 'New') || null;
    const benefits = (product.features ?? []).filter(Boolean).slice(0, 3);
    const line = oneLiner(product.description);

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

    return (
        <article className="group relative flex h-full min-h-[15rem] overflow-hidden rounded-lg bg-surface ring-1 ring-line lg:min-h-[18rem]">
            <div className="relative w-[42%] shrink-0 bg-canvas-alt">
                <Link to={href} tabIndex={-1} aria-hidden="true" className="block size-full">
                    <FadeImage src={imageUrl(product.images?.[0], 480)} alt="" width="480" height="600" loading="lazy" decoding="async" className="size-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                </Link>
                {badge && <Badge variant={badge === 'New' ? 'new' : 'bestseller'} className="absolute left-3 top-3">{badge}</Badge>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
                <h3 className="font-sans text-[1rem] font-semibold leading-snug sm:text-lead">
                    <Link to={href} className="transition-colors hover:text-primary">{product.title}</Link>
                </h3>
                {product.reviewCount > 0 && (
                    <p className="flex items-center gap-1 text-caption text-muted" aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}>
                        <Star size={13} strokeWidth={0} className="fill-accent" aria-hidden="true" />
                        <span className="font-semibold text-ink">{Number(product.rating).toFixed(1)}</span>
                        <span>({product.reviewCount})</span>
                    </p>
                )}
                {line && <p className="line-clamp-2 text-small text-muted max-sm:hidden">{line}</p>}
                {benefits.length > 0 && (
                    <ul className="hidden gap-1 text-small text-ink lg:grid">
                        {benefits.map((b) => <li key={b} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /><span className="line-clamp-1">{b}</span></li>)}
                    </ul>
                )}
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Price price={isMember && product.memberPrice ? product.memberPrice : product.price} originalPrice={isMember && product.memberPrice ? product.price : product.originalPrice} />
                </div>
                <ClubPrice memberPrice={product.memberPrice} compact className="self-start" />
                <div className="mt-1 flex flex-wrap gap-2">
                    <Button onClick={handleAdd} disabled={outOfStock || added} className="max-sm:px-4">
                        {added ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
                        {outOfStock ? 'Sold out' : added ? 'Added' : 'Add to bag'}
                    </Button>
                    <Link to={href} className="inline-flex min-h-11 items-center px-2 text-small font-medium text-primary hover:underline">View details</Link>
                </div>
            </div>
        </article>
    );
}

export default memo(ProductSpotlight);
