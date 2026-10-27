import { useParams, Link } from 'react-router-dom';
import ProductDetailView from '@/components/product/ProductDetailView';
import Button from '@/components/ui/Button';
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

    if (loading) return <ProductSkeleton />;

    if (!product) {
        return (
            <div className="container-page py-24 text-center">
                <h1>Product not found</h1>
                <Link to="/shop" className="mt-6 inline-block"><Button variant="outline">Back to shop</Button></Link>
            </div>
        );
    }

    // Fades in over the skeleton instead of popping in.
    return <div className="animate-fade-in"><ProductDetailView product={product} reviews={reviews} refetchReviews={refetchReviews} productBanners={productBanners} /></div>;
}
