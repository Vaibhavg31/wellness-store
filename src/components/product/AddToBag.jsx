import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { MAX_PER_ITEM, useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/formatPrice';

/**
 * The quantity stepper every "Add to bag" turns into: a soft plum-tinted track with a round white − button, the count, and a round solid
 * plum + button. Also used by sets (Buy 1 Get 1), where `unit` names what is counted.
 */
export function QuantityStepper({ qty, max, onChange, title = 'item', size = 'card', tone = 'light', caption = 'in your bag', removeLabel }) {
    const tall = size === 'large';
    const atMax = qty >= max;
    // The card stepper is slimmer on a desktop mouse (36px high, 28px buttons); on a phone it keeps the 40px / 32px touch size.
    const btn = cn('grid shrink-0 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', tall ? 'size-10' : 'size-8 lg:size-7');
    const icon = cn(!tall && 'lg:size-3.5');
    return (
        <div className={cn('flex w-full items-center justify-between rounded-full border px-1', tone === 'dark' ? 'border-accent bg-accent' : 'border-primary/25 bg-primary-tint', tall ? 'h-12' : 'h-10 lg:h-9')} role="group" aria-label={`${title} quantity in your bag`}>
            <button type="button" className={cn(btn, 'bg-white text-primary shadow-xs ring-1 ring-primary/15 hover:bg-primary hover:text-white')} onClick={() => onChange(qty - 1)} aria-label={qty === 1 ? (removeLabel ?? `Remove ${title} from bag`) : 'Decrease quantity'}><Minus size={tall ? 18 : 15} strokeWidth={2.5} className={icon} aria-hidden="true" /></button>
            <span className="flex flex-col items-center leading-none text-primary" aria-live="polite">
                <span className={cn('font-semibold tabular-nums', tall ? 'text-lead' : 'text-body lg:text-small')}>{qty}</span>
                {tall && caption && <span className="mt-0.5 text-[11px] font-medium text-primary/70">{caption}</span>}
            </span>
            <button type="button" className={cn(btn, 'bg-primary text-white shadow-xs hover:bg-primary-hover disabled:hover:bg-primary')} onClick={() => onChange(qty + 1)} disabled={atMax} aria-label={atMax ? `Maximum ${max} reached` : 'Increase quantity'}><Plus size={tall ? 18 : 15} strokeWidth={2.5} className={icon} aria-hidden="true" /></button>
        </div>
    );
}

/**
 * The one buying button. "Add to bag" puts the product in the bag and, right there, turns into a quantity stepper
 * (− 2 +) tied to that bag line, so the shopper never hunts for a separate quantity box. Taking it down to 0 removes it, and the
 * button comes back. One item is capped at MAX_PER_ITEM (9) and at what is in stock. Works for a plain product at its chosen pack
 * size (pass `product` with `variantId` when a pack is selected).
 *  - size "card":  the compact full-width button of a product tile
 *  - size "large": the tall button of the product page
 *  - tone "dark":  a beige button for use on a plum card (every other tone is the one solid plum button, so "Add to bag" looks the same everywhere)
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
    const dark = tone === 'dark';

    const add = () => {
        if (outOfStock) { showToast('This item is out of stock', 'error'); return; }
        if (addToCart(product, 1)) onFirstAdd?.();
        else showToast(`You can order up to ${MAX_PER_ITEM} of one item`, 'error');
    };
    const change = (next) => updateQuantity(product.id, next, { variantId: line?.product.variantId ?? product.variantId ?? null });

    if (qty > 0) {
        const atMax = qty >= limit;
        return (
            // On desktop a card's stepper is shorter than the Add to bag button, so its row keeps the button's 44px height and the
            // card does not change size when you add the first item.
            <div className={cn('relative z-10', !tall && 'lg:flex lg:h-11 lg:items-center', className)}>
                <QuantityStepper qty={qty} max={limit} onChange={change} title={product.title} size={size} tone={tone} />
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
                    ? cn('border-accent bg-accent text-primary-deep hover:bg-accent-hover', tall ? 'h-12 text-body' : 'h-11 text-small')
                    : cn('border-primary bg-primary text-white hover:bg-primary-hover', tall ? 'h-12 text-body' : 'h-11 text-small'),
                'disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-transparent disabled:text-subtle disabled:hover:bg-transparent disabled:hover:text-subtle',
                className,
            )}
        >
            <ShoppingBag size={tall ? 18 : 16} aria-hidden="true" /> {outOfStock ? soldOutLabel : 'Add to bag'}
        </button>
    );
}
