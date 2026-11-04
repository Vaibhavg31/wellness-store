import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { MAX_PER_ITEM, useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/formatPrice';

/**
 * The one buying button. "Add to bag" puts the product in the bag and, right there, turns into a quantity stepper
 * (− 2 +) tied to that bag line, so the shopper never hunts for a separate quantity box. Taking it down to 0 removes it, and the
 * button comes back. One item is capped at MAX_PER_ITEM (9) and at what is in stock. Works for a plain product at its chosen pack
 * size (pass `product` with `variantId` when a pack is selected).
 *  - size "card":  the compact full-width button of a product tile
 *  - size "large": the tall button of the product page
 *  - tone "dark":  a beige button for use on a plum card
 */
export default function AddToBag({ product, size = 'card', tone = 'light', soldOutLabel = 'Sold out', className, onFirstAdd }) {
    const { addToCart, quantityInBag, plainLineFor, updateQuantity } = useCart();
    const { showToast } = useToast();
    const qty = quantityInBag(product);
    const stock = typeof product.stock === 'number' ? product.stock : Infinity;
    const outOfStock = stock <= 0;
    const limit = Math.min(MAX_PER_ITEM, stock);
    const line = plainLineFor(product);
    const tall = size === 'large';
    const height = tall ? 'h-12' : 'h-10';
    const dark = tone === 'dark';

    const add = () => {
        if (outOfStock) { showToast('This item is out of stock', 'error'); return; }
        if (addToCart(product, 1)) onFirstAdd?.();
        else showToast(`You can order up to ${MAX_PER_ITEM} of one item`, 'error');
    };
    const change = (next) => updateQuantity(product.id, next, { variantId: line?.product.variantId ?? product.variantId ?? null });

    if (qty > 0) {
        const atMax = qty >= limit;
        const btn = cn('grid shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40 disabled:hover:bg-transparent', dark ? 'hover:bg-primary/10' : 'text-white hover:bg-white/15', tall ? 'size-12' : 'size-10');
        return (
            <div className={cn('relative z-10', className)}>
                <div className={cn('flex w-full items-center justify-between rounded-full shadow-xs', dark ? 'bg-accent text-primary-deep' : 'bg-primary text-white', height)} role="group" aria-label={`${product.title} quantity in your bag`}>
                    <button type="button" className={btn} onClick={() => change(qty - 1)} aria-label={qty === 1 ? `Remove ${product.title} from bag` : 'Decrease quantity'}><Minus size={tall ? 18 : 16} aria-hidden="true" /></button>
                    <span className="flex flex-col items-center leading-none" aria-live="polite">
                        <span className={cn('font-semibold tabular-nums', tall ? 'text-body' : 'text-small')}>{qty}</span>
                        {tall && <span className={cn('mt-0.5 text-[11px] font-medium', dark ? 'text-primary-deep/70' : 'text-white/80')}>in your bag</span>}
                    </span>
                    <button type="button" className={btn} onClick={() => change(qty + 1)} disabled={atMax} aria-label={atMax ? `Maximum ${limit} reached` : 'Increase quantity'}><Plus size={tall ? 18 : 16} aria-hidden="true" /></button>
                </div>
                {tall && atMax && <p className="mt-1.5 text-center text-caption text-muted">{limit >= MAX_PER_ITEM ? `You can order up to ${MAX_PER_ITEM} of one item.` : `Only ${limit} left in stock.`}</p>}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={add}
            disabled={outOfStock}
            aria-label={outOfStock ? `${product.title} is sold out` : `Add ${product.title} to bag`}
            className={cn(
                'relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-full border font-semibold transition-colors',
                dark
                    ? cn('border-accent bg-accent text-primary-deep hover:bg-accent-hover', tall ? 'h-12 text-body' : 'h-10 text-small')
                    : tall ? 'h-12 border-primary bg-primary text-body text-white hover:bg-primary-hover' : 'h-10 border-primary/40 text-small text-primary hover:border-primary hover:bg-primary hover:text-white',
                'disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-transparent disabled:text-subtle disabled:hover:bg-transparent disabled:hover:text-subtle',
                className,
            )}
        >
            <ShoppingBag size={tall ? 18 : 16} aria-hidden="true" /> {outOfStock ? soldOutLabel : 'Add to bag'}
        </button>
    );
}
