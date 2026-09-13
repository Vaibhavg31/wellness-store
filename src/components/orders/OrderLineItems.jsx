import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

export default function OrderLineItems({ items = [], compact = false, plain = false }) {
    if (!items.length) return null;

    return (
        <ul className={compact ? 'space-y-2' : 'space-y-2.5'}>
            {items.map((item, i) => (
                <li
                    key={`${item.productId}-${i}`}
                    className={
                        plain
                            ? 'flex gap-3 items-center py-2 first:pt-0 last:pb-0'
                            : compact
                                ? 'flex gap-3 items-center'
                                : 'flex gap-3 items-center bg-cream/50 rounded-xl p-3'
                    }
                >
                    {item.image && (
                        <img
                            src={imageUrl(item.image)}
                            alt=""
                            className={compact
                                ? 'w-10 h-12 object-cover rounded-lg flex-shrink-0 bg-sand'
                                : 'w-12 h-14 object-cover rounded-lg flex-shrink-0 bg-sand'}
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className={compact ? 'text-sm text-ink line-clamp-1' : 'text-sm text-ink font-medium line-clamp-2'}>
                            {item.title}
                        </p>
                        <p className="text-xs text-slate mt-0.5">
                            Qty {item.quantity}
                            {!compact && ` · ${formatPrice(item.price)} each`}
                        </p>
                    </div>
                    <p className="text-sm font-medium text-ink flex-shrink-0">
                        {formatPrice(item.price * item.quantity)}
                    </p>
                </li>
            ))}
        </ul>
    );
}
