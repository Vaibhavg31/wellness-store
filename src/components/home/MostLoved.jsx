import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useProducts, useTrendingProducts } from '@/hooks/useApi';

const inStock = (p) => !(typeof p.stock === 'number' && p.stock <= 0);

/**
 * "Most loved right now": a short shelf of the products shoppers choose most, right before the offers, so the offers read as
 * a way to buy what they have just seen. Automatic: products pinned as trending first, then best sellers. Or the admin picks
 * the products. Title, line, mode and how many are set in Admin → Content → Homepage Sections.
 */
export default function MostLoved() {
    const { content } = useSiteContent();
    const { products } = useProducts();
    const { products: pinned } = useTrendingProducts();
    const cfg = content.extras.bestSellers;
    const count = Math.min(8, Math.max(2, Number(cfg.count) || 4));

    const picks = useMemo(() => {
        const live = products.filter((p) => p.images?.[0]);
        let chosen;
        if (cfg.mode === 'custom') {
            const byId = new Map(live.map((p) => [p.id, p]));
            chosen = cfg.productIds.map((id) => byId.get(id)).filter(Boolean);
        } else {
            const pinnedIds = new Set(pinned.map((p) => p.id));
            chosen = [...live.filter((p) => pinnedIds.has(p.id)), ...live.filter((p) => p.isBestSeller && !pinnedIds.has(p.id)), ...live.filter((p) => p.isNew && !p.isBestSeller && !pinnedIds.has(p.id))];
        }
        const seen = new Set();
        return chosen.filter((p) => !seen.has(p.id) && seen.add(p.id)).sort((a, b) => Number(inStock(b)) - Number(inStock(a))).slice(0, count);
    }, [products, pinned, cfg.mode, cfg.productIds, count]);

    if (picks.length < 2) return null;

    return (
        <section aria-labelledby="most-loved-title" className="container-page py-10 lg:py-14">
            <div className="mb-6 flex items-end justify-between gap-4 lg:mb-8">
                <div className="min-w-0">
                    <h2 id="most-loved-title">{cfg.title}</h2>
                    {cfg.subtitle && <p className="mt-2 text-body text-muted lg:text-lead">{cfg.subtitle}</p>}
                </div>
                <Link to="/shop" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-small font-semibold text-primary hover:underline">Shop all <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
                {picks.map((product, i) => <ProductCard key={product.id} product={product} priority={i < 2} />)}
            </div>
        </section>
    );
}
