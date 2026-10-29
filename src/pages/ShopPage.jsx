import { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '@/components/seo/Seo';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import SearchField from '@/components/shop/SearchField';
import FilterSheet from '@/components/shop/FilterSheet';
import ShopFilters, { ActiveFilters } from '@/components/shop/ShopFilters';
import ProductGrid, { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { filterProducts } from '@/utils/filterProducts';
import { useProducts, useCategories } from '@/hooks/useApi';
import { trackEvent } from '@/utils/analytics';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: low to high' },
    { value: 'price-high', label: 'Price: high to low' },
    { value: 'popularity', label: 'Most popular' },
];

const DEFAULT_FILTERS = { search: '', category: 'all', tag: 'all', maxPrice: Infinity, sort: 'newest' };

export default function ShopPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { products, loading } = useProducts();
    const { categories } = useCategories();
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const ceiling = useMemo(() => (products.length ? Math.max(...products.map((p) => p.price)) : 5000), [products]);

    // URL query (?category=&search=&sort=&tag=) seeds the filters, so links from the header, footer and categories work.
    useEffect(() => {
        const next = {};
        ['category', 'search', 'sort', 'tag'].forEach((key) => {
            const value = searchParams.get(key);
            if (value) next[key] = value;
        });
        setFilters((prev) => ({ ...prev, search: '', ...next }));
    }, [searchParams]);

    const tags = useMemo(() => {
        const seen = new Set();
        products.forEach((p) => (p.tags ?? []).forEach((t) => seen.add(t)));
        return [...seen].sort((a, b) => a.localeCompare(b));
    }, [products]);

    const maxPrice = filters.maxPrice === Infinity ? ceiling : filters.maxPrice;
    const filtered = useMemo(
        () => filterProducts(products, { ...filters, minPrice: 0, maxPrice }),
        [products, filters, maxPrice],
    );

    // Funnel: what people search for (and whether we had it). Waits until they stop typing; each term is counted once.
    const searchTerm = filters.search.trim().toLowerCase();
    const lastSearchSent = useRef('');
    useEffect(() => {
        if (loading || searchTerm.length < 2 || searchTerm === lastSearchSent.current) return undefined;
        const timer = setTimeout(() => {
            lastSearchSent.current = searchTerm;
            trackEvent('search', { label: searchTerm, qty: filtered.length, path: '/shop', pageType: 'shop' });
        }, 1500);
        return () => clearTimeout(timer);
    }, [searchTerm, loading, filtered.length]);

    const update = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        if (key === 'search') {
            const next = new URLSearchParams(searchParams);
            if (String(value).trim()) next.set('search', value);
            else next.delete('search');
            setSearchParams(next, { replace: true });
        }
    };

    const filtersActive = filters.category !== 'all' || filters.tag !== 'all' || filters.maxPrice !== Infinity || filters.search;
    const reset = () => {
        setFilters(DEFAULT_FILTERS);
        setSearchParams({}, { replace: true });
    };

    // Faceted counts: each group counts what would be shown if that row were picked, given the other filters.
    const counts = useMemo(() => {
        const base = { ...filters, minPrice: 0, maxPrice };
        const category = {};
        categories.forEach((c) => { category[c.slug] = filterProducts(products, { ...base, category: c.slug }).length; });
        const tag = {};
        tags.forEach((t) => { tag[t] = filterProducts(products, { ...base, tag: t }).length; });
        return { category, tag, categoryTotal: filterProducts(products, { ...base, category: 'all' }).length };
    }, [products, categories, tags, filters, maxPrice]);

    const activeCount = [filters.category !== 'all', filters.tag !== 'all', filters.maxPrice !== Infinity && filters.maxPrice < ceiling].filter(Boolean).length;
    const panel = (idPrefix) => (
        <ShopFilters categories={categories} tags={tags} filters={filters} counts={counts} ceiling={ceiling} maxPrice={maxPrice} onChange={update} idPrefix={idPrefix} />
    );

    return (
        <>
            <Seo title="Shop Ayurvedic Wellness Products" description="Shop lab-tested, clean-label Ayurvedic supplements, juices, gummies and personal care from Chikit. Free delivery above the threshold, easy returns and COD." path="/shop" />
            <PageHeader
                compact
                crumbs={[{ label: 'Home', href: '/' }, { label: 'Shop' }]}
                title="Shop all"
                description="Lab-tested, clean-label Ayurvedic wellness."
            />

            <div className="container-page py-6 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-14 lg:py-12">
                <aside className="hidden lg:block" aria-label="Filters">
                    <div className="sticky top-28">
                        <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
                            <h2 className="font-sans text-h4">Filters</h2>
                            {filtersActive && <button type="button" onClick={reset} className="text-small font-medium text-muted underline underline-offset-4 hover:text-primary">Clear all</button>}
                        </div>
                        {panel('d')}
                    </div>
                </aside>

                <section aria-labelledby="shop-products" className="min-w-0">
                    <h2 id="shop-products" className="sr-only">Products</h2>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <SearchField value={filters.search} onChange={(v) => update('search', v)} placeholder="Search products…" className="sm:flex-1" />
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setFilterOpen(true)} className="flex-1 lg:hidden">
                                <SlidersHorizontal size={16} aria-hidden="true" /> Filters
                                {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-caption leading-none text-white">{activeCount}</span>}
                            </Button>
                            <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
                                <label className="sr-only" htmlFor="shop-sort">Sort products</label>
                                <select
                                    id="shop-sort"
                                    value={filters.sort}
                                    onChange={(e) => update('sort', e.target.value)}
                                    className="h-11 w-full min-w-0 appearance-none rounded-full border border-line-strong bg-surface pl-4 pr-10 text-small text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4">
                        <p className="text-small text-muted" aria-live="polite">
                            {loading ? ' ' : <><span className="font-semibold text-ink">{filtered.length}</span> {filtered.length === 1 ? 'product' : 'products'}</>}
                        </p>
                        <ActiveFilters filters={filters} categories={categories} ceiling={ceiling} onRemove={update} onClear={reset} />
                    </div>

                    {loading ? <ProductGridSkeleton /> : <ProductGrid products={filtered} emptyMessage="No products match your filters. Try adjusting them." />}
                    {!loading && filtered.length === 0 && filtersActive && (
                        <div className="-mt-6 flex justify-center pb-10">
                            <Button variant="outline" onClick={reset}>Clear search and filters</Button>
                        </div>
                    )}
                </section>
            </div>

            <FilterSheet
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                categories={categories}
                tags={tags}
                filters={filters}
                counts={counts}
                ceiling={ceiling}
                maxPrice={maxPrice}
                onChange={update}
                sortOptions={SORT_OPTIONS}
                resultCount={filtered.length}
                activeCount={activeCount}
                onReset={reset}
            />
        </>
    );
}
