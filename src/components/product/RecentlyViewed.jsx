import { useEffect, useState } from 'react';
import { useProducts } from '@/hooks/useApi';
import { getRecentlyViewedIds } from '@/hooks/useRecentlyViewed';
import ProductCard from '@/components/product/ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';

/** The shopper's own last-viewed products (per-device, localStorage). Renders nothing until there is history. */
export default function RecentlyViewed({ excludeId, limit = 4 }) {
    const { products } = useProducts();
    const [ids, setIds] = useState([]);

    useEffect(() => {
        setIds(getRecentlyViewedIds());
    }, [excludeId]);

    const items = ids
        .filter((id) => id !== excludeId)
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, limit);

    if (items.length === 0) return null;

    return (
        <section className="section border-t border-line">
            <div className="container-page">
                <SectionHeader eyebrow="Your trail" title="Recently viewed" align="left" />
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
                    {items.map((product) => <li key={product.id}><ProductCard product={product} /></li>)}
                </ul>
            </div>
        </section>
    );
}
