import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { FALLBACK_PRODUCTS } from '@/data/fallbackProducts';

export function useProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProducts = useCallback(async (cancelledRef) => {
        try {
            setLoading(true);
            const data = await api.get('/api/products');
            if (cancelledRef?.current) return;
            setProducts(Array.isArray(data) && data.length > 0 ? data : FALLBACK_PRODUCTS);
            setError(null);
        } catch (err) {
            if (cancelledRef?.current) return;
            setProducts(FALLBACK_PRODUCTS);
            setError(err instanceof Error ? err.message : 'Failed to load products');
        } finally {
            if (!cancelledRef?.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const cancelledRef = { current: false };
        fetchProducts(cancelledRef);
        return () => { cancelledRef.current = true; };
    }, [fetchProducts]);

    return { products, loading, error, refetch: fetchProducts };
}

export function useProduct(id) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return undefined;

        let cancelled = false;
        setLoading(true);
        api
            .get(`/api/products/${id}`)
            .then((data) => { if (!cancelled) setProduct(data); })
            .catch(() => {
                if (cancelled) return;
                const alias = id.startsWith('rims-') ? `krivea-${id.slice(5)}` : null;
                const fallback =
                    FALLBACK_PRODUCTS.find((p) => p.id === id) ||
                    (alias ? FALLBACK_PRODUCTS.find((p) => p.id === alias) : null);
                setProduct(fallback ?? null);
                if (!fallback) setError('Product not found');
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [id]);

    return { product, loading, error };
}

export function useTrendingProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        api
            .get('/api/products/trending')
            .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setProducts([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);
    return { products, loading };
}

/**
 * @param {'slider'|'stacked'|null} [target] Which homepage display this is
 *   for — a banner only comes back if it's tagged for that target or 'both'.
 *   Omit to get every enabled banner regardless of target.
 */
export function useBanners(target = null) {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        const path = target ? `/api/banners?target=${encodeURIComponent(target)}` : '/api/banners';
        api
            .get(path)
            .then((data) => { if (!cancelled) setBanners(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setBanners([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [target]);
    return { banners, loading };
}

export function useCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        api
            .get('/api/categories')
            .then((data) => { if (!cancelled) setCategories(data); })
            .catch(() => { if (!cancelled) setCategories([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);
    return { categories, loading };
}

export function useCategory(slug) {
    const [category, setCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!slug) return undefined;
        let cancelled = false;
        api
            .get(`/api/categories/${slug}`)
            .then((data) => { if (!cancelled) setCategory(data); })
            .catch(() => { if (!cancelled) setCategory(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [slug]);
    return { category, loading };
}

export function useReviews(productId) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchReviews = useCallback(async (cancelledRef) => {
        try {
            const query = productId ? `?productId=${productId}` : '';
            const data = await api.get(`/api/reviews${query}`);
            if (!cancelledRef?.current) setReviews(data);
        } catch {
            if (!cancelledRef?.current) setReviews([]);
        } finally {
            if (!cancelledRef?.current) setLoading(false);
        }
    }, [productId]);
    useEffect(() => {
        const cancelledRef = { current: false };
        fetchReviews(cancelledRef);
        return () => { cancelledRef.current = true; };
    }, [fetchReviews]);
    return { reviews, loading, refetch: fetchReviews };
}
