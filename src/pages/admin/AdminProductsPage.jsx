import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
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
        await api.delete(`/api/products/${id}`, adminToken);
        fetchProducts();
    };

    const togglePublish = async (product) => {
        if (!adminToken) return;
        await api.put(`/api/products/${product.id}`, { isPublished: !product.isPublished }, adminToken);
        fetchProducts();
    };

    return (
        <div>
            <AdminPageHeader
                title="Products"
                subtitle="Manage your catalog, pricing, and visibility"
                actions={(
                    <Link to={`${ADMIN_PATH}/products/new`}>
                        <Button variant="gold" size="sm" className="gap-2">
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
                                    <th className="p-4 text-left w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-admin-surface-alt/60">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img src={imageUrl(product.images?.[0] || '')} alt="" className="w-11 h-11 rounded-lg object-cover border border-admin-border-light" />
                                                <div>
                                                    <p className="font-medium text-charcoal">{product.title}</p>
                                                    <p className="text-xs text-admin-muted line-clamp-1">
                                                        {product.hasVariants
                                                            ? `${product.variants.length} option${product.variants.length === 1 ? '' : 's'}${product.tags?.length ? ` · ${product.tags.join(', ')}` : ''}`
                                                            : product.tags?.join(', ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 capitalize text-admin-muted">{product.category}</td>
                                        <td className="p-4 font-medium tabular-nums">
                                            {product.hasVariants && <span className="text-admin-muted font-normal">From </span>}
                                            ₹{product.price}
                                        </td>
                                        <td className="p-4 tabular-nums">{product.stock}</td>
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
                                                    className="p-2 rounded-lg hover:bg-admin-surface-alt text-charcoal transition-colors inline-flex"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </Link>
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
