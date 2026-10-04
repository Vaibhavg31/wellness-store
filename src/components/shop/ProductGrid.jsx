import ProductCard from '@/components/product/ProductCard';
import Skeleton from '@/components/ui/Skeleton';

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4 lg:gap-x-6';

export function ProductGridSkeleton({ count = 8 }) {
    return (
        <div className={GRID} aria-busy="true" aria-label="Loading products">
            {Array.from({ length: count }, (_, i) => (
                <div key={i}>
                    <Skeleton className="aspect-[4/5] rounded-lg" />
                    <Skeleton className="mt-3 h-4 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-1/3" />
                </div>
            ))}
        </div>
    );
}

export default function ProductGrid({ products, emptyMessage = 'No products found.' }) {
    if (products.length === 0) {
        return <p className="py-20 text-center text-muted">{emptyMessage}</p>;
    }
    return (
        <ul className={GRID}>
            {products.map((product, i) => (
                <li key={product.id}>
                    <ProductCard product={product} priority={i < 4} />
                </li>
            ))}
        </ul>
    );
}
