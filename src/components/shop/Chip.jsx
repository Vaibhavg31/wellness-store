import { cn } from '@/utils/formatPrice';

/** Toggle pill used for category / tag filters. */
export default function Chip({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'rounded-full border px-4 py-1.5 text-small font-medium transition-colors',
                active ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface text-ink hover:border-primary hover:text-primary',
            )}
        >
            {children}
        </button>
    );
}
