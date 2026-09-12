import { Link } from 'react-router-dom';
import { ArrowRight, Flame } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import ShopSectionHeading from '@/components/shop/ShopSectionHeading';
import { useTrendingProducts } from '@/hooks/useApi';

export default function TrendingProducts() {
    const { products, loading } = useTrendingProducts();

    if (!loading && products.length === 0) return null;

    return (
        <section className="py-8 sm:py-12 md:py-16 bg-warm-beige/20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-4 sm:mb-6 gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-wine mb-1.5">
                            <Flame size={14} className="fill-wine/15" />
                            <span className="type-eyebrow-sm">Trending Now</span>
                        </div>
                        <ShopSectionHeading title="What Everyone's Buying" align="left" className="mb-0" />
                    </div>
                    <Link
                        to="/shop?sort=popularity"
                        className="hidden sm:flex items-center gap-1.5 text-xs text-wine hover:text-wine-light transition-colors group font-medium flex-shrink-0"
                    >
                        View all
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="aspect-[3/4] rounded-2xl bg-warm-beige/80 mb-4" />
                                <div className="h-3 w-16 bg-warm-beige/80 rounded mb-2" />
                                <div className="h-4 w-full bg-warm-beige/60 rounded" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                        {products.map((product, i) => (
                            <ProductCard key={product.id} product={product} compact index={i} />
                        ))}
                    </div>
                )}

                <div className="text-center mt-8 sm:hidden">
                    <Link to="/shop?sort=popularity" className="inline-flex items-center gap-2 text-xs text-wine font-medium tracking-wide uppercase">
                        View all <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
