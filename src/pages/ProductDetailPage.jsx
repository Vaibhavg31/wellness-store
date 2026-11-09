import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { trackEvent } from '@/utils/analytics';
import { PackageX } from 'lucide-react';
import ProductDetailView from '@/components/product/ProductDetailView';
import EmptyState from '@/components/ui/EmptyState';
import PopularPicks from '@/components/shop/PopularPicks';
import Seo from '@/components/seo/Seo';
import Skeleton from '@/components/ui/Skeleton';
import { useBanners, useProduct, useReviews } from '@/hooks/useApi';

function ProductSkeleton() {
    return (
        <div className="container-page grid gap-10 py-10 lg:grid-cols-2 lg:gap-16" aria-busy="true" aria-label="Loading product">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
}

export default function ProductDetailPage() {
    const { id = '' } = useParams();
    const { product, loading } = useProduct(id);
    const { reviews, refetch: refetchReviews } = useReviews(id);
    const { banners: productBanners } = useBanners('product', product?.id);

    // Funnel: this visitor opened this product (once per product, however many times the page re-renders).
    const productId = product?.id;
    useEffect(() => {
        if (productId) trackEvent('product_view', { productId, path: `/product/${productId}`, pageType: 'product' });
    }, [productId]);

    if (loading) return <ProductSkeleton />;

    if (!product) {
        // An old link (a removed or hidden product): say so plainly and offer favourites, instead of a bare heading.
        return (
            <div className="container-page py-16">
                <Seo noindex title="Product not available" />
                <EmptyState as="h1" icon={PackageX} title="This product is not available" description="It may have been removed or is not on sale right now. Here are some customer favourites instead." actionLabel="Browse the shop" actionHref="/shop" />
                <PopularPicks />
            </div>
        );
    }

    // Fades in over the skeleton instead of popping in.
    return <div className="animate-fade-in"><ProductDetailView product={product} reviews={reviews} refetchReviews={refetchReviews} productBanners={productBanners} /></div>;
}
