import { Crown } from 'lucide-react';
import { formatPrice, cn } from '@/utils/formatPrice';

/** Is this bag line charged the Chikit Club price (a plain line at its member price, or a Pick & Mix box a member prices by Club)? */
export function isClubLine(product) {
    if (product.bundleId) return false;
    if (product.offerId) return Boolean(product.mixByClub);
    return Number(product.memberPrice) > 0 && product.price === product.memberPrice && product.price < Number(product.listPrice ?? product.price);
}

/**
 * The price of one bag line, the way the product page shows it: what is paid, then what it was. A Club line shows the Chikit Club price
 * with a crown and both the usual price and the original struck through; any other line shows its original price struck through.
 * The same figures appear in the bag, on the bag page and in the checkout summary.
 */
export default function CartLinePrice({ product, quantity, className, align = 'end' }) {
    const pay = product.price * quantity;
    const club = isClubLine(product);
    const usual = club && product.listPrice > product.price ? product.listPrice * quantity : 0;
    const mrp = product.originalPrice * quantity > Math.max(pay, usual) ? product.originalPrice * quantity : 0;
    return (
        <span className={cn('flex flex-wrap items-baseline gap-x-1.5', align === 'start' ? 'justify-start' : 'justify-end', className)}>
            {usual > 0 && <span className="text-caption text-muted line-through"><span className="sr-only">Price without Chikit Club </span>{formatPrice(usual)}</span>}
            {mrp > 0 && <span className={cn('text-caption line-through', club ? 'text-subtle' : 'text-muted')}><span className="sr-only">Original price </span>{formatPrice(mrp)}</span>}
            <span className={cn('inline-flex items-baseline gap-1 font-semibold', club ? 'text-primary' : 'text-ink')}>
                {club && <Crown size={12} className="self-center" aria-label="Chikit Club price" />}
                {formatPrice(pay)}
            </span>
        </span>
    );
}
