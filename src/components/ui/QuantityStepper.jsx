import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

export default function QuantityStepper({ value, onChange, min = 1, max = 99, step = 1, className }) {
    const btn = 'grid size-11 place-items-center text-primary transition-colors hover:bg-accent disabled:text-subtle disabled:hover:bg-transparent';
    return (
        <div className={cn('inline-flex h-12 items-center rounded-full border-2 border-line-strong bg-surface', className)}>
            <button type="button" className={cn(btn, 'rounded-l-full')} onClick={() => onChange(value - step)} disabled={value - step < min} aria-label="Decrease quantity">
                <Minus size={16} />
            </button>
            <span className="min-w-8 text-center text-small font-bold tabular-nums" aria-live="polite">{value}</span>
            <button type="button" className={cn(btn, 'rounded-r-full')} onClick={() => onChange(value + step)} disabled={value + step > max} aria-label="Increase quantity">
                <Plus size={16} />
            </button>
        </div>
    );
}
