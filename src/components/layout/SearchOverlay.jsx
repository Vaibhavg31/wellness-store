import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, TrendingUp, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useProducts } from '@/hooks/useApi';
import { searchProducts } from '@/utils/searchProducts';
import { suggestKeywords } from '@/utils/trending';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

/**
 * Search: a full-screen sheet on a phone, a wide panel under the header on a desktop. Before typing it offers what is trending;
 * while typing it shows the best matches (same ranked search as the shop page) with their pictures and prices.
 */
export default function SearchOverlay({ open, onClose }) {
    const { content } = useSiteContent();
    const { products } = useProducts();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!open) return undefined;
        setQuery('');
        const t = setTimeout(() => inputRef.current?.focus(), 60);
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    }, [open, onClose]);

    const trending = useMemo(() => {
        const own = content.extras?.trending?.keywords ?? [];
        return own.length > 0 ? own : suggestKeywords(products, 8);
    }, [content.extras, products]);
    const results = useMemo(() => (query.trim().length >= 2 ? searchProducts(products, query).slice(0, 6) : []), [products, query]);

    if (!open) return null;

    const go = (q) => { onClose(); navigate(`/shop?search=${encodeURIComponent(q)}`); };

    return createPortal(
        <div className="fixed inset-0 z-[110] flex flex-col bg-canvas animate-fade-in sm:bg-primary-night/50 sm:p-6 sm:pt-24 sm:backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Search products">
            <div className="absolute inset-0 hidden sm:block" onClick={onClose} aria-hidden="true" />
            <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden bg-canvas sm:max-h-[78dvh] sm:flex-none sm:rounded-[1.75rem] sm:shadow-lg">
                <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) go(query.trim()); }} className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-6">
                    <Search size={20} className="shrink-0 text-primary" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        type="search"
                        enterKeyHint="search"
                        placeholder="Search for ashwagandha, hair, sleep..."
                        aria-label="Search products"
                        className="min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                    />
                    <button type="button" onClick={onClose} aria-label="Close search" className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas-alt text-ink hover:bg-accent"><X size={18} aria-hidden="true" /></button>
                </form>

                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    {query.trim().length < 2 ? (
                        <>
                            <p className="mb-3 flex items-center gap-2 text-caption font-bold uppercase tracking-[0.16em] text-accent-ink"><TrendingUp size={14} aria-hidden="true" /> Trending now</p>
                            <ul className="flex flex-wrap gap-2">
                                {trending.map((chip) => (
                                    <li key={chip.query}>
                                        <button type="button" onClick={() => go(chip.query)} className="min-h-10 rounded-full bg-accent-tint px-4 text-small font-semibold capitalize text-primary-deep ring-1 ring-line transition-colors hover:bg-primary hover:text-white hover:ring-primary">{chip.label}</button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : results.length === 0 ? (
                        <p className="py-10 text-center text-muted">Nothing matches &ldquo;{query}&rdquo;. Try another word, like an ingredient or a health need.</p>
                    ) : (
                        <>
                            <ul className="space-y-1">
                                {results.map((p) => (
                                    <li key={p.id}>
                                        <Link to={`/product/${p.id}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-accent-tint">
                                            <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-accent-tint"><img src={imageUrl(p.images?.[0], 120)} alt="" width="56" height="56" className="size-full object-contain mix-blend-multiply" /></span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-small font-semibold text-ink">{p.title}</span>
                                                <span className="block text-caption text-muted">{formatPrice(p.price)}</span>
                                            </span>
                                            <ArrowRight size={16} className="text-subtle" aria-hidden="true" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <button type="button" onClick={() => go(query.trim())} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-small font-semibold text-white hover:bg-primary-hover">See all results for &ldquo;{query.trim()}&rdquo; <ArrowRight size={16} aria-hidden="true" /></button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
