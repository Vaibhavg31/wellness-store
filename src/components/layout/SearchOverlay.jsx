import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { useDebounce } from '@/hooks';
import { useProducts } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

export default function SearchOverlay({ isOpen, onClose }) {
    const panelRef = useDialog(isOpen, onClose);
    const navigate = useNavigate();
    const { products } = useProducts();
    const [query, setQuery] = useState('');
    const debounced = useDebounce(query.trim().toLowerCase(), 150);

    const results = useMemo(() => {
        if (!debounced) return [];
        return products
            .filter((p) => `${p.title} ${p.category} ${p.description ?? ''}`.toLowerCase().includes(debounced))
            .slice(0, 6);
    }, [products, debounced]);

    if (!isOpen) return null;

    const submit = (event) => {
        event.preventDefault();
        if (!query.trim()) return;
        onClose();
        navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 animate-fade-in bg-ink/50" onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Search products"
                tabIndex={-1}
                className="relative mx-auto mt-0 w-full max-w-2xl animate-fade-up bg-surface p-4 shadow-lg focus:outline-none sm:mt-20 sm:rounded-xl sm:p-6"
            >
                <form onSubmit={submit} className="flex items-center gap-3" role="search">
                    <Search size={20} className="shrink-0 text-muted" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search products, concerns, categories…"
                        aria-label="Search products"
                        className="h-11 w-full bg-transparent text-body text-ink placeholder:text-subtle focus:outline-none"
                    />
                    <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-canvas-alt" aria-label="Close search">
                        <X size={18} />
                    </button>
                </form>

                {debounced && (
                    <div className="mt-4 border-t border-line pt-4">
                        {results.length === 0 ? (
                            <p className="py-6 text-center text-muted">No products found for “{query}”.</p>
                        ) : (
                            <ul className="space-y-1">
                                {results.map((p) => (
                                    <li key={p.id}>
                                        <Link to={`/product/${p.id}`} onClick={onClose} className="flex items-center gap-3 rounded-lg p-2 hover:bg-primary-soft">
                                            <img src={imageUrl(p.images?.[0])} alt="" width="48" height="48" loading="lazy" className="size-12 shrink-0 rounded-md bg-canvas-alt object-cover" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-small font-medium text-ink">{p.title}</span>
                                                <span className="block text-caption text-muted">{p.category}</span>
                                            </span>
                                            <span className="text-small font-medium text-ink">{formatPrice(p.price)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {results.length > 0 && (
                            <button type="button" onClick={submit} className="mt-3 w-full rounded-full py-2.5 text-small font-medium text-primary hover:bg-primary-soft">
                                See all results
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
