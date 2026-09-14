import { useEffect, useState } from 'react';
import { useProducts } from '@/hooks/useApi';
import { getRecentlyViewedIds } from '@/hooks/useRecentlyViewed';
import ProductCard from '@/components/product/ProductCard';
import SectionTitle from '@/components/ui/SectionTitle';

/**
 * A rail of the shopper's own last-viewed products — zero-cost, per-device
 * personalization (localStorage, see useRecentlyViewed.js) that needs no
 * account, no ML, and no server round-trip beyond the catalogue fetch every
 * page already makes. Renders nothing until there's real history, and never
 * shows the product currently on screen.
 */
export default function RecentlyViewed({ excludeId, limit = 4, className = '' }) {
    const { products } = useProducts();
    const [ids, setIds] = useState([]);

    // Re-read on every mount/navigation (not a live subscription — see
    // getRecentlyViewedIds' own comment for why that's the right tradeoff).
    useEffect(() => {
        setIds(getRecentlyViewedIds());
    }, [excludeId]);

    const items = ids
        .filter((productId) => productId !== excludeId)
        .map((productId) => products.find((p) => p.id === productId))
        .filter(Boolean)
        .slice(0, limit);

    if (items.length === 0) return null;

    return (
        <section className={`py-8 sm:py-12 ${className}`}>
            <SectionTitle subtitle="Your Trail" title="Recently Viewed" className="mb-6 sm:mb-8" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {items.map((product, i) => (
                    <ProductCard key={product.id} product={product} compact index={i} />
                ))}
            </div>
        </section>
    );
}
