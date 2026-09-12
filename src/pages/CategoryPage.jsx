import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '@/components/product/ProductCard';
import Button from '@/components/ui/Button';
import CategoryCircles from '@/components/shop/CategoryCircles';
import ShopSectionHeading from '@/components/shop/ShopSectionHeading';
import ProductSearchBar from '@/components/search/ProductSearchBar';
import { filterProducts } from '@/utils/filterProducts';
import { useProducts, useCategory } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';

export default function CategoryPage() {
    const { slug = '' } = useParams();
    const [search, setSearch] = useState('');
    const { category, loading: catLoading } = useCategory(slug);
    const { products, loading: prodLoading } = useProducts();
    const categoryProducts = useMemo(() => {
        const inCategory = products.filter((p) => p.category === slug);
        if (!search.trim()) return inCategory;
        return filterProducts(inCategory, {
            search,
            category: 'all',
            minPrice: 0,
            maxPrice: 100000,
            sort: 'newest',
        });
    }, [products, slug, search]);

    if (catLoading || prodLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-wine/30 border-t-wine rounded-full animate-spin" />
            </div>
        );
    }

    if (!category) {
        return (
            <div className="pb-20 pt-8 text-center px-6">
                <h1 className="font-serif text-3xl mb-4">Category Not Found</h1>
                <Link to="/shop"><Button variant="outline">Back to Shop</Button></Link>
            </div>
        );
    }

    return (
        <div className="pb-16 sm:pb-20 bg-ivory">
            {/* Hero banner */}
            <div className="relative h-44 sm:h-52 md:h-60 overflow-hidden -mt-[var(--site-header-h,7rem)] mb-6 sm:mb-8">
                <img src={imageUrl(category.image)} alt={category.label} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/45 to-charcoal/30" />
                <div className="absolute inset-0 flex flex-col justify-end max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 pt-[calc(var(--site-header-h,7rem)+0.5rem)]">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                        <p className="text-[10px] tracking-[0.28em] uppercase text-gold mb-1.5">Collection</p>
                        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-ivory">{category.label}</h1>
                        <p className="text-ivory/75 text-xs sm:text-sm mt-1 max-w-md">{category.description}</p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6">
                <section>
                    <ShopSectionHeading title="Browse Collections" className="mb-4" />
                    <CategoryCircles activeSlug={slug} linkMode />
                </section>

                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <p className="text-xs text-soft-brown">
                            {categoryProducts.length} {categoryProducts.length === 1 ? 'piece' : 'pieces'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                            <ProductSearchBar
                                value={search}
                                onChange={setSearch}
                                placeholder={`Search in ${category.label}…`}
                                size="compact"
                                className="w-full sm:w-64"
                            />
                            <Link to="/shop" className="text-[10px] tracking-[0.12em] uppercase text-wine hover:text-wine-light transition-colors text-right sm:text-left">
                                View all →
                            </Link>
                        </div>
                    </div>

                    {categoryProducts.length > 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4"
                        >
                            {categoryProducts.map((product, i) => (
                                <ProductCard key={product.id} product={product} compact index={i} />
                            ))}
                        </motion.div>
                    ) : (
                        <p className="text-soft-brown text-center py-16 text-sm">No products in this category yet.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
