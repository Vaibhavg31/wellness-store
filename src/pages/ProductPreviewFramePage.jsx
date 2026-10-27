import { useEffect, useState } from 'react';
import ProductDetailView from '@/components/product/ProductDetailView';
import Skeleton from '@/components/ui/Skeleton';
import { PREVIEW_MESSAGE, PREVIEW_READY } from '@/utils/productPreview';

/**
 * Runs inside the admin's preview <iframe> (same origin). It has no header, footer or popups — just the product page —
 * and shows whatever draft product the parent window sends. Because it is a real, separate viewport, the page
 * lays itself out exactly as it would on a phone or a desktop of the frame's width.
 * Only messages from the parent window of this same origin are accepted; nothing is stored or sent anywhere.
 */
export default function ProductPreviewFramePage() {
    const [product, setProduct] = useState(null);

    useEffect(() => {
        const onMessage = (event) => {
            if (event.origin !== window.location.origin || event.source !== window.parent) return;
            if (event.data?.type === PREVIEW_MESSAGE && event.data.product) setProduct(event.data.product);
        };
        window.addEventListener('message', onMessage);
        window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    // A preview is not a real shop page: links must not take the admin away from it.
    const blockLinks = (event) => {
        if (event.target instanceof Element && event.target.closest('a[href]')) event.preventDefault();
    };

    if (!product) {
        return (
            <div className="container-page grid gap-8 py-10" aria-busy="true" aria-label="Loading preview">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <div onClickCapture={blockLinks} className="bg-canvas">
            <ProductDetailView product={product} preview />
        </div>
    );
}
