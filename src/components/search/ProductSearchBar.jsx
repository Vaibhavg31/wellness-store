import { Search, X } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

export default function ProductSearchBar({
    value,
    onChange,
    placeholder = 'Search products…',
    className = '',
    size = 'default',
    onSubmit,
}) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && onSubmit) {
            e.preventDefault();
            onSubmit(value);
        }
    };

    const sizeClass = size === 'compact'
        ? 'px-3 py-2 text-sm'
        : 'px-4 py-2.5 sm:py-3 text-sm sm:text-base';

    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-full border border-border/70 bg-cream focus-within:border-forest/40 focus-within:ring-2 focus-within:ring-forest/10 transition-all',
                sizeClass,
                className,
            )}
        >
            <Search size={size === 'compact' ? 16 : 18} className="text-slate flex-shrink-0" strokeWidth={1.25} />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-ink placeholder:text-slate/45 focus:outline-none min-w-0 font-light"
                aria-label={placeholder}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="p-1 rounded-full hover:bg-sand/60 text-slate transition-colors flex-shrink-0"
                    aria-label="Clear search"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
