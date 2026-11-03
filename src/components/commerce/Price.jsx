import { Crown } from 'lucide-react';
import { openClubSheet } from '@/components/commerce/ClubSheet';
import { useCart } from '@/contexts/CartContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice, cn } from '@/utils/formatPrice';

const SIZES = {
    sm: { main: 'text-body font-bold', strike: 'text-caption', off: 'text-caption' },
    md: { main: 'text-h4 font-bold', strike: 'text-small', off: 'text-small' },
    lg: { main: 'font-display text-h2 font-medium leading-none', strike: 'text-body', off: 'text-small' },
};

/**
 * The one place a price is drawn, and the heart of the Club pricing model.
 *
 *  Guest:  ₹499  ₹999  50% off          then a beige line:  [crown] ₹449 with Club  (opens the join sheet)
 *  Member: [crown] ₹449  ₹999  55% off  then green:         Club price, you save ₹550
 *
 * `item` is anything with price / originalPrice / memberPrice (a product or a pack option). `title` feeds the join sheet's example.
 * `compact` keeps the Club line to one short chip, for product cards.
 */
export default function Price({ item, title, size = 'md', compact = false, className }) {
    const { isMember } = useCart();
    const { content } = useSiteContent();
    const clubOn = content.extras?.club?.enabled !== false;
    const price = Number(item?.price) || 0;
    const memberPrice = clubOn && Number(item?.memberPrice) > 0 && Number(item.memberPrice) < price ? Number(item.memberPrice) : 0;
    const mrp = Number(item?.originalPrice) > price ? Number(item.originalPrice) : 0;
    const s = SIZES[size];
    const showMember = isMember && memberPrice > 0;

    const main = showMember ? memberPrice : price;
    const strike = showMember ? (mrp || price) : mrp;
    const off = strike > main ? Math.round(((strike - main) / strike) * 100) : 0;
    const saving = strike > main ? strike - main : 0;

    return (
        <div className={cn('min-w-0', className)}>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {showMember && <Crown size={size === 'lg' ? 20 : 14} className="self-center text-gold" aria-label="Club price" />}
                <span className={cn(s.main, showMember ? 'text-primary' : 'text-ink')}>{formatPrice(main)}</span>
                {strike > main && <span className={cn(s.strike, 'text-subtle line-through')}>{formatPrice(strike)}</span>}
                {off > 0 && <span className={cn(s.off, 'font-semibold text-success')}>{off}% off</span>}
            </p>

            {showMember && (
                <p className={cn('mt-1 font-semibold text-success', size === 'sm' ? 'text-caption' : 'text-small')}>
                    Club price, you save {formatPrice(saving)}
                </p>
            )}

            {!isMember && memberPrice > 0 && (
                compact ? (
                    <button
                        type="button"
                        onClick={() => openClubSheet({ title, price, memberPrice })}
                        className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-primary-deep transition-colors before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] hover:bg-accent-hover"
                    >
                        <Crown size={12} className="text-gold" aria-hidden="true" />
                        {formatPrice(memberPrice)} <span className="font-semibold">with Club</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => openClubSheet({ title, price, memberPrice })}
                        className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-left text-primary-deep transition-colors hover:bg-accent-hover"
                    >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-gold-soft"><Crown size={17} aria-hidden="true" /></span>
                        <span className="text-small leading-snug">
                            <span className="block font-bold">{formatPrice(memberPrice)} with the Chikit Club</span>
                            <span className="block text-primary-deep/75">Save {formatPrice(price - memberPrice)} more. Free to join. <span className="font-semibold underline underline-offset-2">How it works</span></span>
                        </span>
                    </button>
                )
            )}
        </div>
    );
}
