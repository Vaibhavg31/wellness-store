import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/formatPrice';
import { Truck } from 'lucide-react';

export default function PriceBreakdown({ showUpsell = true, totalClassName = 'text-primary' }) {
    const {
        subtotal,
        deliveryFee,
        discountAmount,
        total,
        couponCode,
        showFreeDeliveryUpsell,
        amountUntilFreeDelivery,
        freeDeliveryProgress,
    } = useCart();

    return (
        <div className="space-y-3 text-sm sm:text-[15px]">
            <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
                <div className="flex justify-between text-primary">
                    <span>Coupon{couponCode ? ` (${couponCode})` : ''}</span>
                    <span className="font-medium">−{formatPrice(discountAmount)}</span>
                </div>
            )}
            <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span className={`font-medium ${deliveryFee === 0 ? 'text-primary' : ''}`}>
                    {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </span>
            </div>
            {showUpsell && showFreeDeliveryUpsell && (
                <div className="rounded-lg bg-sand/60 border border-line/40 px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-ink">
                        <Truck size={13} className="text-accent-ink flex-shrink-0" />
                        <span>
                            Add <span className="font-medium">{formatPrice(amountUntilFreeDelivery)}</span> more for free delivery
                        </span>
                    </div>
                    <div className="h-1 rounded-full bg-line/60 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-500"
                            style={{ width: `${freeDeliveryProgress}%` }}
                        />
                    </div>
                </div>
            )}
            <div className="border-t border-line/60 pt-4 flex justify-between items-baseline font-display text-xl">
                <span className="text-base font-sans text-ink">Total</span>
                <span className={totalClassName}>{formatPrice(total)}</span>
            </div>
        </div>
    );
}
