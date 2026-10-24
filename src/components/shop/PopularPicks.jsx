import { useMemo } from 'react';
import ProductCard from '@/components/product/ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { useProducts, useTrendingProducts } from '@/hooks/useApi';

/** "Popular right now": keeps empty bag / wishlist pages useful. Trending first, then best sellers. */
export default function PopularPicks({ title = 'Popular right now', count = 4 }) {
    const { products: trending } = useTrendingProducts();
    const { products } = useProducts();
    const picks = useMemo(() => {
        const seen = new Set();
        return [...trending, ...products.filter((p) => p.isBestSeller), ...products]
            .filter((p) => !seen.has(p.id) && seen.add(p.id))
            .slice(0, count);
    }, [trending, products, count]);
    if (picks.length === 0) return null;

    return (
        <section className="mt-6 border-t border-line pt-12 pb-4">
            <SectionHeader eyebrow="Discover" title={title} className="!mb-8" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
                {picks.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
        </section>
    );
}
