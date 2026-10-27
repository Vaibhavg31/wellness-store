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
                const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
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
 * @param {'slider'|'stacked'|'product'|null} [target] Which display this is
 *   for — a banner only comes back if it's tagged for that target (or
 *   'both', except 'product' which is never included in 'both'). Omit to
 *   get every enabled non-product banner.
 * @param {string|null} [productId] Required when target is 'product' — scopes
 *   to banners an admin attached to that one product's page.
 */
export function useBanners(target = null, productId = null) {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (target === 'product' && !productId) {
            setBanners([]);
            setLoading(false);
            return undefined;
        }
        let cancelled = false;
        const params = new URLSearchParams();
        if (target) params.set('target', target);
        if (target === 'product' && productId) params.set('productId', productId);
        const query = params.toString();
        const path = query ? `/api/banners?${query}` : '/api/banners';
        api
            .get(path)
            .then((data) => { if (!cancelled) setBanners(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setBanners([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [target, productId]);
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

export function useBundles() {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        api
            .get('/api/bundles')
            .then((data) => { if (!cancelled) setBundles(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setBundles([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);
    return { bundles, loading };
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
