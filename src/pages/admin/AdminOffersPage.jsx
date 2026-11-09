import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Gift, Layers, Plus, Tag, Trash2, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice, cn } from '@/utils/formatPrice';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import ProductSearchSelect from '@/components/admin/ProductSearchSelect';
import { ImageUploadField } from '@/components/admin/ContentEditor';
import { AdminEmptyState, AdminLoadingState, AdminMenu, AdminPageHeader, AdminSwitch, AdminTableShell } from '@/components/admin/AdminUi';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { useDirtyOnOpen } from '@/hooks/useDirtyOnOpen';

const KINDS = [
    { value: 'mix_match', label: 'Pick & Mix', icon: Layers, help: 'The shopper picks any N different products for one fixed price (for example any 3 for ₹1499).' },
    { value: 'bogo', label: 'Buy 1 Get 1 Free', icon: Gift, help: 'Pick the products. Two of the same product cost the price of one.' },
    { value: 'collection', label: 'Offer collection', icon: Tag, help: 'A page of hand-picked products at their normal (sale) prices, for any other promotion.' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

const EMPTY = {
    title: '', kind: 'mix_match', summary: '', description: '', image: '', price: 1499, pickCount: 3, allProducts: true,
    isEnabled: true, sortOrder: 0, startsAt: '', endsAt: '', productIds: [''],
};

/** ISO → value for <input type="datetime-local"> in the browser's time zone. */
const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

function whenText(offer) {
    const fmt = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (offer.startsAt && offer.endsAt) return `${fmt(offer.startsAt)} to ${fmt(offer.endsAt)}`;
    if (offer.endsAt) return `Until ${fmt(offer.endsAt)}`;
    if (offer.startsAt) return `From ${fmt(offer.startsAt)}`;
    return 'Always on';
}

export default function AdminOffersPage() {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [offers, setOffers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    // Unsaved typing in the side panel: a tap outside, Esc or the × asks before closing.
    const formDirty = useDirtyOnOpen(open, form);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        if (!adminToken) return;
        setLoading(true);
        try { setOffers(await api.get('/api/offers/admin/all', adminToken)); } catch { setOffers([]); } finally { setLoading(false); }
    };
    useEffect(() => {
        if (!adminToken) return;
        load();
        api.get('/api/products/admin/all', adminToken).then(setProducts).catch(() => setProducts([]));
    }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
    const openEdit = (offer) => {
        setEditing(offer);
        setForm({
            title: offer.title, kind: offer.kind, summary: offer.summary, description: offer.description, image: offer.image,
            price: offer.price, pickCount: offer.pickCount, allProducts: offer.allProducts, isEnabled: offer.isEnabled,
            sortOrder: offer.sortOrder, startsAt: toLocalInput(offer.startsAt), endsAt: toLocalInput(offer.endsAt),
            productIds: offer.productIds.length ? offer.productIds : [''],
        });
        setError('');
        setOpen(true);
    };

    const setProductAt = (index, id) => set({ productIds: form.productIds.map((p, i) => (i === index ? id : p)) });

    const save = useSingleFlight(async () => {
        if (!form.title.trim()) return setError('Give the offer page a title.');
        const ids = [...new Set(form.productIds.filter(Boolean))];
        if (form.kind === 'mix_match' && !(Number(form.price) > 0)) return setError('Enter the price for the whole box.');
        if (form.kind === 'mix_match' && !form.allProducts && ids.length < Number(form.pickCount)) return setError(`Pick at least ${form.pickCount} products, or tick "any product".`);
        if (form.kind === 'bogo' && ids.length === 0) return setError('Add at least one product to this offer.');
        if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return setError('The end date must be after the start date.');

        setSaving(true);
        setError('');
        const payload = {
            title: form.title.trim(), kind: form.kind, summary: form.summary.trim(), description: form.description.trim(), image: form.image,
            price: form.kind === 'mix_match' ? Number(form.price) : 0, pickCount: Number(form.pickCount) || 3,
            allProducts: form.kind === 'mix_match' ? form.allProducts : false, isEnabled: form.isEnabled, sortOrder: Number(form.sortOrder) || 0,
            startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt), productIds: ids,
        };
        try {
            if (editing) await api.put(`/api/offers/${editing.id}`, payload, adminToken);
            else await api.post('/api/offers', payload, adminToken);
            setOpen(false);
            showToast(editing ? 'Offer updated' : 'Offer page created', 'success');
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the offer');
        } finally { setSaving(false); }
        return undefined;
    });

    const toggle = async (offer) => {
        try { await api.put(`/api/offers/${offer.id}`, { isEnabled: !offer.isEnabled }, adminToken); load(); } catch (err) { showToast(err instanceof Error ? err.message : 'Could not update the offer', 'error'); }
    };
    const remove = async (offer) => {
        if (!confirm(`Delete "${offer.title}"? Orders already placed are not affected.`)) return;
        try { await api.delete(`/api/offers/${offer.id}`, adminToken); showToast('Offer deleted', 'success'); load(); } catch (err) { showToast(err instanceof Error ? err.message : 'Could not delete the offer', 'error'); }
    };

    const kind = KINDS.find((k) => k.value === form.kind);

    return (
        <div>
            <AdminPageHeader
                title="Offers"
                subtitle={`${offers.length} ${offers.length === 1 ? 'offer page' : 'offer pages'} · each one appears under Offers in the top menu while it is live`}
                actions={<Button variant="turmeric" onClick={openNew}><Plus size={16} /> New offer page</Button>}
            />

            <AdminTableShell>
                {loading ? <AdminLoadingState /> : offers.length === 0 ? (
                    <AdminEmptyState icon={Tag} title="No offer pages yet" description="Create one, for example “Pick any 3 for ₹1499”." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-admin-border bg-admin-surface-alt text-left">
                                    <th className="min-w-[240px] p-4 font-medium text-admin-muted">Offer page</th>
                                    <th className="p-4 font-medium text-admin-muted">Type</th>
                                    <th className="p-4 font-medium text-admin-muted">Runs</th>
                                    <th className="w-32 p-4 font-medium text-admin-muted">Status</th>
                                    <th className="w-40 p-4"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {offers.map((offer) => (
                                    <tr key={offer.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                        <td className="p-4 align-top">
                                            <p className="font-medium text-ink">{offer.title}</p>
                                            <p className="mt-0.5 text-xs text-admin-muted">/offers/{offer.slug}</p>
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="text-ink">{KIND_LABEL[offer.kind]}</p>
                                            <p className="mt-0.5 text-xs text-admin-muted">
                                                {offer.kind === 'mix_match' && `Any ${offer.pickCount} for ${formatPrice(offer.price)}${offer.allProducts ? ' · every product' : ` · ${offer.productIds.length} products`}`}
                                                {offer.kind !== 'mix_match' && `${offer.productIds.length} ${offer.productIds.length === 1 ? 'product' : 'products'}`}
                                            </p>
                                        </td>
                                        <td className="p-4 align-top text-ink">{whenText(offer)}</td>
                                        <td className="p-4 align-top"><AdminSwitch checked={offer.isEnabled} onChange={() => toggle(offer)} aria-label={`${offer.isEnabled ? 'Switch off' : 'Switch on'} ${offer.title}`} /></td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(offer)}>Edit</Button>
                                                <AdminMenu label={`More actions for ${offer.title}`} items={[
                                                    { label: 'View on store', icon: ExternalLink, onClick: () => window.open(`/offers/${offer.slug}`, '_blank', 'noopener') },
                                                    { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(offer) },
                                                ]} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminTableShell>

            <Drawer isOpen={open} confirmClose={formDirty} onClose={() => setOpen(false)} title={editing ? 'Edit offer page' : 'New offer page'} side="right" wide admin>
                <div className="space-y-5">
                    {error && <div className="rounded-lg border border-danger/30 bg-danger-tint p-3 text-sm text-danger" role="alert">{error}</div>}

                    <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.15em] text-admin-muted">What kind of offer</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {KINDS.map(({ value, label, icon: Icon }) => (
                                <button key={value} type="button" disabled={Boolean(editing)} onClick={() => set({ kind: value })} aria-pressed={form.kind === value}
                                    className={cn('flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed', form.kind === value ? 'border-primary bg-primary/10 text-primary' : 'border-line hover:border-primary/40 disabled:opacity-50')}>
                                    <Icon size={16} aria-hidden="true" /> {label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-admin-muted">{kind.help}{editing && ' The type cannot be changed after the page is created.'}</p>
                    </div>

                    <Input label="Page title" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Pick & Mix: any 3 for ₹1499" />
                    <Input label="One-line summary (optional)" value={form.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="Choose any 3 products. Each product can be picked once." />
                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-admin-muted" htmlFor="offer-desc">Description (optional)</label>
                        <textarea id="offer-desc" rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} className="w-full rounded-lg border border-line px-4 py-3 text-sm" />
                    </div>
                    <ImageUploadField label="Banner image (optional)" hint="Shown on the offers page. Wide (about 2:1) works best." value={form.image} onChange={(v) => set({ image: v })} adminToken={adminToken} />

                    {form.kind === 'mix_match' && (
                        <div className="space-y-4 rounded-xl border border-admin-border bg-admin-surface-alt p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input label="Price for the whole box (₹)" type="number" min="1" value={form.price} onChange={(e) => set({ price: e.target.value })} />
                                <Input label="Products in a box" type="number" min="2" max="10" value={form.pickCount} onChange={(e) => set({ pickCount: e.target.value })} />
                            </div>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allProducts} onChange={(e) => set({ allProducts: e.target.checked })} /> Any product can go in the box</label>
                            <p className="text-xs text-admin-muted">A product can be picked only once per box. If the chosen products would cost less than the box price, the shopper simply pays their normal total. The shop shows the box price against what the products cost one by one (struck through) on the offer poster and page, worked out from your live product prices. A Chikit Club member pays whichever is lower for them: the box price, or the Club prices of the same products. An offer never stacks on top of a Club price.</p>
                        </div>
                    )}

                    {(form.kind !== 'mix_match' || !form.allProducts) && (
                        <div>
                            <p className="mb-2 text-xs uppercase tracking-[0.15em] text-admin-muted">Products on this page</p>
                            <div className="space-y-2.5">
                                {form.productIds.map((id, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="min-w-0 flex-1"><ProductSearchSelect products={products} value={id} onChange={(pid) => setProductAt(i, pid)} placeholder="Search product…" emptyOptionLabel="No product selected" /></div>
                                        <button type="button" onClick={() => set({ productIds: form.productIds.length > 1 ? form.productIds.filter((_, x) => x !== i) : [''] })} className="shrink-0 rounded-lg p-2.5 text-danger hover:bg-danger-tint" aria-label="Remove product"><X size={15} /></button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => set({ productIds: [...form.productIds, ''] })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"><Plus size={14} /> Add product</button>
                            {form.productIds.filter(Boolean).some((id) => !byId.has(id)) && <p className="mt-2 text-xs text-warning">One of the saved products is no longer available.</p>}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Starts (optional)" type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
                        <Input label="Ends (optional)" type="datetime-local" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
                    </div>
                    <Input label="Order in the menu (smaller first)" type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isEnabled} onChange={(e) => set({ isEnabled: e.target.checked })} /> Live on the store (within its dates)</label>

                    <div className="sticky bottom-0 -mx-5 mt-6 border-t border-admin-border bg-canvas px-5 pb-2 pt-4 sm:-mx-6 sm:px-6">
                        <Button variant="turmeric" className="w-full" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create offer page'}</Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}
