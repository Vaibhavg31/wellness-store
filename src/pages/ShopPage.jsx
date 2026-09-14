import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import InstagramStrip from '@/components/home/InstagramStrip';
import ProductCard from '@/components/product/ProductCard';
import Drawer from '@/components/ui/Drawer';
import AmbientBlobs from '@/components/ui/AmbientBlobs';
import CategoryCircles from '@/components/shop/CategoryCircles';
import CategoryFilterTabs from '@/components/shop/CategoryFilterTabs';
import GoalChipStrip from '@/components/shop/GoalChipStrip';
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

    const SortSelect = ({ className = '' }) => (
        <select
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className={`text-xs sm:text-sm tracking-wide border border-ink/20 px-2 sm:px-3 py-2 rounded-full bg-cream text-ink focus:outline-none focus:border-forest/40 ${className}`}
            aria-label="Sort products"
        >
            <option value="newest">Newest</option>
            <option value="price-low">Price ↑</option>
            <option value="price-high">Price ↓</option>
            <option value="popularity">Popular</option>
        </select>
    );

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
                <SortSelect className="w-full !rounded-lg" />
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
                <div className="max-w-7xl mx-auto pt-3 sm:pt-8 space-y-6 sm:space-y-10">

                    {/* Shop hero strip — decorative, replaces the plain section
                        heading with a real banner treatment (ambient blobs on the
                        brand-dark surface) so the shop page opens with the same
                        visual language as the home hero. */}
                    <section className="relative overflow-hidden rounded-3xl bg-forest text-cream px-6 py-9 sm:px-10 sm:py-12">
                        <AmbientBlobs variant="dark" />
                        <div className="relative z-10 max-w-2xl">
                            <p className="type-eyebrow text-turmeric-light/80 mb-3">
                                {filtered.length} {filtered.length === 1 ? 'product' : 'products'} · Everyday Wellness Collection
                            </p>
                            <h1 className="font-display text-2xl sm:text-4xl font-semibold leading-tight mb-3">
                                Find what your routine is missing
                            </h1>
                            <p className="text-cream/70 text-sm sm:text-base leading-relaxed">
                                Lab-tested, clean-label supplements — filter by goal, category, or search below.
                            </p>
                        </div>
                    </section>

                    {/* Goal + category browsing — hidden on phone; tabs below handle filtering */}
                    <section className="hidden sm:block">
                        <CategoryCircles
                            activeSlug={filters.category === 'all' ? null : filters.category}
                            activeGoal={filters.goal === 'all' ? null : filters.goal}
                            onSelect={setCategory}
                        />
                    </section>

                    {/* Sidebar (lg+) + product grid */}
                    <div className="lg:grid lg:grid-cols-[272px_1fr] lg:gap-10 lg:items-start">
                        <aside className="hidden lg:block sticky top-[calc(var(--site-header-h,7rem)+1.25rem)]">
                            <div className="flex items-center gap-2 mb-5">
                                <SlidersHorizontal size={16} className="text-forest" />
                                <h2 className="font-display text-lg text-ink">Refine</h2>
                            </div>
                            <FilterControls />
                        </aside>

                        <section>
                            {/* Mobile / tablet controls */}
                            <div className="lg:hidden">
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
                            </div>

                            <div className="flex items-center justify-between mt-3 lg:mt-0 mb-3 sm:mb-5 gap-3">
                                <p className="hidden lg:block text-sm text-slate">
                                    {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
                                </p>
                                <p className="lg:hidden text-xs text-slate">
                                    {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
                                </p>
                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setFilterOpen(true)}
                                        className="lg:hidden flex items-center gap-1.5 type-eyebrow text-ink border border-ink/20 px-3 py-2 rounded-full hover:border-forest/40 hover:text-forest transition-colors"
                                    >
                                        <SlidersHorizontal size={14} />
                                        Filters
                                    </button>
                                    <SortSelect className="lg:hidden" />
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
                                        className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-5"
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
            </div>

            <Drawer isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
                <FilterControls />
            </Drawer>
        </div>
    );
}
