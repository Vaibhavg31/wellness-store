import { Truck, PartyPopper } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/formatPrice';

/**
 * The first thing shoppers look for in a bag: how close am I to free delivery? Shown above the items (the way the big Indian
 * stores do it) with a bar that fills as the bag grows, and a plain "you have unlocked it" once it is free.
 */
export default function FreeDeliveryBar({ className = '' }) {
    const { showFreeDeliveryUpsell, amountUntilFreeDelivery, freeDeliveryProgress, deliveryFee } = useCart();
    if (showFreeDeliveryUpsell) {
        return (
            <div className={`rounded-xl border border-line bg-surface px-4 py-3 ${className}`}>
                <p className="flex items-center gap-2 text-small text-ink">
                    <Truck size={16} className="shrink-0 text-primary" aria-hidden="true" />
                    <span>Add <strong className="font-semibold">{formatPrice(amountUntilFreeDelivery)}</strong> more to get <strong className="font-semibold text-primary">free delivery</strong></span>
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-primary-tint" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(freeDeliveryProgress)} aria-label="Progress to free delivery">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${freeDeliveryProgress}%` }} />
                </div>
            </div>
        );
    }
    if (deliveryFee > 0) return null;
    return (
        <p className={`flex items-center gap-2 rounded-xl bg-success-tint px-4 py-3 text-small font-medium text-success ${className}`}>
            <PartyPopper size={16} className="shrink-0" aria-hidden="true" /> You have unlocked free delivery on this order
        </p>
    );
}
