import { Link } from 'react-router-dom';
import { Crown, Sparkles } from 'lucide-react';
import { imageUrl } from '@/services/api';
import AddToBag from '@/components/product/AddToBag';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * One product with its two prices, and the rupees the Chikit Club saves.
 *  - A member gets the premium card: deep plum, their price large in beige, "You save ₹X", and Add to bag that turns into a quantity stepper.
 *  - Anyone else sees the usual price against the Chikit Club price, and one button to join (the member price only applies once they have).
 * No percentage is quoted; the difference is shown in rupees.
 */
export default function ClubPriceTile({ product, member = false, active = false, joinHref = '/club#join', className }) {
    const saving = product.price - product.memberPrice;
    const joinClass = 'mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 whitespace-nowrap rounded-full bg-accent px-2 text-caption font-semibold text-primary-deep transition-colors hover:bg-accent-hover min-[420px]:gap-1.5 min-[420px]:text-small';

    if (member) {
        return (
            <div className={cn('relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface text-ink shadow-md ring-1 ring-primary/15 transition-shadow hover:shadow-lg', active && 'ring-2 ring-primary', className)}>
                <Link to={`/product/${product.id}`} className="group flex flex-1 flex-col">
                    <span className="relative block aspect-square overflow-hidden bg-gradient-to-br from-primary-tint via-white to-accent-tint">
                        <img src={imageUrl(product.images[0], 320)} alt="" width="240" height="240" loading="lazy" decoding="async" className="size-full object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                        <span className="absolute left-0 top-3 inline-flex items-center gap-1 rounded-r-full bg-gradient-to-r from-primary-deep to-primary py-1 pl-2 pr-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent shadow-sm"><Crown size={11} aria-hidden="true" /> Member</span>
                    </span>
                    <span className="flex flex-1 flex-col px-3 pt-3">
                        <span className="line-clamp-2 min-h-[2.5rem] text-small font-semibold leading-snug text-ink">{product.title}</span>
                        <span className="mt-2 flex items-baseline gap-2">
                            <span className="font-display text-h3 leading-none text-primary">{formatPrice(product.memberPrice)}</span>
                            <span className="text-small text-muted line-through"><span className="sr-only">Usual price </span>{formatPrice(product.price)}</span>
                        </span>
                        <span className="mt-1 text-caption text-muted">Your Chikit Club price</span>
                        <span className="mt-2.5 inline-flex items-center justify-center gap-1.5 self-start rounded-full bg-primary px-3 py-1 text-caption font-semibold text-accent"><Sparkles size={12} aria-hidden="true" /> You save {formatPrice(saving)}</span>
                    </span>
                </Link>
                <div className="p-3 pt-3"><AddToBag product={product} tone="solid" /></div>
            </div>
        );
    }

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
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-caption font-semibold text-primary"><Crown size={12} aria-hidden="true" /> Chikit Club</span>
                        <span className="text-lead font-semibold leading-none text-primary">{formatPrice(product.memberPrice)}</span>
                    </span>
                </span>
                <span className="mt-2.5 rounded-full bg-success-tint px-2.5 py-1 text-center text-caption font-semibold text-success">Save {formatPrice(saving)}</span>
            </Link>
            {joinHref.startsWith('#')
                ? <a href={joinHref} className={joinClass}><Crown size={15} className="text-primary" aria-hidden="true" /> Join Chikit Club</a>
                : <Link to={joinHref} className={joinClass}><Crown size={15} className="text-primary" aria-hidden="true" /> Join Chikit Club</Link>}
        </div>
    );
}
