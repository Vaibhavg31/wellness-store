import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import InstagramStrip from '@/components/home/InstagramStrip';
import ProductCard from '@/components/product/ProductCard';
import Drawer from '@/components/ui/Drawer';
import CategoryCircles from '@/components/shop/CategoryCircles';
import CategoryFilterTabs from '@/components/shop/CategoryFilterTabs';
import GoalChipStrip from '@/components/shop/GoalChipStrip';
import ShopSectionHeading from '@/components/shop/ShopSectionHeading';
import ProductSearchBar from '@/components/search/ProductSearchBar';
import { filterProducts } from '@/utils/filterProducts';
import { useProducts, useCategories } from '@/hooks/useApi';

export default function ShopPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { products, loading } = useProducts();
    const { categories } = useCategories();
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: 'all',
        goal: 'all',
        tag: 'all',
        minPrice: 0,
        maxPrice: Infinity,
        sort: 'newest',
    });

    // Real catalog ceiling instead of a hardcoded jewelry-era ₹100,000 cap —
    // this store's products top out nowhere near that.
    const computedMaxPrice = useMemo(() => {
        if (!products.length) return 5000;
        return Math.max(...products.map((p) => p.price));
    }, [products]);

    useEffect(() => {
        const category = searchParams.get('category');
        const goal = searchParams.get('goal');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort');
        const tag = searchParams.get('tag');
        setFilters((prev) => ({
            ...prev,
            ...(category ? { category } : {}),
            ...(goal ? { goal } : {}),
            ...(search ? { search } : {}),
            ...(sort ? { sort } : {}),
            ...(tag ? { tag } : {}),
        }));
    }, [searchParams]);

    const availableTags = useMemo(() => {
        const seen = new Set();
        products.forEach((p) => (p.tags ?? []).forEach((t) => seen.add(t)));
        return Array.from(seen).sort((a, b) => a.localeCompare(b));
    }, [products]);

    const effectiveFilters = useMemo(
        () => ({ ...filters, maxPrice: filters.maxPrice === Infinity ? computedMaxPrice : filters.maxPrice }),
        [filters, computedMaxPrice]
    );

    const filtered = useMemo(() => filterProducts(products, effectiveFilters), [products, effectiveFilters]);

    const updateFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        if (key === 'search') {
            const next = new URLSearchParams(searchParams);
            const trimmed = String(value || '').trim();
            if (trimmed) next.set('search', trimmed);
            else next.delete('search');
            setSearchParams(next, { replace: true });
        }
    };

    const setCategory = (slug) => {
        updateFilter('category', slug);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const FilterControls = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-3">Search</label>
                <ProductSearchBar
                    value={filters.search}
                    onChange={(value) => updateFilter('search', value)}
                    placeholder="Search proteins, vitamins, herbal blends…"
                    size="compact"
                />
            </div>
            <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-3">Goal</label>
                <GoalChipStrip activeGoal={filters.goal === 'all' ? null : filters.goal} eager />
            </div>
            <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-3">Category</label>
                <CategoryFilterTabs
                    categories={categories}
                    active={filters.category}
                    onChange={(slug) => updateFilter('category', slug)}
                />
            </div>
            {availableTags.length > 0 && (
                <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-3">Tag</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => updateFilter('tag', 'all')}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                filters.tag === 'all'
                                    ? 'bg-forest text-cream border-forest'
                                    : 'border-border/60 text-slate hover:border-forest/40 hover:text-forest bg-cream'
                            }`}
                        >
                            All
                        </button>
                        {availableTags.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => updateFilter('tag', tag)}
                                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                    filters.tag === tag
                                        ? 'bg-forest text-cream border-forest'
                                        : 'border-border/60 text-slate hover:border-forest/40 hover:text-forest bg-cream'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-3">
                    Price Range: ₹{filters.minPrice} to ₹{effectiveFilters.maxPrice}
                </label>
                <input
                    type="range"
                    min={0}
                    max={computedMaxPrice}
                    step={50}
                    value={effectiveFilters.maxPrice}
                    onChange={(e) => updateFilter('maxPrice', Number(e.target.value))}
                    className="w-full accent-forest"
                    aria-label="Maximum price filter"
                />
            </div>
            <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-3">Sort By</label>
                <select
                    value={filters.sort}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                    className="w-full px-4 py-3 bg-cream border border-border/60 text-ink text-sm focus:outline-none focus:border-forest/40 rounded-lg"
                >
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="popularity">Popularity</option>
                </select>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-16 sm:pb-20 bg-cream">
            <InstagramStrip />
            <div className="px-3 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto pt-3 sm:pt-8 space-y-5 sm:space-y-10">

                {/* Goal + category browsing — hidden on phone; tabs below handle filtering */}
                <section className="hidden sm:block">
                    <ShopSectionHeading title="Everyday Wellness Collection" className="mb-4 sm:mb-7" />
                    <CategoryCircles
                        activeSlug={filters.category === 'all' ? null : filters.category}
                        activeGoal={filters.goal === 'all' ? null : filters.goal}
                        onSelect={setCategory}
                    />
                </section>

                {/* Filter tabs + products */}
                <section>
                    <ShopSectionHeading title="Trending Now" className="mb-3 sm:mb-6" />
                    <ProductSearchBar
                        value={filters.search}
                        onChange={(value) => updateFilter('search', value)}
                        placeholder="Search in shop…"
                        className="mb-4"
                        onSubmit={(q) => navigate(q.trim() ? `/shop?search=${encodeURIComponent(q.trim())}` : '/shop')}
                    />
                    <CategoryFilterTabs
                        categories={categories}
                        active={filters.category}
                        onChange={setCategory}
                    />

                    <div className="flex items-center justify-between mt-3 sm:mt-6 mb-3 sm:mb-5 gap-3">
                        <p className="text-xs text-slate">
                            {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setFilterOpen(true)}
                                className="flex items-center gap-1.5 type-eyebrow text-ink border border-ink/20 px-3 py-2 rounded-sm hover:border-forest/40 hover:text-forest transition-colors"
                            >
                                <SlidersHorizontal size={14} />
                                Filters
                            </button>
                            <select
                                value={filters.sort}
                                onChange={(e) => updateFilter('sort', e.target.value)}
                                className="text-xs sm:text-sm tracking-wide border border-ink/20 px-2 sm:px-3 py-2 rounded-sm bg-cream text-ink focus:outline-none focus:border-forest/40"
                                aria-label="Sort products"
                            >
                                <option value="newest">Newest</option>
                                <option value="price-low">Price ↑</option>
                                <option value="price-high">Price ↓</option>
                                <option value="popularity">Popular</option>
                            </select>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {filtered.length > 0 ? (
                            <motion.div
                                key={filters.category + filters.goal + filters.sort + filtered.length}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4"
                            >
                                {filtered.map((product, i) => (
                                    <ProductCard key={product.id} product={product} compact index={i} />
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16 sm:py-20"
                            >
                                <p className="font-display text-xl sm:text-2xl mb-2 text-ink">No products found</p>
                                <p className="text-slate text-sm">Try a different search or adjust filters</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </div>
            </div>

            <Drawer isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
                <FilterControls />
            </Drawer>
        </div>
    );
}
