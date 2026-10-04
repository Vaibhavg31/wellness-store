import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Drawer from '@/components/ui/Drawer';
import Button from '@/components/ui/Button';
import SearchField from '@/components/shop/SearchField';
import Chip from '@/components/shop/Chip';
import ProductGrid, { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { filterProducts } from '@/utils/filterProducts';
import { formatPrice } from '@/utils/formatPrice';
import { useProducts, useCategories } from '@/hooks/useApi';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: low to high' },
    { value: 'price-high', label: 'Price: high to low' },
    { value: 'popularity', label: 'Most popular' },
];

const DEFAULT_FILTERS = { search: '', category: 'all', tag: 'all', maxPrice: Infinity, sort: 'newest' };

function FilterGroup({ title, children }) {
    return (
        <fieldset className="border-0 p-0">
            <legend className="mb-3 text-small font-semibold text-ink">{title}</legend>
            {children}
        </fieldset>
    );
}

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

    const controls = (
        <div className="space-y-8">
            <FilterGroup title="Category">
                <div className="flex flex-wrap gap-2">
                    <Chip active={filters.category === 'all'} onClick={() => update('category', 'all')}>All</Chip>
                    {categories.map((c) => (
                        <Chip key={c.slug} active={filters.category === c.slug} onClick={() => update('category', c.slug)}>{c.label}</Chip>
                    ))}
                </div>
            </FilterGroup>
            {tags.length > 0 && (
                <FilterGroup title="Tag">
                    <div className="flex flex-wrap gap-2">
                        <Chip active={filters.tag === 'all'} onClick={() => update('tag', 'all')}>All</Chip>
                        {tags.map((tag) => <Chip key={tag} active={filters.tag === tag} onClick={() => update('tag', tag)}>{tag}</Chip>)}
                    </div>
                </FilterGroup>
            )}
            <FilterGroup title={`Max price: ${formatPrice(maxPrice)}`}>
                <input
                    type="range"
                    min={0}
                    max={ceiling}
                    step={50}
                    value={maxPrice}
                    onChange={(e) => update('maxPrice', Number(e.target.value))}
                    className="w-full accent-primary"
                    aria-label="Maximum price"
                />
            </FilterGroup>
            {filtersActive && <Button variant="ghost" size="sm" onClick={reset}>Clear all filters</Button>}
        </div>
    );

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'Home', href: '/' }, { label: 'Shop' }]}
                title="Shop all"
                description="Lab-tested, clean-label Ayurvedic wellness — filter by category, tag or price."
            />

            <div className="container-page py-8 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12 lg:py-12">
                <aside className="hidden lg:block" aria-label="Filters">
                    <div className="sticky top-28">
                        <h2 className="mb-6 flex items-center gap-2 font-sans text-h4"><SlidersHorizontal size={18} aria-hidden="true" /> Filters</h2>
                        {controls}
                    </div>
                </aside>

                <section aria-label="Products">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <SearchField value={filters.search} onChange={(v) => update('search', v)} placeholder="Search products…" className="sm:flex-1" />
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setFilterOpen(true)} className="lg:hidden">
                                <SlidersHorizontal size={16} aria-hidden="true" /> Filters
                            </Button>
                            <label className="sr-only" htmlFor="shop-sort">Sort products</label>
                            <select
                                id="shop-sort"
                                value={filters.sort}
                                onChange={(e) => update('sort', e.target.value)}
                                className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-small text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:flex-none"
                            >
                                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {!loading && <p className="mb-5 text-small text-muted" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</p>}

                    {loading ? <ProductGridSkeleton /> : <ProductGrid products={filtered} emptyMessage="No products match your filters. Try adjusting them." />}
                </section>
            </div>

            <Drawer isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
                {controls}
                <Button onClick={() => setFilterOpen(false)} className="mt-8 w-full">Show {filtered.length} products</Button>
            </Drawer>
        </>
    );
}
