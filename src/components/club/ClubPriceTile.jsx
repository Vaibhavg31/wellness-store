import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * One product with its two prices side by side: the usual price and the Chikit Club price, and the rupees the Club saves.
 * A member sees the same tile worded as "Your price". No percentage is quoted; the difference is shown in rupees.
 */
export default function ClubPriceTile({ product, member = false, active = false, className }) {
    const saving = product.price - product.memberPrice;
    return (
        <Link
            to={`/product/${product.id}`}
            className={cn('group flex h-full flex-col overflow-hidden rounded-2xl bg-surface p-3 text-ink shadow-sm ring-2 transition-shadow hover:shadow-md', active ? 'ring-accent' : 'ring-transparent', className)}
        >
            <span className="block aspect-square overflow-hidden rounded-xl bg-accent-tint">
                <img src={imageUrl(product.images[0], 320)} alt="" width="240" height="240" loading="lazy" decoding="async" className="size-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
            </span>
            <span className="mt-3 line-clamp-2 min-h-[2.5rem] text-small font-semibold leading-snug">{product.title}</span>
            <span className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-2">
                <span>
                    <span className="block text-caption text-muted">Usual</span>
                    <span className="block text-small text-muted line-through">{formatPrice(product.price)}</span>
                </span>
                <span>
                    <span className="flex items-center gap-1 text-caption font-semibold text-primary"><Crown size={11} aria-hidden="true" /> {member ? 'Yours' : 'Chikit Club'}</span>
                    <span className="block text-lead font-semibold leading-tight text-primary">{formatPrice(product.memberPrice)}</span>
                </span>
            </span>
            <span className="mt-2 rounded-full bg-success-tint px-2.5 py-1 text-center text-caption font-semibold text-success">{member ? 'You save' : 'Chikit Club saves you'} {formatPrice(saving)}</span>
        </Link>
    );
}
