import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

export default function QuantityStepper({ value, onChange, min = 1, max = 99, className }) {
    const btn = 'grid size-10 place-items-center text-ink transition-colors hover:bg-primary-soft disabled:text-subtle disabled:hover:bg-transparent';
    return (
        <div className={cn('inline-flex items-center rounded-full border border-line-strong bg-surface', className)}>
            <button type="button" className={cn(btn, 'rounded-l-full')} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
                <Minus size={16} />
            </button>
            <span className="min-w-8 text-center text-small font-medium tabular-nums" aria-live="polite">{value}</span>
            <button type="button" className={cn(btn, 'rounded-r-full')} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
                <Plus size={16} />
            </button>
        </div>
    );
}
