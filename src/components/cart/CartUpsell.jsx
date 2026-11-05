import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import AddToBag from '@/components/product/AddToBag';
import { useProducts } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

const LIMIT = 3;

/** "Complete your routine": in-stock products not already in the bag, preferring the categories being bought. */
export default function CartUpsell() {
    const { items } = useCart();
    const { products } = useProducts();

    const suggestions = useMemo(() => {
        const inBag = new Set(items.map((i) => i.product.id));
        const categories = new Set(items.map((i) => i.product.category));
        return products
            .filter((p) => !inBag.has(p.id) && p.stock > 0 && !p.hasVariants && !p.isHidden)
            .map((p) => ({ product: p, score: (categories.has(p.category) ? 2 : 0) + (p.rating || 0) / 5 }))
            .sort((a, b) => b.score - a.score)
            .slice(0, LIMIT)
            .map((entry) => entry.product);
    }, [items, products]);

    if (suggestions.length === 0) return null;

    return (
        <section aria-labelledby="upsell-title" className="mt-8">
            <h2 id="upsell-title" className="mb-3 text-h4">Complete your routine</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
                {suggestions.map((product) => (
                    <li key={product.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
                        <div className="flex items-center gap-3">
                        <Link to={`/product/${product.id}`} className="shrink-0">
                            <img src={imageUrl(product.images[0], 160)} alt="" width="56" height="56" loading="lazy" className="size-14 rounded-md object-cover" />
                        </Link>
                        <div className="min-w-0 flex-1">
                            <Link to={`/product/${product.id}`} className="line-clamp-2 text-small font-medium text-ink hover:text-primary">{product.title}</Link>
                            <p className="text-caption font-semibold text-primary-deep">{formatPrice(product.price)}</p>
                        </div>
                        </div>
                        <AddToBag product={product} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
