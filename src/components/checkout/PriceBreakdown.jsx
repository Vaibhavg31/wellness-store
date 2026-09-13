import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/formatPrice';
import { Truck } from 'lucide-react';

export default function PriceBreakdown({ showUpsell = true, totalClassName = 'text-emerald' }) {
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
        <div className="space-y-3 text-sm">
            <div className="flex justify-between">
                <span className="text-slate">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
                <div className="flex justify-between text-emerald">
                    <span>Coupon{couponCode ? ` (${couponCode})` : ''}</span>
                    <span className="font-medium">−{formatPrice(discountAmount)}</span>
                </div>
            )}
            <div className="flex justify-between">
                <span className="text-slate">Delivery</span>
                <span className={`font-medium ${deliveryFee === 0 ? 'text-emerald' : ''}`}>
                    {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </span>
            </div>
            {showUpsell && showFreeDeliveryUpsell && (
                <div className="rounded-lg bg-sand/60 border border-border/40 px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-ink">
                        <Truck size={13} className="text-turmeric-ink flex-shrink-0" />
                        <span>
                            Add <span className="font-medium">{formatPrice(amountUntilFreeDelivery)}</span> more for free delivery
                        </span>
                    </div>
                    <div className="h-1 rounded-full bg-border/60 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-turmeric/70 to-turmeric transition-all duration-500"
                            style={{ width: `${freeDeliveryProgress}%` }}
                        />
                    </div>
                </div>
            )}
            <div className="border-t border-border/60 pt-4 flex justify-between font-display text-lg">
                <span>Total</span>
                <span className={totalClassName}>{formatPrice(total)}</span>
            </div>
        </div>
    );
}
