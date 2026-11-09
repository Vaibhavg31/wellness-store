import { useEffect, useMemo, useState } from 'react';
import { Crown, Download, Trash2, Users } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast } from '@/contexts/ToastContext';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { formatPrice } from '@/utils/formatPrice';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminSection, AdminField, StringListEditor } from '@/components/admin/ContentEditor';
import { AdminEmptyState, AdminLoadingState, AdminMenu, AdminPageHeader, AdminSearchInput, AdminSummaryGrid, AdminTableShell } from '@/components/admin/AdminUi';

const GENDER_LABEL = { female: 'Female', male: 'Male', other: 'Other', prefer_not_to_say: 'Prefers not to say' };
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function downloadCsv(members) {
    const head = ['Card', 'Name', 'Email', 'Phone', 'Date of birth', 'Gender', 'Joined', 'Orders', 'Spent'];
    // A name typed by a member that starts like a formula ("=…") must open in Excel as text, not run.
    const esc = (v) => {
        const s = String(v ?? '');
        return `"${(typeof v === 'string' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    };
    const rows = members.map((m) => [m.cardNo, m.name, m.email, m.phone, m.dob, GENDER_LABEL[m.gender] ?? m.gender, fmtDate(m.joinedAt), m.orders, m.spent]);
    // The BOM makes Excel read the file as UTF-8 (names in Hindi or with accents stay readable), like the other exports.
    const blob = new Blob(['﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'chikit-club-members.csv' });
    a.click();
    URL.revokeObjectURL(a.href);
}

/** Admin → Club: the member price rule and card wording, and everyone who has joined. */
export default function AdminClubPage() {
    const { adminToken } = useAdminAuth();
    const { refetch } = useSiteContent();
    const { showToast } = useToast();
    const [club, setClub] = useState(null);
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState(null);
    const [search, setSearch] = useState('');
    // The settings as last loaded or saved, so leaving with unsaved edits asks first (like the other admin forms).
    const [savedClub, setSavedClub] = useState('');
    useUnsavedChangesWarning(Boolean(club) && JSON.stringify(club) !== savedClub && !saving);

    useEffect(() => {
        api.get('/api/settings').then((s) => { setClub(s.extras.club); setSavedClub(JSON.stringify(s.extras.club)); }).catch(() => {});
    }, []);

    const loadMembers = () => api.get('/api/club/admin/members', adminToken).then(setMembers).catch(() => setMembers([]));
    useEffect(() => { if (adminToken) loadMembers(); }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        setSaving(true);
        try {
            const current = await api.get('/api/settings');
            await api.put('/api/settings', { extras: { ...current.extras, club } }, adminToken);
            setSavedClub(JSON.stringify(club));
            refetch();
            showToast('Club settings saved', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not save', 'error');
        } finally { setSaving(false); }
    };

    const remove = async (m) => {
        if (!confirm(`Remove ${m.name || m.email} from the club? Their account and orders stay.`)) return;
        try { await api.delete(`/api/club/admin/members/${m.id}`, adminToken); showToast('Removed from the club', 'success'); loadMembers(); } catch (err) { showToast(err instanceof Error ? err.message : 'Could not remove', 'error'); }
    };

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (members ?? []).filter((m) => !q || [m.name, m.email, m.phone, m.cardNo].some((v) => String(v ?? '').toLowerCase().includes(q)));
    }, [members, search]);

    if (!club) return <AdminLoadingState />;
    const total = (members ?? []).length;
    const spent = (members ?? []).reduce((s, m) => s + m.spent, 0);

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Chikit Club" subtitle="Members get a lower price on most products while signed in. Joining is free." />

            <AdminSummaryGrid columns={3} stats={[
                { label: 'Members', value: total, icon: Users },
                { label: 'Spent by members', value: formatPrice(spent), icon: Crown },
                { label: 'Member discount', value: `${club.discountPercent}%`, icon: Crown },
            ]} />

            <AdminSection title="Club settings" description="Set one discount for the whole range here; for a single product use its own Club price on the product page, or leave it out of the club.">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={club.enabled} onChange={(e) => setClub({ ...club, enabled: e.target.checked })} /> The club is open (member prices show, new members can join)</label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Card name" value={club.cardName} maxLength={40} onChange={(e) => setClub({ ...club, cardName: e.target.value })} />
                    <Input label="Member discount (%)" type="number" min="0" max="60" value={club.discountPercent} onChange={(e) => setClub({ ...club, discountPercent: e.target.value })} />
                </div>
                <Input label="Short line under the title" value={club.tagline} maxLength={140} onChange={(e) => setClub({ ...club, tagline: e.target.value })} />
                <AdminField label="What members get" hint="Shown as a list next to the card.">
                    <StringListEditor items={club.benefits} onChange={(benefits) => setClub({ ...club, benefits })} placeholder="e.g. Early access to new launches" />
                </AdminField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={club.showPrices !== false} onChange={(e) => setClub({ ...club, showPrices: e.target.checked })} /> Show products with their usual and Club price (home page band and the Club page)</label>
                    {club.showPrices !== false && <Input label="How many products to show" type="number" min="3" max="12" value={club.priceCount ?? 8} onChange={(e) => setClub({ ...club, priceCount: e.target.value })} />}
                </div>
                {club.showPrices !== false && <p className="text-xs text-admin-muted">These are your best sellers that have a Club price, with the rupees the Club saves. No percentage is shown to shoppers.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Birthday greeting" value={club.birthdayMessage ?? ''} maxLength={200} onChange={(e) => setClub({ ...club, birthdayMessage: e.target.value })} />
                    <Input label="Birthday gift code (optional)" value={club.birthdayCode ?? ''} maxLength={40} placeholder="A hidden coupon, e.g. BDAY20" onChange={(e) => setClub({ ...club, birthdayCode: e.target.value.toUpperCase() })} />
                </div>
                <p className="text-xs text-admin-muted">On a member&apos;s birthday the site greets them with confetti and this message. If you add a code, it is shown as their gift: create it in Coupons as a hidden code first.</p>
                <div><Button variant="turmeric" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save club settings'}</Button></div>
            </AdminSection>

            <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-sans text-lg">Members</h2>
                    <div className="flex items-center gap-2">
                        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search name, email, card…" />
                        <Button variant="outline" size="sm" disabled={total === 0} onClick={() => downloadCsv(members)}><Download size={15} /> Export</Button>
                    </div>
                </div>
                <AdminTableShell>
                    {members === null ? <AdminLoadingState /> : shown.length === 0 ? (
                        <AdminEmptyState icon={Users} title={total ? 'No members match' : 'No members yet'} description={total ? 'Try a different search' : 'People who join from the Club Card page show up here.'} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-sm">
                                <thead><tr className="border-b border-admin-border bg-admin-surface-alt text-left">
                                    <th className="p-4 font-medium text-admin-muted">Member</th><th className="p-4 font-medium text-admin-muted">Card</th><th className="p-4 font-medium text-admin-muted">Birthday · gender</th>
                                    <th className="p-4 font-medium text-admin-muted">Joined</th><th className="p-4 font-medium text-admin-muted">Orders</th><th className="w-14 p-4"><span className="sr-only">Actions</span></th>
                                </tr></thead>
                                <tbody>
                                    {shown.map((m) => (
                                        <tr key={m.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                            <td className="p-4 align-top"><p className="font-medium text-ink">{m.name || 'Customer'}</p><p className="text-xs text-admin-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p></td>
                                            <td className="p-4 align-top font-mono text-xs">{m.cardNo}</td>
                                            <td className="p-4 align-top text-ink">{m.dob ? fmtDate(m.dob) : '–'}<p className="text-xs text-admin-muted">{GENDER_LABEL[m.gender] ?? ''}</p></td>
                                            <td className="p-4 align-top text-ink">{fmtDate(m.joinedAt)}</td>
                                            <td className="p-4 align-top text-ink">{m.orders}<p className="text-xs text-admin-muted">{formatPrice(m.spent)}</p></td>
                                            <td className="p-4 align-top"><AdminMenu label={`More actions for ${m.name || m.email}`} items={[{ label: 'Remove from club', icon: Trash2, danger: true, onClick: () => remove(m) }]} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AdminTableShell>
            </div>
        </div>
    );
}
