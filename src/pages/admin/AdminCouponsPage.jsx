import { useEffect, useState, useMemo } from 'react';
import {
    Plus, Trash2, Tag,
    Percent, IndianRupee, Truck, Users, UserPlus, Repeat,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/utils/formatPrice';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import Badge from '@/components/ui/Badge';
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

const EMPTY_FORM = {
    code: '',
    title: '',
    description: '',
    type: 'percent',
    value: 10,
    minOrderAmount: 0,
    maxDiscount: 0,
    maxUses: 0,
    maxUsesPerUser: 0,
    isEnabled: true,
    showOnWebsite: true,
    autoApply: false,
    audience: 'everyone',
    minPreviousOrders: 1,
    startsAt: '',
    expiresAt: '',
};

const AUDIENCE_OPTIONS = [
    { value: 'everyone', label: 'Everyone', icon: Users },
    { value: 'new_customers', label: 'New customers', icon: UserPlus },
    { value: 'returning_customers', label: 'Returning customers', icon: Repeat },
];

function typeIcon(type) {
    if (type === 'free_delivery') return Truck;
    if (type === 'flat') return IndianRupee;
    return Percent;
}

function discountSummary(coupon) {
    if (coupon.type === 'free_delivery') {
        return coupon.minOrderAmount > 0
            ? `Free delivery above ${formatPrice(coupon.minOrderAmount)}`
            : 'Free delivery on all orders';
    }
    if (coupon.type === 'flat') {
        return `${formatPrice(coupon.value)} off`;
    }
    const cap = coupon.maxDiscount > 0 ? `, max ${formatPrice(coupon.maxDiscount)}` : '';
    return `${coupon.value}% off${cap}`;
}

export default function AdminCouponsPage() {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    const filteredCoupons = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return coupons;
        return coupons.filter((c) =>
            c.code?.toLowerCase().includes(q)
            || c.title?.toLowerCase().includes(q)
            || c.description?.toLowerCase().includes(q)
            || c.type?.toLowerCase().includes(q),
        );
    }, [coupons, search]);

    const fetchCoupons = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/coupons/admin/all', adminToken);
            setCoupons(data);
        } catch {
            setCoupons([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, [adminToken]);

    const openNew = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (coupon) => {
        setEditing(coupon);
        setForm({
            code: coupon.code,
            title: coupon.title,
            description: coupon.description || '',
            type: coupon.type,
            value: coupon.value,
            minOrderAmount: coupon.minOrderAmount || 0,
            maxDiscount: coupon.maxDiscount || 0,
            maxUses: coupon.maxUses || 0,
            maxUsesPerUser: coupon.maxUsesPerUser || 0,
            isEnabled: coupon.isEnabled !== false,
            showOnWebsite: coupon.showOnWebsite !== false,
            autoApply: coupon.autoApply === true,
            audience: coupon.audience || 'everyone',
            minPreviousOrders: coupon.minPreviousOrders || 1,
            startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '',
            expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!adminToken || !form.code.trim()) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                code: form.code.trim().toUpperCase(),
                value: Number(form.value),
                minOrderAmount: Number(form.minOrderAmount),
                maxDiscount: Number(form.maxDiscount),
                maxUses: Number(form.maxUses),
                maxUsesPerUser: Number(form.maxUsesPerUser),
                minPreviousOrders: Math.max(1, Number(form.minPreviousOrders) || 1),
                startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
                expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : '',
            };
            if (editing) {
                await api.put(`/api/coupons/${editing.id}`, payload, adminToken);
            } else {
                await api.post('/api/coupons', payload, adminToken);
            }
            setModalOpen(false);
            fetchCoupons();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save coupon');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (coupon) => {
        if (!adminToken) return;
        try {
            await api.put(`/api/coupons/${coupon.id}/toggle`, {}, adminToken);
            fetchCoupons();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update coupon', 'error');
        }
    };

    const handleDelete = async (coupon) => {
        if (!adminToken || !confirm(`Delete coupon ${coupon.code}? Past orders keep their discount history.`)) return;
        try {
            await api.delete(`/api/coupons/${coupon.id}`, adminToken);
            showToast('Coupon deleted', 'success');
            fetchCoupons();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete coupon', 'error');
        }
    };

    const enabledCount = coupons.filter((c) => c.isEnabled).length;

    return (
        <div>
            <AdminPageHeader
                title="Coupons"
                subtitle={`${enabledCount} of ${coupons.length} ${coupons.length === 1 ? 'coupon' : 'coupons'} active`}
                actions={<Button variant="turmeric" onClick={openNew}><Plus size={16} /> New coupon</Button>}
            />

            <AdminFilterBar>
                <AdminSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search coupons…"
                />
            </AdminFilterBar>

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : filteredCoupons.length === 0 ? (
                    <AdminEmptyState
                        icon={Tag}
                        title={search.trim() ? 'No coupons match your search' : 'No coupons yet'}
                        description={search.trim() ? 'Try a different keyword' : 'Create your first offer code to boost sales'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-4 font-medium text-admin-muted min-w-[220px]">Coupon</th>
                                    <th className="p-4 font-medium text-admin-muted min-w-[180px]">Offer</th>
                                    <th className="min-w-[140px] p-4 font-medium text-admin-muted">Used</th>
                                    <th className="w-32 p-4 font-medium text-admin-muted">Active</th>
                                    <th className="w-36 p-4"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCoupons.map((coupon) => {
                                    const Icon = typeIcon(coupon.type);
                                    const stats = coupon.stats || {};
                                    return (
                                        <tr key={coupon.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                            <td className="p-4 align-top">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-canvas-alt flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <Icon size={14} className="text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-mono text-sm font-semibold text-ink tracking-wide">{coupon.code}</p>
                                                        <p className="text-sm text-ink mt-0.5">{coupon.title}</p>
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {coupon.showOnWebsite && coupon.isEnabled && (
                                                                <Badge variant="bestseller">On website</Badge>
                                                            )}
                                                            {coupon.autoApply && coupon.isEnabled && (
                                                                <Badge variant="new">Auto apply</Badge>
                                                            )}
                                                            {coupon.audience && coupon.audience !== 'everyone' && (
                                                                <Badge variant="default">
                                                                    {coupon.audience === 'returning_customers'
                                                                        ? (coupon.minPreviousOrders > 1
                                                                            ? `${coupon.minPreviousOrders}+ orders`
                                                                            : 'Returning customers')
                                                                        : 'New customers'}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <p className="text-ink">{discountSummary(coupon)}</p>
                                                {coupon.description && (
                                                    <p className="text-xs text-admin-muted mt-1 line-clamp-2">{coupon.description}</p>
                                                )}
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-admin-muted">
                                                    {coupon.minOrderAmount > 0 && (
                                                        <span>Min {formatPrice(coupon.minOrderAmount)}</span>
                                                    )}
                                                    {coupon.maxUses > 0 && (
                                                        <span>{coupon.usageCount || 0}/{coupon.maxUses} uses</span>
                                                    )}
                                                    {coupon.maxUsesPerUser > 0 && (
                                                        <span>{coupon.maxUsesPerUser} per customer</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                {(stats.totalOrders || 0) > 0 ? (
                                                    <>
                                                        <p className="text-ink">{stats.totalOrders} {stats.totalOrders === 1 ? 'order' : 'orders'}</p>
                                                        <p className="text-xs text-admin-muted">{formatPrice(stats.totalDiscountGiven || 0)} given off</p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-admin-muted">Not used yet</p>
                                                )}
                                            </td>
                                            <td className="p-4 align-top">
                                                <AdminSwitch checked={coupon.isEnabled} onChange={() => handleToggle(coupon)} onLabel="On" offLabel="Off" aria-label={`${coupon.isEnabled ? 'Turn off' : 'Turn on'} coupon ${coupon.code}`} />
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}>Edit</Button>
                                                    <AdminMenu label={`More actions for ${coupon.code}`} items={[{ label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(coupon) }]} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminTableShell>

            <Drawer
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Coupon' : 'Create Coupon'}
                side="right"
                wide
                admin
            >
                <div className="space-y-4">
                    <Input
                        label="Coupon Code"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        placeholder="SPARKLE10"
                    />
                    <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="10% Off" />
                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 border border-line rounded-lg text-sm"
                            placeholder="Shown to customers on cart page"
                        />
                    </div>

                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Discount Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'percent', label: '% Off', icon: Percent },
                                { value: 'flat', label: 'Flat ₹', icon: IndianRupee },
                                { value: 'free_delivery', label: 'Free Del.', icon: Truck },
                            ].map(({ value, label, icon: TIcon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setForm({ ...form, type: value })}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors ${form.type === value ? 'border-primary bg-primary/10 text-primary' : 'border-line hover:border-primary/40'}`}
                                >
                                    <TIcon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.type !== 'free_delivery' && (
                        <Input
                            label={form.type === 'percent' ? 'Discount Percentage' : 'Flat Amount (₹)'}
                            type="number"
                            value={form.value}
                            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                        />
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Input label="Min Order (₹)" type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} />
                        {form.type === 'percent' && (
                            <Input label="Max Discount Cap (₹)" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} placeholder="0 = no cap" />
                        )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Input label="Total Uses Limit" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} placeholder="0 = unlimited" />
                        <Input label="Uses Per Customer" type="number" value={form.maxUsesPerUser} onChange={(e) => setForm({ ...form, maxUsesPerUser: Number(e.target.value) })} placeholder="0 = unlimited" />
                    </div>

                    <div>
                        <label className="block text-xs tracking-[0.15em] uppercase text-admin-muted mb-2">Who can use this</label>
                        <div className="grid grid-cols-3 gap-2">
                            {AUDIENCE_OPTIONS.map(({ value, label, icon: AIcon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setForm({ ...form, audience: value })}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs text-center transition-colors ${form.audience === value ? 'border-primary bg-primary/10 text-primary' : 'border-line hover:border-primary/40'}`}
                                >
                                    <AIcon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>
                        {form.audience === 'returning_customers' && (
                            <div className="mt-3">
                                <Input
                                    label="Minimum past orders required"
                                    type="number"
                                    min="1"
                                    value={form.minPreviousOrders}
                                    onChange={(e) => setForm({ ...form, minPreviousOrders: Number(e.target.value) })}
                                />
                                <p className="text-xs text-admin-muted mt-1.5">
                                    1 = anyone who has ordered before. Raise it to reward customers further into their journey with you — e.g. 3 targets their 4th order onward.
                                </p>
                            </div>
                        )}
                        {form.audience === 'new_customers' && (
                            <p className="text-xs text-admin-muted mt-2">
                                Only offered to a signed-in customer with no past orders yet. A shopper who hasn&apos;t made an account at all is still shown this offer — there&apos;s no history to check them against.
                            </p>
                        )}
                        {form.audience === 'returning_customers' && form.autoApply && (
                            <p className="text-xs text-accent-ink mt-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                                With auto-apply on, this appears by itself in the cart the moment a qualifying repeat customer signs in — no code to remember or share.
                            </p>
                        )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Input label="Starts At" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                        <Input label="Expires At" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} />
                        Enabled (customers can use this code)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.showOnWebsite} onChange={(e) => setForm({ ...form, showOnWebsite: e.target.checked })} />
                        Show on website (display in cart &amp; checkout offers)
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form.autoApply}
                            onChange={(e) => setForm({ ...form, autoApply: e.target.checked })}
                        />
                        <span>
                            Auto-apply at checkout when eligible
                            <span className="block text-xs text-admin-muted mt-0.5">
                                Applies automatically when min order amount is met (e.g. free delivery above ₹1,500).
                            </span>
                        </span>
                    </label>

                    <div className="sticky bottom-0 pt-4 pb-2 bg-canvas border-t border-admin-border -mx-5 px-5 sm:-mx-6 sm:px-6 mt-6">
                        <Button variant="turmeric" className="w-full" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : editing ? 'Update Coupon' : 'Create Coupon'}
                        </Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}
