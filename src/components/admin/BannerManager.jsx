import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import {
    AdminSummaryGrid,
    AdminTableShell,
    AdminLoadingState,
    AdminEmptyState,
    AdminIconButton,
    AdminStatusPill,
} from '@/components/admin/AdminUi';

const TARGET_LABELS = { slider: 'Slider only', stacked: 'Stacked only', both: 'Both' };

function emptyForm(defaultTarget) {
    return { title: '', subtitle: '', image: '', ctaLabel: '', ctaHref: '', order: 0, isEnabled: true, displayTarget: defaultTarget };
}

/**
 * Full banner CRUD (upload, edit, reorder, enable/disable) — the same photo
 * library feeds both the "Banner Slider (Rotating)" and "Image Banners
 * (Stacked)" homepage sections, but each banner is independently tagged via
 * displayTarget ('slider' | 'stacked' | 'both') so the two sections can show
 * different photos instead of always repeating the same set.
 *
 * @param {'slider'|'stacked'} [filterTarget] When given, only banners tagged
 *   for this target (or 'both') are shown, and new banners default to this
 *   tag — used when this is embedded inside one specific section's row in
 *   Content Manager. Omit to manage every banner regardless of target.
 */
export default function BannerManager({ filterTarget }) {
    const { adminToken } = useAdminAuth();
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(() => emptyForm(filterTarget ?? 'both'));
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchBanners = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/banners/admin/all', adminToken);
            setBanners(Array.isArray(data) ? data : []);
        } catch {
            setBanners([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, [adminToken]);

    const visibleBanners = filterTarget
        ? banners.filter((b) => b.displayTarget === filterTarget || b.displayTarget === 'both')
        : banners;

    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm(filterTarget ?? 'both'), order: visibleBanners.length + 1 });
        setModalOpen(true);
    };

    const openEdit = (banner) => {
        setEditing(banner);
        setForm({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            image: banner.image || '',
            ctaLabel: banner.ctaLabel || '',
            ctaHref: banner.ctaHref || '',
            order: banner.order,
            isEnabled: banner.isEnabled,
            displayTarget: banner.displayTarget || 'both',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!adminToken || !form.image) return;
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/api/banners/${editing.id}`, form, adminToken);
            } else {
                await api.post('/api/banners', form, adminToken);
            }
            setModalOpen(false);
            fetchBanners();
        } finally {
            setSaving(false);
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
            e.target.value = '';
        }
    };

    const handleDelete = async (id) => {
        if (!adminToken || !confirm('Delete this banner?')) return;
        await api.delete(`/api/banners/${id}`, adminToken);
        fetchBanners();
    };

    const toggleEnabled = async (banner) => {
        if (!adminToken) return;
        await api.put(`/api/banners/${banner.id}`, { isEnabled: !banner.isEnabled }, adminToken);
        fetchBanners();
    };

    const enabledCount = visibleBanners.filter((b) => b.isEnabled).length;

    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-xs text-admin-muted">
                    {filterTarget
                        ? `Showing banners tagged for this section (or "Both"). ${banners.length - visibleBanners.length > 0 ? `${banners.length - visibleBanners.length} more tagged for the other section only.` : ''}`
                        : 'Images shown here power both Banner Slider (Rotating) and Image Banners (Stacked).'}
                </p>
                <Button variant="gold" size="sm" onClick={openNew} className="gap-1.5 flex-shrink-0"><Plus size={14} /> Add Banner</Button>
            </div>

            <AdminSummaryGrid
                columns={3}
                stats={[
                    { label: 'Total banners', value: visibleBanners.length },
                    { label: 'Live', value: enabledCount, color: 'text-emerald' },
                    { label: 'Hidden', value: visibleBanners.length - enabledCount, color: 'text-admin-muted' },
                ]}
            />

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : visibleBanners.length === 0 ? (
                    <AdminEmptyState
                        icon={ImageIcon}
                        title="No banners yet"
                        description="Add a banner to promote a brand campaign or festival sale"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-3 font-medium text-admin-muted w-24">Preview</th>
                                    <th className="p-3 font-medium text-admin-muted min-w-[160px]">Title</th>
                                    <th className="p-3 font-medium text-admin-muted w-28">Shows in</th>
                                    <th className="p-3 font-medium text-admin-muted w-16 text-center">Order</th>
                                    <th className="p-3 font-medium text-admin-muted w-24">Status</th>
                                    <th className="p-3 font-medium text-admin-muted w-20" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleBanners.map((banner) => (
                                    <tr key={banner.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                        <td className="p-3">
                                            <img
                                                src={imageUrl(banner.image)}
                                                alt=""
                                                className="w-20 h-12 rounded-lg object-cover border border-admin-border bg-warm-beige/30"
                                            />
                                        </td>
                                        <td className="p-3 align-top">
                                            <p className="font-serif text-sm text-charcoal">{banner.title || '—'}</p>
                                            <p className="text-xs text-admin-muted mt-0.5">{banner.subtitle || ''}</p>
                                        </td>
                                        <td className="p-3 align-top">
                                            <span className="text-xs text-admin-muted">{TARGET_LABELS[banner.displayTarget] || 'Both'}</span>
                                        </td>
                                        <td className="p-3 align-top text-center">
                                            <span className="font-serif text-charcoal">{banner.order}</span>
                                        </td>
                                        <td className="p-3 align-top">
                                            <button type="button" onClick={() => toggleEnabled(banner)}>
                                                <AdminStatusPill tone={banner.isEnabled ? 'success' : 'muted'}>
                                                    {banner.isEnabled ? (<><Eye size={11} /> Live</>) : (<><EyeOff size={11} /> Hidden</>)}
                                                </AdminStatusPill>
                                            </button>
                                        </td>
                                        <td className="p-3 align-top">
                                            <div className="flex items-center gap-1">
                                                <AdminIconButton onClick={() => openEdit(banner)} icon={Pencil} variant="success" title="Edit" />
                                                <AdminIconButton onClick={() => handleDelete(banner.id)} icon={Trash2} variant="danger" title="Delete" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminTableShell>

            <Drawer isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Banner' : 'Add Banner'} side="right" admin>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Banner Image</label>
                        {form.image ? (
                            <div className="space-y-3">
                                <div className="relative inline-block">
                                    <img src={imageUrl(form.image)} alt="" className="w-full max-w-xs aspect-[21/9] object-cover rounded-xl border border-admin-border" />
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, image: '' })}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <div>
                                    <p className="text-[11px] text-admin-muted mb-1.5">How this will look on mobile (used everywhere):</p>
                                    <img src={imageUrl(form.image)} alt="" className="w-full max-w-xs aspect-[16/9] object-cover rounded-xl border border-admin-border" />
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-border bg-admin-surface-alt py-10 cursor-pointer hover:border-wine/30 hover:bg-wine/5 transition-colors">
                                <Upload size={24} className="text-admin-muted/80" />
                                <span className="text-sm text-admin-muted">{uploading ? 'Uploading…' : 'Click to upload image'}</span>
                                <span className="text-xs text-admin-muted px-4 text-center">
                                    Any wide/landscape photo works — it's automatically cropped to fit.
                                    Best results around 1920×800–1920×960px (roughly 2:1–2.4:1). JPG, PNG, WebP · max 5MB.
                                </span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                        {form.image && (
                            <label className="inline-flex items-center gap-2 mt-3 text-xs text-wine cursor-pointer hover:text-wine-light">
                                <Upload size={14} />
                                {uploading ? 'Uploading…' : 'Replace image'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                    <Input label="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Festival Sale is Live" />
                    <Input label="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Up to 30% off" />
                    <Input label="Button label (optional)" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Shop the Sale" />
                    <Input label="Link (optional)" value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/shop" />
                    <Input label="Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Shows In</label>
                        <select
                            value={form.displayTarget}
                            onChange={(e) => setForm({ ...form, displayTarget: e.target.value })}
                            className="w-full px-4 py-3 bg-admin-surface-alt border border-warm-beige/60 text-charcoal rounded-lg text-sm focus:outline-none focus:border-muted-gold focus:ring-1 focus:ring-muted-gold/30"
                        >
                            <option value="both">Both — Slider and Stacked</option>
                            <option value="slider">Banner Slider only (rotating)</option>
                            <option value="stacked">Image Banners only (stacked)</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} />
                        Live
                    </label>
                    <div className="sticky bottom-0 pt-4 pb-2 bg-ivory border-t border-admin-border -mx-5 px-5 sm:-mx-6 sm:px-6 mt-6">
                        <Button variant="gold" className="w-full" onClick={handleSave} disabled={saving || !form.image}>
                            {saving ? 'Saving…' : 'Save Banner'}
                        </Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}
