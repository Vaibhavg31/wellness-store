import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Upload, X, FolderOpen } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import {
    AdminPageHeader,
    AdminMenu,
    AdminSwitch,
    AdminFilterBar,
    AdminSearchInput,
    AdminTableShell,
    AdminLoadingState,
    AdminEmptyState,
} from '@/components/admin/AdminUi';

const slugify = (text) => String(text ?? '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
        if (!form.label.trim()) {
            showToast('Please enter a name for the category', 'error');
            return;
        }
        // The page address is made from the name, so nobody has to think about it; an existing one is never changed.
        const payload = { ...form, slug: editing ? form.slug : (form.slug.trim() || slugify(form.label)) };
        try {
            if (editing) {
                await api.put(`/api/categories/${editing.id}`, payload, adminToken);
            } else {
                await api.post('/api/categories', payload, adminToken);
            }
            setModalOpen(false);
            fetchCategories();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not save the category', 'error');
        }
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

    const togglePublish = async (cat) => {
        if (!adminToken) return;
        try {
            await api.put(`/api/categories/${cat.id}`, { slug: cat.slug, label: cat.label, description: cat.description, image: cat.image, order: cat.order, isPublished: !cat.isPublished }, adminToken);
            fetchCategories();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update category', 'error');
        }
    };

    const handleDelete = async (cat) => {
        const note = cat.productCount > 0 ? ` It has ${cat.productCount} product${cat.productCount === 1 ? '' : 's'}.` : '';
        if (!adminToken || !confirm(`Delete "${cat.label}"?${note} This cannot be undone.`)) return;
        try {
            await api.delete(`/api/categories/${cat.id}`, adminToken);
            showToast('Category deleted', 'success');
            fetchCategories();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
        }
    };

    return (
        <div>
            <AdminPageHeader
                title="Categories"
                subtitle={`${categories.length} ${categories.length === 1 ? 'category' : 'categories'} on your store`}
                actions={<Button variant="turmeric" onClick={openNew}><Plus size={16} /> Add category</Button>}
            />

            <AdminFilterBar>
                <AdminSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search categories…"
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
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-admin-border bg-admin-surface-alt text-left">
                                    <th className="p-4 font-medium text-admin-muted">Category</th>
                                    <th className="w-24 p-4 text-center font-medium text-admin-muted">Products</th>
                                    <th className="w-32 p-4 font-medium text-admin-muted">Store</th>
                                    <th className="w-36 p-4"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.map((cat) => (
                                    <tr key={cat.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {cat.image ? (
                                                    <img src={imageUrl(cat.image)} alt="" className="size-12 shrink-0 rounded-xl border border-admin-border bg-canvas-alt object-cover" />
                                                ) : (
                                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-admin-border bg-canvas-alt">
                                                        <FolderOpen size={18} className="text-admin-muted" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <button type="button" onClick={() => openEdit(cat)} className="text-left font-medium text-ink hover:text-primary">{cat.label}</button>
                                                    {cat.description && <p className="line-clamp-1 text-xs text-admin-muted">{cat.description}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span
                                                className={`inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${cat.productCount > 0 ? 'bg-primary/10 text-primary' : 'bg-admin-surface-alt text-admin-muted'}`}
                                                title={cat.productCount === 0 ? 'No products yet, so it will not show on the store until it has at least one' : undefined}
                                            >
                                                {cat.productCount}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <AdminSwitch checked={cat.isPublished} onChange={() => togglePublish(cat)} aria-label={`${cat.isPublished ? 'Hide' : 'Show'} ${cat.label} on the store`} />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>Edit</Button>
                                                <AdminMenu label={`More actions for ${cat.label}`} items={[{ label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(cat) }]} />
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
                title={editing ? 'Edit category' : 'Add category'}
                side="right"
                admin
            >
                <div className="space-y-4">
                    <Input label="Name" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Protein & Fitness" />
                    {editing && <p className="-mt-2 text-xs text-admin-muted">Page address: <span className="font-mono">/category/{form.slug}</span></p>}
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Category Image</label>
                        {form.image ? (
                            <div className="relative inline-block">
                                <img src={imageUrl(form.image)} alt="" className="w-32 h-32 object-cover rounded-xl border border-admin-border" />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, image: '' })}
                                    className="absolute -top-2 -right-2 p-1 bg-danger text-white rounded-full hover:bg-danger/90"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-border bg-admin-surface-alt py-10 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                                <Upload size={24} className="text-admin-muted" />
                                <span className="text-sm text-admin-muted">{uploading ? 'Uploading…' : 'Click to upload image'}</span>
                                <span className="text-xs text-admin-muted">JPG, PNG, WebP · max 5MB</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                        {form.image && (
                            <label className="inline-flex items-center gap-2 mt-3 text-xs text-primary cursor-pointer hover:text-primary-hover">
                                <Upload size={14} />
                                {uploading ? 'Uploading…' : 'Replace image'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-line rounded-lg" />
                    </div>
                    <Input label="Position in the menu (1 is first)" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                        Show this category on the store
                    </label>
                    <div className="sticky bottom-0 pt-4 pb-2 bg-canvas border-t border-admin-border -mx-5 px-5 sm:-mx-6 sm:px-6 mt-6">
                        <Button variant="turmeric" className="w-full" onClick={handleSave}>Save category</Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}
