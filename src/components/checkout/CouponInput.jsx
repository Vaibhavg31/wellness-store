import { useEffect, useState } from 'react';
import { Tag, X, Loader2, CheckCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';

export default function CouponInput({ compact = false }) {
    const {
        couponCode,
        couponDetails,
        couponMessage,
        couponLoading,
        autoAppliedCoupon,
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
            showToast(result.message || 'Invalid coupon', 'error');
        }
    };

    if (couponCode && couponDetails) {
        return (
            <div className={`rounded-xl border border-primary/15 bg-sand/50 ${compact ? 'p-3' : 'p-4'}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-primary">
                            <CheckCircle size={16} className="flex-shrink-0" />
                            <span className="font-mono text-sm font-semibold tracking-wide">{couponCode}</span>
                        </div>
                        <p className="text-sm text-muted mt-1 leading-relaxed">
                            {autoAppliedCoupon ? 'Applied automatically at checkout' : (couponDetails.title || couponMessage)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            removeCoupon();
                            setInput('');
                            showToast('Coupon removed', 'info');
                        }}
                        className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Remove coupon"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {!compact && (
                <div className="flex items-center gap-2 text-sm text-ink">
                    <Tag size={15} className="text-primary" />
                    <span className="font-medium">Have a coupon?</span>
                </div>
            )}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApply())}
                    placeholder="Enter code"
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm uppercase tracking-wider bg-canvas border border-line rounded-xl focus:outline-none focus:border-primary font-mono"
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
        </div>
    );
}
