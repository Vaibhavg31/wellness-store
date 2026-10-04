import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Skeleton from '@/components/ui/Skeleton';
import Reveal from '@/components/ui/Reveal';
import { cn } from '@/utils/formatPrice';

function GridSkeleton({ count }) {
    return Array.from({ length: count }, (_, i) => (
        <div key={i}>
            <Skeleton className="aspect-[4/5] rounded-lg" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
    ));
}

export default function ProductSection({ eyebrow, title, products, loading = false, count = 8, viewAllLabel = 'View all', tint = false }) {
    if (!loading && products.length === 0) return null;
    const shown = products.slice(0, count);

    return (
        <section className={cn('section', tint ? 'bg-canvas-alt' : 'bg-canvas')}>
            <div className="container-page">
                <SectionHeader
                    eyebrow={eyebrow}
                    title={title}
                    align="left"
                    action={(
                        <Link to="/shop" className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline">
                            {viewAllLabel} <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    )}
                />
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
                    {loading ? <GridSkeleton count={Math.min(count, 4)} /> : shown.map((product, i) => (
                        <Reveal key={product.id} delay={(i % 4) * 60}>
                            <ProductCard product={product} />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
