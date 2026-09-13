import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import CategoryCircles from '@/components/shop/CategoryCircles';
import ShopSectionHeading from '@/components/shop/ShopSectionHeading';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function QuickShop({ products, apiError }) {
    const { content } = useSiteContent();
    const featured = content.featured;
    const count = featured.productCount ?? 8;
    const displayProducts = products.slice(0, count);

    return (
        <section className="py-8 sm:py-12 md:py-16 bg-cream relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#FFF9F5] to-transparent pointer-events-none" aria-hidden="true" />

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <ShopSectionHeading title={featured.collectionTitle} className="mb-3 sm:mb-5" />
                <CategoryCircles linkMode />

                <div className="flex items-end justify-between mt-6 sm:mt-10 mb-4 sm:mb-6 gap-4">
                    <ShopSectionHeading title={featured.stylesTitle} align="left" className="mb-0 flex-1" />
                    <Link
                        to="/shop"
                        className="hidden sm:flex items-center gap-1.5 text-xs text-forest hover:text-forest-light transition-colors group font-medium"
                    >
                        {featured.viewAllLabel}
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {apiError && (
                    <p className="text-xs text-slate/70 mb-4">
                        Showing curated pieces. Start the API with <code className="bg-sand px-1 rounded">npm run dev:all</code> for live inventory.
                    </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                    {displayProducts.map((product, i) => (
                        <ProductCard key={product.id} product={product} compact index={i} />
                    ))}
                </div>

                <div className="text-center mt-8 sm:hidden">
                    <Link to="/shop" className="inline-flex items-center gap-2 text-xs text-forest font-medium tracking-wide uppercase">
                        {featured.viewAllLabel} <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
