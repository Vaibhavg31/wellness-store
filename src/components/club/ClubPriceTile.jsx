import { Link } from 'react-router-dom';
import { Crown, ShoppingBag } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * One product with its two prices side by side: the usual price and the Chikit Club price, and the rupees the Club saves.
 * A member sees the same tile worded as "Your price" and can add the product straight to the bag; anyone else gets a button
 * to join the Chikit Club instead (the member price only applies once they have joined).
 * No percentage is quoted; the difference is shown in rupees.
 */
export default function ClubPriceTile({ product, member = false, active = false, joinHref = '/club#join', className }) {
    const { addToCart, openCartDrawer } = useCart();
    const { showToast } = useToast();
    const saving = product.price - product.memberPrice;
    const soldOut = typeof product.stock === 'number' && product.stock <= 0;

    const add = () => {
        if (addToCart(product, 1)) openCartDrawer();
        else showToast('Sorry, this product is out of stock', 'error');
    };
    const buttonClass = 'mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 text-caption font-semibold transition-colors min-[420px]:gap-1.5 min-[420px]:text-small';

    return (
        <div className={cn('flex h-full flex-col overflow-hidden rounded-2xl bg-surface p-3 text-ink shadow-sm ring-2 transition-shadow hover:shadow-md', active ? 'ring-accent' : 'ring-transparent', className)}>
            <Link to={`/product/${product.id}`} className="group flex flex-1 flex-col">
                <span className="block aspect-square overflow-hidden rounded-xl bg-accent-tint">
                    <img src={imageUrl(product.images[0], 320)} alt="" width="240" height="240" loading="lazy" decoding="async" className="size-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                </span>
                <span className="mt-3 line-clamp-2 min-h-[2.5rem] text-small font-semibold leading-snug">{product.title}</span>
                <span className="mt-2 space-y-1.5 border-t border-line pt-2">
                    <span className="flex items-baseline justify-between gap-2">
                        <span className="text-caption text-muted">Usual price</span>
                        <span className="text-small text-muted line-through">{formatPrice(product.price)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-caption font-semibold text-primary"><Crown size={12} aria-hidden="true" /> {member ? 'Your price' : 'Chikit Club'}</span>
                        <span className="text-lead font-semibold leading-none text-primary">{formatPrice(product.memberPrice)}</span>
                    </span>
                </span>
                <span className="mt-2.5 rounded-full bg-success-tint px-2.5 py-1 text-center text-caption font-semibold text-success">{member ? 'You save' : 'Save'} {formatPrice(saving)}</span>
            </Link>
            {member ? (
                <button type="button" onClick={add} disabled={soldOut} className={cn(buttonClass, 'bg-primary text-white hover:bg-primary-hover disabled:bg-disabled disabled:text-subtle')}>
                    <ShoppingBag size={15} aria-hidden="true" /> {soldOut ? 'Sold out' : 'Add to bag'}
                </button>
            ) : joinHref.startsWith('#') ? (
                <a href={joinHref} className={cn(buttonClass, 'bg-accent text-primary-deep hover:bg-accent-hover')}><Crown size={15} className="text-primary" aria-hidden="true" /> Join Chikit Club</a>
            ) : (
                <Link to={joinHref} className={cn(buttonClass, 'bg-accent text-primary-deep hover:bg-accent-hover')}><Crown size={15} className="text-primary" aria-hidden="true" /> Join Chikit Club</Link>
            )}
        </div>
    );
}
