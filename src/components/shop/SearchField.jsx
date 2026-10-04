import { Search, X } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

export default function SearchField({ value, onChange, placeholder = 'Search…', label = 'Search', className }) {
    return (
        <div className={cn('relative', className)} role="search">
            <label htmlFor="shop-search" className="sr-only">{label}</label>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
                id="shop-search"
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-full border border-line-strong bg-surface pl-11 pr-10 text-small text-ink placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink">
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
