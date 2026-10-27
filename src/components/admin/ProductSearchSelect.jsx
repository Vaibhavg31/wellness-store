import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { fieldClass } from '@/components/admin/AdminFormUi';

const MAX_RESULTS = 25;

function matchProduct(product, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
        product.title?.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q) ||
        product.sku?.toLowerCase().includes(q) ||
        String(product.price ?? '').includes(q)
    );
}

export default function ProductSearchSelect({
    products,
    value,
    onChange,
    placeholder = 'Search product…',
    emptyOptionLabel = 'Custom item',
    publishedOnly = true,
}) {
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const productOptions = useMemo(
        () => (publishedOnly ? products.filter((p) => p.isPublished !== false) : products),
        [products, publishedOnly],
    );

    const selected = useMemo(
        () => productOptions.find((p) => p.id === value) || null,
        [productOptions, value],
    );

    const filtered = useMemo(() => {
        const matches = productOptions.filter((p) => matchProduct(p, query));
        return matches.slice(0, MAX_RESULTS);
    }, [productOptions, query]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openPicker = () => {
        setOpen(true);
        setQuery('');
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const selectProduct = (productId) => {
        onChange(productId);
        setOpen(false);
        setQuery('');
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
        setOpen(false);
    };

    const showDropdown = open && (query.trim() || filtered.length > 0 || !selected);

    return (
        <div ref={containerRef} className="relative">
            {selected && !open ? (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={openPicker}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openPicker();
                        }
                    }}
                    className={`${fieldClass} flex items-center justify-between gap-2 text-left cursor-pointer`}
                >
                    <span className="truncate">
                        {selected.title} · {formatPrice(selected.price)}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-0.5 rounded hover:bg-ink/5 text-admin-muted"
                            aria-label="Clear product"
                        >
                            <X size={14} />
                        </button>
                        <ChevronDown size={14} className="text-admin-muted" />
                    </span>
                </div>
            ) : (
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted/50 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className={`${fieldClass} pl-8 pr-8`}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-ink/5 text-admin-muted"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {showDropdown && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-admin-border bg-white shadow-lg py-1">
                    <button
                        type="button"
                        onClick={() => selectProduct('')}
                        className={`w-full px-3 py-2.5 text-left text-sm hover:bg-admin-surface-alt transition-colors ${
                            !value ? 'bg-primary/5 text-primary font-medium' : 'text-ink'
                        }`}
                    >
                        {emptyOptionLabel}
                    </button>

                    {filtered.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-admin-muted">
                            {query.trim() ? 'No products match your search.' : 'No published products found.'}
                        </p>
                    ) : (
                        filtered.map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => selectProduct(product.id)}
                                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-admin-surface-alt transition-colors flex items-center justify-between gap-3 ${
                                    value === product.id ? 'bg-primary/5 text-primary' : 'text-ink'
                                }`}
                            >
                                <span className="truncate font-medium">{product.title}</span>
                                <span className="shrink-0 text-admin-muted text-xs">
                                    {formatPrice(product.price)}
                                </span>
                            </button>
                        ))
                    )}

                    {query.trim() && productOptions.filter((p) => matchProduct(p, query)).length > MAX_RESULTS && (
                        <p className="px-3 py-2 text-xs text-admin-muted border-t border-admin-border">
                            Showing first {MAX_RESULTS} matches — refine your search.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
