import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, RefreshCw, Orbit } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/formatPrice';
import ProductSearchSelect from '@/components/admin/ProductSearchSelect';
import { AdminLoadingState, AdminEmptyState, AdminIconButton } from '@/components/admin/AdminUi';

/**
 * Curates the homepage "Orbit Ring" — deliberately NOT a random/automatic
 * pick. Every product shown there (center rotation and the ring around it)
 * comes from this exact list, in this exact order; nothing else ever
 * appears. A product can also be added/removed from its own edit page
 * ("Feature in Orbit Ring" checkbox) — both write to the same
 * orbitFeatured/orbitSortOrder fields, so this list and that checkbox never
 * disagree with each other.
 */
export default function OrbitRingManager() {
    const { adminToken } = useAdminAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [addValue, setAddValue] = useState('');

    const fetchProducts = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/products/admin/all', adminToken);
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [adminToken]);

    const curated = useMemo(
        () => products
            .filter((p) => p.orbitFeatured)
            .sort((a, b) => (a.orbitSortOrder ?? 0) - (b.orbitSortOrder ?? 0)),
        [products],
    );

    const addableProducts = useMemo(
        () => products.filter((p) => !p.orbitFeatured),
        [products],
    );

    const addProduct = async (productId) => {
        if (!adminToken || !productId) return;
        setBusy(true);
        try {
            const nextOrder = curated.length
                ? Math.max(...curated.map((p) => p.orbitSortOrder ?? 0)) + 1
                : 0;
            await api.put(`/api/products/${productId}`, { orbitFeatured: true, orbitSortOrder: nextOrder }, adminToken);
            await fetchProducts();
        } finally {
            setBusy(false);
            setAddValue('');
        }
    };

    const removeProduct = async (productId) => {
        if (!adminToken) return;
        setBusy(true);
        try {
            await api.put(`/api/products/${productId}`, { orbitFeatured: false }, adminToken);
            await fetchProducts();
        } finally {
            setBusy(false);
        }
    };

    const move = async (index, direction) => {
        const target = index + direction;
        if (!adminToken || target < 0 || target >= curated.length) return;
        const a = curated[index];
        const b = curated[target];
        setBusy(true);
        try {
            // Swap orbitSortOrder between the two — two writes, but each is
            // pinned to just the one field so neither can clobber the other's
            // unrelated data.
            await Promise.all([
                api.put(`/api/products/${a.id}`, { orbitSortOrder: b.orbitSortOrder ?? 0 }, adminToken),
                api.put(`/api/products/${b.id}`, { orbitSortOrder: a.orbitSortOrder ?? 0 }, adminToken),
            ]);
            await fetchProducts();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <p className="text-xs text-admin-muted mb-4">
                Only the products listed here ever appear in the homepage Orbit Ring — the center rotation
                and the ring around it both pull strictly from this list, in this order. Nothing is chosen
                automatically. Add at least one product or the section stays hidden.
            </p>

            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 min-w-0">
                    <ProductSearchSelect
                        products={addableProducts}
                        value={addValue}
                        onChange={(id) => { setAddValue(id); if (id) addProduct(id); }}
                        placeholder="Search a product to add…"
                        emptyOptionLabel="Choose a product…"
                        publishedOnly
                    />
                </div>
                {busy && <RefreshCw size={16} className="animate-spin text-admin-muted shrink-0" />}
            </div>

            {loading ? (
                <AdminLoadingState />
            ) : curated.length === 0 ? (
                <AdminEmptyState
                    icon={Orbit}
                    title="No products chosen yet"
                    description="The Orbit Ring section is hidden on your homepage until you add at least one product above."
                />
            ) : (
                <ul className="space-y-2">
                    {curated.map((product, i) => (
                        <li
                            key={product.id}
                            className="flex items-center gap-3 rounded-xl border border-admin-border bg-admin-surface-alt p-2.5"
                        >
                            <img
                                src={imageUrl(product.cutoutImages?.[0] || product.images?.[0])}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover border border-admin-border bg-white shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-ink truncate">{product.title}</p>
                                <p className="text-xs text-admin-muted">{formatPrice(product.price)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <AdminIconButton
                                    onClick={() => move(i, -1)}
                                    icon={ArrowUp}
                                    title="Move up"
                                    disabled={busy || i === 0}
                                />
                                <AdminIconButton
                                    onClick={() => move(i, 1)}
                                    icon={ArrowDown}
                                    title="Move down"
                                    disabled={busy || i === curated.length - 1}
                                />
                                <AdminIconButton
                                    onClick={() => removeProduct(product.id)}
                                    icon={X}
                                    variant="danger"
                                    title="Remove from Orbit Ring"
                                    disabled={busy}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
