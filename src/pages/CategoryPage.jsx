import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import SearchField from '@/components/shop/SearchField';
import ProductGrid, { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { filterProducts } from '@/utils/filterProducts';
import { useProducts, useCategory } from '@/hooks/useApi';

export default function CategoryPage() {
    const { slug = '' } = useParams();
    const [search, setSearch] = useState('');
    const { category, loading: categoryLoading } = useCategory(slug);
    const { products, loading: productsLoading } = useProducts();

    const items = useMemo(() => {
        const inCategory = products.filter((p) => p.category === slug);
        if (!search.trim()) return inCategory;
        return filterProducts(inCategory, { search, category: 'all', minPrice: 0, maxPrice: Infinity, sort: 'newest' });
    }, [products, slug, search]);

    if (!categoryLoading && !category) {
        return (
            <div className="container-page py-24 text-center">
                <h1>Category not found</h1>
                <Link to="/shop" className="mt-6 inline-block"><Button variant="outline">Back to shop</Button></Link>
            </div>
        );
    }

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: category?.label ?? '…' }]}
                eyebrow="Collection"
                title={category?.label ?? 'Loading…'}
                description={category?.description}
            />
            <div className="container-page py-8 lg:py-12">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-small text-muted" aria-live="polite">{!productsLoading && `${items.length} ${items.length === 1 ? 'product' : 'products'}`}</p>
                    <SearchField value={search} onChange={setSearch} placeholder={`Search in ${category?.label ?? 'collection'}…`} className="sm:w-72" />
                </div>
                {productsLoading || categoryLoading ? <ProductGridSkeleton /> : <ProductGrid products={items} emptyMessage="No products in this collection yet." />}
            </div>
        </>
    );
}
