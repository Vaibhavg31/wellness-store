import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

/**
 * The quantity control for lines already in the bag (bag page, side bag). It looks exactly like the stepper an "Add to bag" button
 * turns into: a soft plum-tinted pill with a round white − and a round solid plum +. Keep the two in step.
 */
export default function QuantityStepper({ value, onChange, min = 1, max = 99, step = 1, className }) {
    const btn = 'grid size-8 shrink-0 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40';
    return (
        <div className={cn('inline-flex h-10 min-w-28 items-center justify-between rounded-full border border-primary/25 bg-primary-tint px-1', className)} role="group" aria-label="Quantity">
            <button type="button" className={cn(btn, 'bg-white text-primary shadow-xs ring-1 ring-primary/15 hover:bg-primary hover:text-white disabled:hover:bg-white disabled:hover:text-primary')} onClick={() => onChange(value - step)} disabled={value - step < min} aria-label="Decrease quantity">
                <Minus size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="min-w-8 text-center text-body font-semibold tabular-nums text-primary" aria-live="polite">{value}</span>
            <button type="button" className={cn(btn, 'bg-primary text-white shadow-xs hover:bg-primary-hover disabled:hover:bg-primary')} onClick={() => onChange(value + step)} disabled={value + step > max} aria-label="Increase quantity">
                <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
        </div>
    );
}
