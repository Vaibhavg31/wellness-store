import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { useDebounce } from '@/hooks';
import { useCategories, useProducts } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { humanizeSlug } from '@/utils/products';

function ProductRow({ product, onClose }) {
    return (
        <li>
            <Link to={`/product/${product.id}`} onClick={onClose} className="flex items-center gap-3 rounded-lg p-2 hover:bg-primary-soft">
                <img src={imageUrl(product.images?.[0], 96)} alt="" width="48" height="48" loading="lazy" className="size-12 shrink-0 rounded-md bg-canvas-alt object-cover" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-medium text-ink">{product.title}</span>
                    <span className="block text-caption text-muted">{humanizeSlug(product.category)}</span>
                </span>
                <span className="text-small font-medium text-ink">{formatPrice(product.price)}</span>
            </Link>
        </li>
    );
}

export default function SearchOverlay({ isOpen, onClose }) {
    const panelRef = useDialog(isOpen, onClose);
    const navigate = useNavigate();
    const { products } = useProducts();
    const { categories } = useCategories();
    const [query, setQuery] = useState('');
    const debounced = useDebounce(query.trim().toLowerCase(), 150);

    const results = useMemo(() => {
        if (!debounced) return [];
        return products
            .filter((p) => `${p.title} ${p.category} ${p.description ?? ''}`.toLowerCase().includes(debounced))
            .slice(0, 6);
    }, [products, debounced]);

    const popular = useMemo(() => [...products].sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0)).slice(0, 4), [products]);

    const { mounted, closing } = usePresence(isOpen);
    if (!mounted) return null;

    const submit = (event) => {
        event.preventDefault();
        if (!query.trim()) return;
        onClose();
        navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    };

    return createPortal(
        <div className={closing ? 'pointer-events-none fixed inset-0 z-[100]' : 'fixed inset-0 z-[100]'}>
            <div className={`absolute inset-0 bg-ink/50 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Search products"
                tabIndex={-1}
                className={`relative mx-auto mt-0 w-full max-w-2xl bg-surface p-4 shadow-lg focus:outline-none sm:mt-20 sm:rounded-xl sm:p-6 ${closing ? 'animate-fade-down' : 'animate-fade-up'}`}
            >
                <form onSubmit={submit} className="flex items-center gap-3" role="search">
                    <Search size={20} className="shrink-0 text-muted" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search products, concerns…"
                        aria-label="Search products"
                        enterKeyHint="search"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="h-11 min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                        <button type="button" onClick={(e) => { setQuery(''); e.currentTarget.form?.querySelector('input')?.focus(); }} className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas-alt text-muted hover:text-ink" aria-label="Clear search">
                            <X size={14} />
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-canvas-alt" aria-label="Close search">
                        <X size={18} />
                    </button>
                </form>

                {!debounced && categories.length > 0 && (
                    <div className="mt-4 border-t border-line pt-4">
                        <p className="mb-3 text-caption font-semibold uppercase tracking-wider text-muted">Shop by category</p>
                        <ul className="flex flex-wrap gap-2">
                            {categories.slice(0, 8).map((c) => (
                                <li key={c.slug}>
                                    <Link to={`/category/${c.slug}`} onClick={onClose} className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-small font-medium text-ink transition-colors hover:border-primary hover:text-primary">{c.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {!debounced && popular.length > 0 && (
                    <div className="mt-4 border-t border-line pt-4">
                        <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-muted">Popular right now</p>
                        <ul className="space-y-1">
                            {popular.map((p) => <ProductRow key={p.id} product={p} onClose={onClose} />)}
                        </ul>
                    </div>
                )}

                {debounced && (
                    <div className="mt-4 border-t border-line pt-4">
                        {results.length === 0 ? (
                            <div className="py-6 text-center">
                                <p className="text-muted">No products found for “{query}”.</p>
                                <p className="mt-1 text-small text-muted">Check the spelling, or try a category such as “immunity”.</p>
                                <Link to="/shop" onClick={onClose} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-primary px-5 text-small font-semibold text-primary hover:bg-primary-soft">Browse all products</Link>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {results.map((p) => <ProductRow key={p.id} product={p} onClose={onClose} />)}
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
