import { useEffect, useState, useMemo } from 'react';
import {
    Plus, Pencil, Trash2, Gift, ToggleLeft, ToggleRight, X,
} from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/formatPrice';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import Badge from '@/components/ui/Badge';
import ProductSearchSelect from '@/components/admin/ProductSearchSelect';
import {
    AdminPageHeader,
    AdminSummaryGrid,
    AdminFilterBar,
    AdminSearchInput,
    AdminTableShell,
    AdminLoadingState,
    AdminEmptyState,
    AdminIconButton,
} from '@/components/admin/AdminUi';

const EMPTY_FORM = {
    title: '',
    subtitle: '',
    description: '',
    discountType: 'percent',
    discountValue: 10,
    isPublished: true,
    sortOrder: 0,
    items: [{ productId: '', quantity: 1 }],
};

/** Live pricing preview computed the same way BundleRepository::computePricing
 *  does on the backend, from the currently-selected products' catalog prices —
 *  so the admin sees exactly what customers will see before saving. */
function previewPricing(items, products) {
    const subtotal = items.reduce((sum, it) => {
        const product = products.find((p) => p.id === it.productId);
        return sum + (product ? product.price * (Number(it.quantity) || 0) : 0);
    }, 0);
    return { subtotal: Math.round(subtotal * 100) / 100 };
}

export default function AdminBundlesPage() {
    const { adminToken } = useAdminAuth();
    const [bundles, setBundles] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const filteredBundles = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return bundles;
        return bundles.filter((b) =>
            b.title?.toLowerCase().includes(q) || b.subtitle?.toLowerCase().includes(q),
        );
    }, [bundles, search]);

    const fetchBundles = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/bundles/admin/all', adminToken);
            setBundles(data);
        } catch {
            setBundles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!adminToken) return;
        fetchBundles();
        api.get('/api/products/admin/all', adminToken).then(setProducts).catch(() => setProducts([]));
    }, [adminToken]);

    const openNew = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setError('');
        setModalOpen(true);
    };

    const openEdit = (bundle) => {
        setEditing(bundle);
        setForm({
            title: bundle.title,
            subtitle: bundle.subtitle || '',
            description: bundle.description || '',
            discountType: bundle.discountType,
            discountValue: bundle.discountValue,
            isPublished: bundle.isPublished,
            sortOrder: bundle.sortOrder || 0,
            items: bundle.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        });
        setError('');
        setModalOpen(true);
    };

    const updateItem = (index, patch) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
        }));
    };

    const addItem = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, { productId: '', quantity: 1 }] }));
    };

    const removeItem = (index) => {
        setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const preview = useMemo(() => previewPricing(form.items, products), [form.items, products]);
    const discountAmount = form.discountType === 'flat'
        ? Math.min(Number(form.discountValue) || 0, preview.subtotal)
        : Math.round(preview.subtotal * Math.max(0, Math.min(100, Number(form.discountValue) || 0)) / 100 * 100) / 100;
    const bundlePrice = Math.max(0, Math.round((preview.subtotal - discountAmount) * 100) / 100);

    const handleSave = async () => {
        if (!adminToken || !form.title.trim()) {
            setError('Bundle title is required.');
            return;
        }
        const validItems = form.items.filter((it) => it.productId);
        if (validItems.length < 2) {
            setError('Pick at least 2 products for this bundle.');
            return;
        }
        const ids = validItems.map((it) => it.productId);
        if (new Set(ids).size !== ids.length) {
            setError('Each product can only appear once in a bundle.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                title: form.title.trim(),
                subtitle: form.subtitle.trim(),
                description: form.description.trim(),
                discountValue: Number(form.discountValue) || 0,
                sortOrder: Number(form.sortOrder) || 0,
                items: validItems.map((it) => ({ productId: it.productId, quantity: Math.max(1, Number(it.quantity) || 1) })),
            };
            if (editing) {
                await api.put(`/api/bundles/${editing.id}`, payload, adminToken);
            } else {
                await api.post('/api/bundles', payload, adminToken);
            }
            setModalOpen(false);
            fetchBundles();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save bundle');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (bundle) => {
        if (!adminToken) return;
        await api.put(`/api/bundles/${bundle.id}/toggle`, {}, adminToken);
        fetchBundles();
    };

    const handleDelete = async (id) => {
        if (!adminToken || !confirm('Delete this bundle? This does not affect past orders.')) return;
        await api.delete(`/api/bundles/${id}`, adminToken);
        fetchBundles();
    };

    const publishedCount = bundles.filter((b) => b.isPublished).length;
    const totalSavingsOffered = bundles.reduce((sum, b) => sum + (b.pricing?.discountAmount || 0), 0);

    return (
        <div>
            <AdminPageHeader
                title="Bundles"
                subtitle="Group products together at a discount — shown on the product page and homepage"
                actions={<Button variant="gold" onClick={openNew}><Plus size={16} /> New Bundle</Button>}
            />

            <AdminSummaryGrid
                columns={3}
                stats={[
                    { label: 'Total bundles', value: bundles.length },
                    { label: 'Published', value: publishedCount, color: 'text-emerald' },
                    { label: 'Combined savings offered', value: formatPrice(totalSavingsOffered), color: 'text-gold-ink' },
                ]}
            />

            <AdminFilterBar>
                <AdminSearchInput value={search} onChange={setSearch} placeholder="Search bundles by title…" />
            </AdminFilterBar>

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : filteredBundles.length === 0 ? (
                    <AdminEmptyState
                        icon={Gift}
                        title={search.trim() ? 'No bundles match your search' : 'No bundles yet'}
                        description={search.trim() ? 'Try a different keyword' : 'Create your first "buy these together" offer'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[760px]">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-4 font-medium text-admin-muted min-w-[240px]">Bundle</th>
                                    <th className="p-4 font-medium text-admin-muted">Products</th>
                                    <th className="p-4 font-medium text-admin-muted">Price</th>
                                    <th className="p-4 font-medium text-admin-muted w-28">Status</th>
                                    <th className="p-4 font-medium text-admin-muted w-28" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBundles.map((bundle) => (
                                    <tr key={bundle.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                        <td className="p-4 align-top">
                                            <p className="text-charcoal font-medium">{bundle.title}</p>
                                            {bundle.subtitle && <p className="text-xs text-admin-muted mt-0.5">{bundle.subtitle}</p>}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex -space-x-2">
                                                {bundle.items.slice(0, 5).map((item) => (
                                                    <img
                                                        key={item.productId}
                                                        src={imageUrl(item.product.image)}
                                                        alt={item.product.title}
                                                        title={item.product.title}
                                                        className="w-8 h-8 rounded-full object-cover border-2 border-white"
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs text-admin-muted mt-1.5">{bundle.items.length} products</p>
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="font-serif text-base text-charcoal">{formatPrice(bundle.pricing.bundlePrice)}</p>
                                            {bundle.pricing.discountAmount > 0 && (
                                                <p className="text-xs text-admin-muted">
                                                    <span className="line-through">{formatPrice(bundle.pricing.subtotal)}</span>
                                                    {' '}· save {bundle.pricing.savingsPercent}%
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <Badge variant={bundle.isPublished ? 'sale' : 'stock'}>
                                                {bundle.isPublished ? 'Published' : 'Hidden'}
                                            </Badge>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-1">
                                                <AdminIconButton
                                                    onClick={() => handleToggle(bundle)}
                                                    icon={bundle.isPublished ? ToggleRight : ToggleLeft}
                                                    variant="success"
                                                    title={bundle.isPublished ? 'Hide' : 'Publish'}
                                                    size={18}
                                                />
                                                <AdminIconButton onClick={() => openEdit(bundle)} icon={Pencil} title="Edit" />
                                                <AdminIconButton onClick={() => handleDelete(bundle.id)} icon={Trash2} variant="danger" title="Delete" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminTableShell>

            <Drawer
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Bundle' : 'Create Bundle'}
                side="right"
                wide
                admin
            >
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
                    )}

                    <Input label="Bundle Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Complete Wellness Kit" />
                    <Input label="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Frequently Bought Together" />
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Description (optional)</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 border border-warm-beige/60 rounded-lg text-sm"
                            placeholder="Shown under the bundle title"
                        />
                    </div>

                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Products in this bundle</label>
                        <div className="space-y-2.5">
                            {form.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <ProductSearchSelect
                                            products={products}
                                            value={item.productId}
                                            onChange={(id) => updateItem(i, { productId: id })}
                                            placeholder="Search product…"
                                            emptyOptionLabel="No product selected"
                                        />
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(i, { quantity: e.target.value })}
                                        className="w-16 admin-control text-sm text-center px-2 py-2.5"
                                        aria-label="Quantity"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        disabled={form.items.length <= 1}
                                        className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none shrink-0"
                                        aria-label="Remove product"
                                        title={form.items.length <= 1 ? 'Keep at least one row' : 'Remove this product'}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addItem}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-wine bg-wine/5 hover:bg-wine/10 border border-wine/20"
                        >
                            <Plus size={14} /> Add product
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Bundle Discount</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'percent', label: '% Off combined price' },
                                { value: 'flat', label: 'Flat ₹ Off combined price' },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setForm({ ...form, discountType: value })}
                                    className={`p-3 rounded-xl border text-xs text-left transition-colors ${form.discountType === value ? 'border-emerald bg-emerald/10 text-emerald' : 'border-border hover:border-emerald/40'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Input
                        label={form.discountType === 'percent' ? 'Discount Percentage' : 'Flat Amount (₹)'}
                        type="number"
                        value={form.discountValue}
                        onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    />

                    {preview.subtotal > 0 && (
                        <div className="rounded-xl border border-admin-border bg-admin-surface-alt p-3 flex items-center justify-between text-sm">
                            <span className="text-admin-muted">Customer sees</span>
                            <div className="flex items-center gap-3">
                                <span className="text-admin-muted/80 line-through">{formatPrice(preview.subtotal)}</span>
                                <span className="font-semibold text-charcoal">{formatPrice(bundlePrice)}</span>
                                {discountAmount > 0 && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald/10 text-emerald border border-emerald/20">
                                        Save {formatPrice(discountAmount)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                        Published (visible to customers)
                    </label>

                    <div className="sticky bottom-0 pt-4 pb-2 bg-ivory border-t border-admin-border -mx-5 px-5 sm:-mx-6 sm:px-6 mt-6">
                        <Button variant="gold" className="w-full" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : editing ? 'Update Bundle' : 'Create Bundle'}
                        </Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}
