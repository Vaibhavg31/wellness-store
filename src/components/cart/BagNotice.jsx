import { Info, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/utils/formatPrice';

/** "X is no longer available, so it was taken out of your bag." Shown on the bag and checkout pages until dismissed. */
export default function BagNotice({ className }) {
    const { bagNotice, dismissBagNotice } = useCart();
    if (!bagNotice) return null;
    return (
        <div role="status" className={cn('flex items-start gap-3 rounded-lg border border-accent/60 bg-accent-tint px-4 py-3 text-small text-ink', className)}>
            <Info size={18} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
            <p className="min-w-0 flex-1">{bagNotice}</p>
            <button type="button" onClick={dismissBagNotice} className="relative -my-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted before:absolute before:-inset-1.5 before:content-[''] hover:bg-surface hover:text-ink" aria-label="Dismiss">
                <X size={15} aria-hidden="true" />
            </button>
        </div>
    );
}
