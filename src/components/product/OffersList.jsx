import { useState } from 'react';
import { Check, Copy, Tag } from 'lucide-react';
import { usePublicCoupons } from '@/hooks/usePublicCoupons';
import { formatPrice } from '@/utils/formatPrice';

/** "Available offers" on the product page: public coupons with one-tap copy. */
export default function OffersList() {
    const coupons = usePublicCoupons().slice(0, 3);
    const [copied, setCopied] = useState('');

    if (coupons.length === 0) return null;

    const copy = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(code);
            setTimeout(() => setCopied(''), 2000);
        } catch {
            /* clipboard blocked — the code is still visible to type */
        }
    };

    return (
        <section aria-labelledby="offers-title" className="mt-6 rounded-lg border border-dashed border-primary/40 bg-primary-soft p-4">
            <h2 id="offers-title" className="mb-3 flex items-center gap-2 font-sans text-small font-semibold">
                <Tag size={16} className="text-primary" aria-hidden="true" /> Available offers
            </h2>
            <ul className="space-y-3">
                {coupons.map((coupon) => (
                    <li key={coupon.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-small font-medium text-ink">{coupon.label}{coupon.title ? ` · ${coupon.title}` : ''}</p>
                            <p className="text-caption text-muted">
                                {coupon.description}{coupon.minOrderAmount > 0 ? ` (orders above ${formatPrice(coupon.minOrderAmount)})` : ''}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => copy(coupon.code)}
                            aria-label={`Copy code ${coupon.code}`}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary bg-surface px-3 text-caption font-semibold tracking-wide text-primary-deep hover:bg-primary-tint"
                        >
                            {copied === coupon.code ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                            {copied === coupon.code ? 'Copied' : coupon.code}
                        </button>
                    </li>
                ))}
            </ul>
            <p className="sr-only" role="status">{copied ? `Code ${copied} copied` : ''}</p>
        </section>
    );
}
