import { Crown } from 'lucide-react';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * A price the way shoppers expect it: what you pay, then what it was.
 *  - Everyone else: the price, with the original (MRP) struck through.
 *  - A signed-in Chikit Club member (`isMember` with a `memberPrice`): the Chikit Club price with a crown, then the usual price and the
 *    original both struck through, so they can see exactly what the Club takes off.
 * `price` is the price shown to everyone; `originalPrice` is the MRP. Both are optional to keep simple callers simple.
 */
export default function Price({ price, originalPrice, memberPrice, isMember = false, className, size = 'md' }) {
    const member = isMember && Number(memberPrice) > 0 && Number(memberPrice) < Number(price);
    const pay = member ? memberPrice : price;
    const usual = member ? price : 0;
    const mrp = originalPrice > Math.max(pay, usual) ? originalPrice : 0;
    return (
        <p className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
            <span className={cn('inline-flex items-baseline gap-1 font-semibold', member ? 'text-primary' : 'text-ink', size === 'lg' ? 'font-display text-h3' : 'text-body')}>
                {member && <Crown size={size === 'lg' ? 18 : 14} className="self-center" aria-label="Chikit Club price" />}
                {formatPrice(pay)}
            </span>
            {usual > 0 && (
                <span className="text-small text-muted line-through">
                    <span className="sr-only">Price without Chikit Club </span>
                    {formatPrice(usual)}
                </span>
            )}
            {mrp > 0 && (
                <span className={cn('line-through', member ? 'text-caption text-subtle' : 'text-small text-muted')}>
                    <span className="sr-only">Original price </span>
                    {formatPrice(mrp)}
                </span>
            )}
        </p>
    );
}
