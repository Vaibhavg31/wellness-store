import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Plus, Trash2, Package } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { humanizeSlug } from '@/utils/products';
import {
    AdminPageHeader,
    AdminTabs,
    AdminMenu,
    AdminSwitch,
    AdminFilterBar,
    AdminSearchInput,
    AdminTableShell,
    AdminLoadingState,
    AdminEmptyState,
    AdminErrorBanner,
} from '@/components/admin/AdminUi';

/** Same threshold the dashboard uses for "low stock". */
const LOW_STOCK = 5;
const titleCase = (text) => String(text ?? '').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Stock is shown, never edited, in the list (a stray keystroke here used to change inventory). It is changed in the product's
 * own form, where it sits next to price and the other details.
 */
function StockLabel({ product }) {
    const stock = Number(product.stock ?? 0);
    if (stock <= 0) return <span className="inline-flex rounded-full bg-danger-tint px-2.5 py-0.5 text-xs font-medium text-danger">Out of stock</span>;
    if (stock <= LOW_STOCK) return <span className="inline-flex rounded-full bg-warning-tint px-2.5 py-0.5 text-xs font-medium text-warning">Low · {stock} left</span>;
    return <span className="text-sm tabular-nums text-ink">{stock}</span>;
}

export default function AdminProductsPage() {
    const { adminToken } = useAdminAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('all');
    const [loadError, setLoadError] = useState('');

    const counts = useMemo(() => ({
        all: products.length,
        live: products.filter((p) => p.isPublished).length,
        hidden: products.filter((p) => !p.isPublished).length,
        low: products.filter((p) => Number(p.stock ?? 0) <= LOW_STOCK).length,
    }), [products]);

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter((p) => {
            if (tab === 'live' && !p.isPublished) return false;
            if (tab === 'hidden' && p.isPublished) return false;
            if (tab === 'low' && Number(p.stock ?? 0) > LOW_STOCK) return false;
            if (!q) return true;
            return p.title?.toLowerCase().includes(q)
                || p.category?.toLowerCase().includes(q)
                || p.tags?.some((t) => t.toLowerCase().includes(q))
                || String(p.price).includes(q);
        });
    }, [products, search, tab]);

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

    const handleDelete = async (product) => {
        if (!adminToken || !confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/api/products/${product.id}`, adminToken);
            fetchProducts();
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to delete product');
        }
    };

    // Clone a product (hidden, as "<title> (Copy)") so similar items don't have to be rebuilt from scratch.
    const duplicateProduct = async (product) => {
        if (!adminToken) return;
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

    const menuFor = (product) => [
        { label: 'Duplicate', icon: Copy, onClick: () => duplicateProduct(product) },
        { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(product) },
    ];
    const editHref = (product) => `${ADMIN_PATH}/products/${product.id}`;
    const optionsNote = (product) => (product.hasVariants ? `${product.variants.length} option${product.variants.length === 1 ? '' : 's'}` : '');

    return (
        <div>
            <AdminPageHeader
                title="Products"
                subtitle={`${counts.all} ${counts.all === 1 ? 'product' : 'products'} in your store`}
                actions={(
                    <Link to={`${ADMIN_PATH}/products/new`}>
                        <Button variant="turmeric" size="sm" className="gap-2">
                            <Plus size={16} /> Add product
                        </Button>
                    </Link>
                )}
            />

            {loadError && <AdminErrorBanner message={loadError} onDismiss={() => setLoadError('')} />}

            <AdminTabs
                label="Show products"
                value={tab}
                onChange={setTab}
                tabs={[
                    { value: 'all', label: 'All', count: counts.all },
                    { value: 'live', label: 'Live', count: counts.live },
                    { value: 'hidden', label: 'Hidden', count: counts.hidden },
                    { value: 'low', label: 'Low stock', count: counts.low },
                ]}
            />

            <AdminFilterBar>
                <AdminSearchInput value={search} onChange={setSearch} placeholder="Search by name, category or tag…" />
            </AdminFilterBar>

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : filteredProducts.length === 0 ? (
                    <AdminEmptyState
                        icon={Package}
                        title={search.trim() || tab !== 'all' ? 'No products match' : 'No products yet'}
                        description={search.trim() || tab !== 'all' ? 'Try a different search or filter' : 'Add your first product to get started'}
                    />
                ) : (
                    <>
                        {/* Phones: one card per product with every control in reach. */}
                        <ul className="divide-y divide-admin-border-light md:hidden">
                            {filteredProducts.map((product) => (
                                <li key={product.id} className="space-y-3 p-4">
                                    <div className="flex items-start gap-3">
                                        <img src={imageUrl(product.images?.[0] || '')} alt="" className="size-14 shrink-0 rounded-lg border border-admin-border-light object-cover" />
                                        <div className="min-w-0 flex-1">
                                            <Link to={editHref(product)} className="font-medium text-ink hover:text-primary">{product.title}</Link>
                                            <p className="text-xs text-admin-muted">{titleCase(humanizeSlug(product.category))}{optionsNote(product) && ` · ${optionsNote(product)}`}</p>
                                            <p className="mt-1 font-medium tabular-nums text-ink">
                                                {product.hasVariants && <span className="font-normal text-admin-muted">From </span>}₹{product.price}
                                            </p>
                                        </div>
                                        <StockLabel product={product} />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <AdminSwitch checked={product.isPublished} onChange={() => togglePublish(product)} aria-label={`${product.isPublished ? 'Hide' : 'Show'} ${product.title} on the store`} />
                                        <div className="flex items-center gap-1">
                                            <Link to={editHref(product)}><Button variant="outline" size="sm">Edit</Button></Link>
                                            <AdminMenu items={menuFor(product)} label={`More actions for ${product.title}`} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                    <tr>
                                        <th className="p-4 text-left">Product</th>
                                        <th className="p-4 text-left">Category</th>
                                        <th className="p-4 text-left">Price</th>
                                        <th className="p-4 text-left">Stock</th>
                                        <th className="p-4 text-left">Store</th>
                                        <th className="w-36 p-4 text-right"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-admin-surface-alt/60">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={imageUrl(product.images?.[0] || '')} alt="" className="size-11 shrink-0 rounded-lg border border-admin-border-light object-cover" />
                                                    <div className="min-w-0">
                                                        <Link to={editHref(product)} className="font-medium text-ink hover:text-primary">{product.title}</Link>
                                                        {(optionsNote(product) || product.tags?.length > 0) && (
                                                            <p className="line-clamp-1 text-xs text-admin-muted">{[optionsNote(product), product.tags?.join(', ')].filter(Boolean).join(' · ')}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-admin-muted">{titleCase(humanizeSlug(product.category))}</td>
                                            <td className="p-4 font-medium tabular-nums">
                                                {product.hasVariants && <span className="font-normal text-admin-muted">From </span>}₹{product.price}
                                            </td>
                                            <td className="p-4"><StockLabel product={product} /></td>
                                            <td className="p-4">
                                                <AdminSwitch checked={product.isPublished} onChange={() => togglePublish(product)} aria-label={`${product.isPublished ? 'Hide' : 'Show'} ${product.title} on the store`} />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link to={editHref(product)}><Button variant="outline" size="sm">Edit</Button></Link>
                                                    <AdminMenu items={menuFor(product)} label={`More actions for ${product.title}`} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </AdminTableShell>
        </div>
    );
}
