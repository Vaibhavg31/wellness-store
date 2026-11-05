import { useEffect, useState } from 'react';
import { Tag, X, Loader2, CheckCircle, Info, TriangleAlert } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/utils/formatPrice';
import { couponTerms } from '@/utils/couponPreview';

/**
 * The coupon box in the bag and at checkout. Says in plain words what is applied, how many rupees it takes off, what the limit
 * was, and what it does not cover, so nobody has to guess. Only one coupon applies to an order; applying another replaces it.
 */
export default function CouponInput({ compact = false }) {
    const {
        couponCode,
        couponDetails,
        couponBreakdown,
        couponNotice,
        couponLoading,
        autoAppliedCoupon,
        discountAmount,
        applyCoupon,
        removeCoupon,
    } = useCart();
    const { showToast } = useToast();
    const [input, setInput] = useState(couponCode || '');

    // Resync when the applied code changes elsewhere (auto-apply, or the cart
    // context clearing a coupon that no longer qualifies) — otherwise this
    // field can keep showing a stale/no-longer-valid code after such a change.
    useEffect(() => {
        setInput(couponCode || '');
    }, [couponCode]);

    const handleApply = async () => {
        const result = await applyCoupon(input);
        if (result.valid) {
            showToast(result.message || 'Coupon applied', 'success');
        } else {
            showToast(result.message || 'That code could not be applied', 'error');
        }
    };

    if (couponCode && couponDetails) {
        const freeDelivery = couponDetails.type === 'free_delivery';
        const excluded = couponBreakdown?.excludedSubtotal ?? 0;
        return (
            <div className={`rounded-xl border border-success/40 bg-surface shadow-xs ${compact ? 'p-3' : 'p-4'}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <CheckCircle size={16} className="shrink-0 text-success" aria-hidden="true" />
                            <span className="font-mono text-small font-semibold tracking-wide text-primary">{couponCode}</span>
                            <span className="whitespace-nowrap rounded-full bg-success-tint px-2 py-0.5 text-caption font-medium text-success">{autoAppliedCoupon ? 'Added for you' : 'Applied'}</span>
                        </p>
                        <p className="mt-1.5 font-display text-h4 leading-tight text-success">
                            {freeDelivery ? 'Free delivery' : `You save ${formatPrice(discountAmount)}`}
                        </p>
                        <p className="mt-0.5 text-small text-muted">{couponDetails.title && !/[%₹]/.test(couponDetails.title) ? `${couponDetails.title} · ` : ''}{couponTerms(couponDetails)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            removeCoupon();
                            setInput('');
                            showToast('Coupon removed', 'info');
                        }}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger-tint hover:text-danger"
                        aria-label="Remove coupon"
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                </div>
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-caption leading-snug text-muted">
                    {couponBreakdown?.capped && (
                        <li className="flex gap-2"><Info size={14} className="mt-px shrink-0 text-accent-ink" aria-hidden="true" /> This coupon gives at most {formatPrice(couponBreakdown.maxDiscount)}, so that is what is taken off.</li>
                    )}
                    {!freeDelivery && excluded > 0 && (
                        <li className="flex gap-2"><Info size={14} className="mt-px shrink-0 text-accent-ink" aria-hidden="true" /> {formatPrice(excluded)} of your bag is not included: offer and bundle items already have their own price.</li>
                    )}
                    <li className="flex gap-2"><Info size={14} className="mt-px shrink-0 text-accent-ink" aria-hidden="true" /> One coupon per order. Applying a different code replaces this one.</li>
                </ul>
            </div>
        );
    }

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {!compact && (
                <div className="flex items-center gap-2 text-sm text-ink">
                    <Tag size={15} className="text-primary" aria-hidden="true" />
                    <span className="font-medium">Have a coupon code?</span>
                </div>
            )}
            {couponNotice && (
                <p role="status" className="flex gap-2 rounded-lg bg-accent-tint px-3 py-2.5 text-caption leading-snug text-ink">
                    <TriangleAlert size={15} className="mt-px shrink-0 text-accent-ink" aria-hidden="true" /> {couponNotice}
                </p>
            )}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApply())}
                    placeholder="Enter code"
                    aria-label="Coupon code"
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-2.5 font-mono text-sm uppercase tracking-wider focus:border-primary focus:outline-none"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApply}
                    disabled={couponLoading || !input.trim()}
                    className="flex-shrink-0 px-4"
                >
                    {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                </Button>
            </div>
            <p className="text-caption leading-snug text-muted">One coupon per order. Coupons work on regular-priced products, not on offer boxes, pairs or bundles.</p>
        </div>
    );
}
