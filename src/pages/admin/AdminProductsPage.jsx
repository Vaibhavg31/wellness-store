import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Plus, Pencil, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { humanizeSlug } from '@/utils/products';
import {
    AdminPageHeader,
    AdminSummaryGrid,
    AdminFilterBar,
    AdminSearchInput,
    AdminTableShell,
    AdminLoadingState,
    AdminEmptyState,
    AdminIconButton,
    AdminStatusPill,
    AdminErrorBanner,
} from '@/components/admin/AdminUi';

/** Stock that can be edited right in the list: type a number, press Enter or leave the field to save. */
function StockCell({ product, onSave }) {
    const [value, setValue] = useState(String(product.stock));
    const [state, setState] = useState('idle'); // idle | saving | saved | error

    useEffect(() => setValue(String(product.stock)), [product.stock]);

    if (product.hasVariants) {
        return <span className="tabular-nums" title="Stock is managed per option — open the product to edit">{product.stock}</span>;
    }

    const commit = async () => {
        const next = Number.parseInt(value, 10);
        if (!Number.isFinite(next) || next < 0) {
            setValue(String(product.stock));
            return;
        }
        if (next === Number(product.stock)) return;
        setState('saving');
        try {
            await onSave(product, next);
            setState('saved');
            setTimeout(() => setState('idle'), 1500);
        } catch {
            setValue(String(product.stock));
            setState('error');
        }
    };

    return (
        <span className="inline-flex items-center gap-2">
            <input
                type="number"
                min="0"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setValue(String(product.stock)); e.currentTarget.blur(); } }}
                aria-label={`Stock for ${product.title}`}
                className="admin-control w-20 px-2 py-1 text-sm tabular-nums"
            />
            <span className="w-4 text-caption" aria-live="polite">
                {state === 'saving' && <span className="text-muted">…</span>}
                {state === 'saved' && <span className="text-success">✓</span>}
                {state === 'error' && <span className="text-danger" title="Could not save">!</span>}
            </span>
        </span>
    );
}

export default function AdminProductsPage() {
    const { adminToken } = useAdminAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) =>
            p.title?.toLowerCase().includes(q)
            || p.category?.toLowerCase().includes(q)
            || p.tags?.some((t) => t.toLowerCase().includes(q))
            || String(p.price).includes(q),
        );
    }, [products, search]);

    const liveCount = products.filter((p) => p.isPublished).length;

    const [loadError, setLoadError] = useState('');

    const fetchProducts = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/products/admin/all', adminToken);
            setProducts(Array.isArray(data) ? data : []);
            setLoadError('');
        } catch (err) {
            setProducts([]);
            setLoadError(err instanceof Error ? err.message : 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [adminToken]);

    const handleDelete = async (id) => {
        if (!adminToken || !confirm('Delete this product?')) return;
        try {
            await api.delete(`/api/products/${id}`, adminToken);
            fetchProducts();
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to delete product');
        }
    };

    const saveStock = async (product, stock) => {
        await api.put(`/api/products/${product.id}`, { stock }, adminToken);
        setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, stock } : p)));
    };

    // Clone a product (hidden, as "<title> (Copy)") so similar items don't have to be rebuilt from scratch.
    const [duplicatingId, setDuplicatingId] = useState('');
    const duplicateProduct = async (product) => {
        if (!adminToken) return;
        setDuplicatingId(product.id);
        try {
            await api.post('/api/products', {
                title: `${product.title} (Copy)`,
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category,
                description: product.description,
                stock: product.stock,
                images: product.images,
                tags: product.tags,
                features: product.features,
                badges: product.badges,
                variants: (product.variants ?? []).map((v) => ({
                    label: v.label, netQuantity: v.netQuantity ?? null, image: v.image ?? null, price: v.price,
                    originalPrice: v.originalPrice, stock: v.stock, sku: null, isDefault: v.isDefault,
                })),
                ingredients: product.ingredients,
                howToUse: product.howToUse,
                nutrition: product.nutrition,
                faqs: product.faqs,
                showTrustBadges: product.showTrustBadges,
                codEnabled: product.codEnabled,
                onlinePaymentEnabled: product.onlinePaymentEnabled,
                isNew: false,
                isBestSeller: false,
                isTrendingPinned: false,
                isPublished: false,
            }, adminToken);
            await fetchProducts();
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to duplicate product');
        } finally {
            setDuplicatingId('');
        }
    };

    const togglePublish = async (product) => {
        if (!adminToken) return;
        try {
            await api.put(`/api/products/${product.id}`, { isPublished: !product.isPublished }, adminToken);
            fetchProducts();
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to update product');
        }
    };

    return (
        <div>
            <AdminPageHeader
                title="Products"
                subtitle="Manage your catalog, pricing, and visibility"
                actions={(
                    <Link to={`${ADMIN_PATH}/products/new`}>
                        <Button variant="turmeric" size="sm" className="gap-2">
                            <Plus size={16} /> Add Product
                        </Button>
                    </Link>
                )}
            />

            {loadError && <AdminErrorBanner message={loadError} onDismiss={() => setLoadError('')} />}

            <AdminSummaryGrid
                columns={3}
                stats={[
                    { label: 'Total products', value: products.length },
                    { label: 'Live', value: liveCount, tone: 'emerald' },
                    { label: 'Hidden', value: products.length - liveCount, tone: 'default' },
                ]}
            />

            <AdminFilterBar>
                <AdminSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by title, category, tags…"
                />
            </AdminFilterBar>

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : filteredProducts.length === 0 ? (
                    <AdminEmptyState
                        icon={Package}
                        title={search.trim() ? 'No products match your search' : 'No products yet'}
                        description={search.trim() ? 'Try a different search term' : 'Add your first product to get started'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead>
                                <tr>
                                    <th className="p-4 text-left">Product</th>
                                    <th className="p-4 text-left">Category</th>
                                    <th className="p-4 text-left">Price</th>
                                    <th className="p-4 text-left">Stock</th>
                                    <th className="p-4 text-left">Status</th>
                                    <th className="p-4 text-left w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-admin-surface-alt/60">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img src={imageUrl(product.images?.[0] || '')} alt="" className="w-11 h-11 rounded-lg object-cover border border-admin-border-light" />
                                                <div>
                                                    <p className="font-medium text-ink">{product.title}</p>
                                                    <p className="text-xs text-admin-muted line-clamp-1">
                                                        {product.hasVariants
                                                            ? `${product.variants.length} option${product.variants.length === 1 ? '' : 's'}${product.tags?.length ? ` · ${product.tags.join(', ')}` : ''}`
                                                            : product.tags?.join(', ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-admin-muted">{humanizeSlug(product.category)}</td>
                                        <td className="p-4 font-medium tabular-nums">
                                            {product.hasVariants && <span className="text-admin-muted font-normal">From </span>}
                                            ₹{product.price}
                                        </td>
                                        <td className="p-4"><StockCell product={product} onSave={saveStock} /></td>
                                        <td className="p-4">
                                            <button type="button" onClick={() => togglePublish(product)}>
                                                <AdminStatusPill tone={product.isPublished ? 'success' : 'muted'}>
                                                    {product.isPublished ? (
                                                        <><Eye size={11} className="mr-0.5" /> Live</>
                                                    ) : (
                                                        <><EyeOff size={11} className="mr-0.5" /> Hidden</>
                                                    )}
                                                </AdminStatusPill>
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1">
                                                <Link
                                                    to={`${ADMIN_PATH}/products/${product.id}`}
                                                    className="p-2 rounded-lg hover:bg-admin-surface-alt text-ink transition-colors inline-flex"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </Link>
                                                <AdminIconButton onClick={() => duplicateProduct(product)} icon={Copy} title="Duplicate as hidden copy" disabled={duplicatingId === product.id} />
                                                <AdminIconButton onClick={() => handleDelete(product.id)} icon={Trash2} variant="danger" title="Delete" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminTableShell>
        </div>
    );
}
