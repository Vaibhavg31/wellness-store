import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Upload, X, FolderOpen, Eye, EyeOff } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
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
} from '@/components/admin/AdminUi';

export default function AdminCategoriesPage() {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ slug: '', label: '', description: '', image: '', order: 0, isPublished: true });
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState('');

    const fetchCategories = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/categories/admin/all', adminToken);
            setCategories(Array.isArray(data) ? data : []);
        } catch {
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [adminToken]);

    const filteredCategories = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) =>
            c.label?.toLowerCase().includes(q)
            || c.slug?.toLowerCase().includes(q)
            || c.description?.toLowerCase().includes(q),
        );
    }, [categories, search]);

    const openNew = () => {
        setEditing(null);
        setForm({ slug: '', label: '', description: '', image: '', order: categories.length + 1, isPublished: true });
        setModalOpen(true);
    };

    const openEdit = (cat) => {
        setEditing(cat);
        setForm({ slug: cat.slug, label: cat.label, description: cat.description, image: cat.image, order: cat.order, isPublished: cat.isPublished });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!adminToken) return;
        if (editing) {
            await api.put(`/api/categories/${editing.id}`, form, adminToken);
        } else {
            await api.post('/api/categories', form, adminToken);
        }
        setModalOpen(false);
        fetchCategories();
    };

    const handleImageUpload = async (e) => {
        if (!adminToken || !e.target.files?.length) return;
        setUploading(true);
        try {
            const urls = await api.upload(Array.from(e.target.files), adminToken);
            if (urls[0]) setForm((prev) => ({ ...prev, image: urls[0] }));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!adminToken || !confirm('Delete this category?')) return;
        try {
            await api.delete(`/api/categories/${id}`, adminToken);
            showToast('Category deleted', 'success');
            fetchCategories();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
        }
    };

    const publishedCount = categories.filter((c) => c.isPublished).length;
    const hiddenCount = categories.length - publishedCount;

    return (
        <div>
            <AdminPageHeader
                title="Categories"
                subtitle="Organize products into browsable collections on your store"
                actions={<Button variant="turmeric" onClick={openNew}><Plus size={16} /> Add Category</Button>}
            />

            <AdminSummaryGrid
                columns={3}
                stats={[
                    { label: 'Total categories', value: categories.length },
                    { label: 'Published', value: publishedCount, color: 'text-emerald' },
                    { label: 'Hidden', value: hiddenCount, color: 'text-admin-muted' },
                ]}
            />

            <AdminFilterBar>
                <AdminSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search categories by name, slug…"
                />
            </AdminFilterBar>

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : filteredCategories.length === 0 ? (
                    <AdminEmptyState
                        icon={FolderOpen}
                        title={search.trim() ? 'No categories match your search' : 'No categories yet'}
                        description={search.trim() ? 'Try a different keyword' : 'Add categories to organize your product catalog'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[720px]">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-4 font-medium text-admin-muted w-20">Image</th>
                                    <th className="p-4 font-medium text-admin-muted min-w-[160px]">Name</th>
                                    <th className="p-4 font-medium text-admin-muted w-28">Slug</th>
                                    <th className="p-4 font-medium text-admin-muted min-w-[200px]">Description</th>
                                    <th className="p-4 font-medium text-admin-muted w-24 text-center">Products</th>
                                    <th className="p-4 font-medium text-admin-muted w-16 text-center">Order</th>
                                    <th className="p-4 font-medium text-admin-muted w-24">Status</th>
                                    <th className="p-4 font-medium text-admin-muted w-24" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.map((cat) => (
                                    <tr key={cat.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                        <td className="p-4">
                                            {cat.image ? (
                                                <img
                                                    src={imageUrl(cat.image)}
                                                    alt=""
                                                    className="w-14 h-14 rounded-xl object-cover border border-admin-border bg-sand/30"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-xl border border-admin-border bg-sand/30 flex items-center justify-center">
                                                    <FolderOpen size={18} className="text-admin-muted/60" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="font-display text-base text-ink">{cat.label}</p>
                                        </td>
                                        <td className="p-4 align-top">
                                            <code className="text-xs text-admin-muted bg-sand/40 px-2 py-1 rounded-md">/{cat.slug}</code>
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="text-admin-muted line-clamp-2 leading-relaxed">{cat.description || '—'}</p>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <span
                                                className={`inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    cat.productCount > 0 ? 'bg-forest/10 text-forest' : 'bg-slate/10 text-admin-muted'
                                                }`}
                                                title={cat.productCount === 0 ? "No products yet — won't show on the storefront until it has at least one" : undefined}
                                            >
                                                {cat.productCount}
                                            </span>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <span className="font-display text-ink">{cat.order}</span>
                                        </td>
                                        <td className="p-4 align-top">
                                            <AdminStatusPill tone={cat.isPublished ? 'success' : 'muted'}>
                                                {cat.isPublished ? (
                                                    <><Eye size={11} /> Live</>
                                                ) : (
                                                    <><EyeOff size={11} /> Hidden</>
                                                )}
                                            </AdminStatusPill>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-1">
                                                <AdminIconButton
                                                    onClick={() => openEdit(cat)}
                                                    icon={Pencil}
                                                    variant="success"
                                                    title="Edit"
                                                />
                                                <AdminIconButton
                                                    onClick={() => handleDelete(cat.id)}
                                                    icon={Trash2}
                                                    variant="danger"
                                                    title="Delete"
                                                />
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
                title={editing ? 'Edit Category' : 'Add Category'}
                side="right"
                admin
            >
                <div className="space-y-4">
                    <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="necklace" />
                    <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Necklaces" />
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Category Image</label>
                        {form.image ? (
                            <div className="relative inline-block">
                                <img src={imageUrl(form.image)} alt="" className="w-32 h-32 object-cover rounded-xl border border-admin-border" />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, image: '' })}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-border bg-admin-surface-alt py-10 cursor-pointer hover:border-forest/30 hover:bg-forest/5 transition-colors">
                                <Upload size={24} className="text-admin-muted/80" />
                                <span className="text-sm text-admin-muted">{uploading ? 'Uploading…' : 'Click to upload image'}</span>
                                <span className="text-xs text-admin-muted">JPG, PNG, WebP · max 5MB</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                        {form.image && (
                            <label className="inline-flex items-center gap-2 mt-3 text-xs text-forest cursor-pointer hover:text-forest-light">
                                <Upload size={14} />
                                {uploading ? 'Uploading…' : 'Replace image'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-sand/60 rounded-lg" />
                    </div>
                    <Input label="Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                        Published (visible on website)
                    </label>
                    <div className="sticky bottom-0 pt-4 pb-2 bg-cream border-t border-admin-border -mx-5 px-5 sm:-mx-6 sm:px-6 mt-6">
                        <Button variant="turmeric" className="w-full" onClick={handleSave}>Save Category</Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}
