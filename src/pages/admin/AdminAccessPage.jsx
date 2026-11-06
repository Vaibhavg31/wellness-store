import { useEffect, useState } from 'react';
import { KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminSection } from '@/components/admin/ContentEditor';
import { AdminEmptyState, AdminLoadingState, AdminMenu, AdminPageHeader, AdminStatusPill, AdminTableShell } from '@/components/admin/AdminUi';
import { useSingleFlight } from '@/hooks/useSingleFlight';

const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '–');
const VIA = { password: 'Sign-in page', studio: 'Studio login', google: 'Google' };
const errorText = (err, fallback) => (err instanceof Error ? err.message : fallback);

/** The signed-in admin changes their own password (admin accounts only; server-set logins are changed on the server). */
function OwnPassword({ session }) {
    const { adminToken, adminLoginToken } = useAdminAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [saving, setSaving] = useState(false);

    if (session.kind !== 'account') {
        return <p className="text-sm text-admin-muted">This login is set on the server, so its password is changed there, not here.</p>;
    }
    const save = useSingleFlight(async (e) => {
        e.preventDefault();
        if (form.newPassword !== form.confirm) return showToast('The two new passwords do not match', 'error');
        setSaving(true);
        try {
            const res = await api.put('/api/admin/session/password', { currentPassword: form.currentPassword, newPassword: form.newPassword }, adminToken);
            adminLoginToken(res.token);
            setForm({ currentPassword: '', newPassword: '', confirm: '' });
            showToast('Password changed. Other devices signed in with the old one are signed out.', 'success');
        } catch (err) {
            showToast(errorText(err, 'Could not change the password'), 'error');
        } finally { setSaving(false); }
        return undefined;
    });
    return (
        <form onSubmit={save} className="grid max-w-xl gap-4">
            <Input label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} hint="At least 8 characters, with a number" required />
                <Input label="New password again" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
            </div>
            <div><Button type="submit" variant="turmeric" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</Button></div>
        </form>
    );
}

/** Add an admin account, or edit one (email, name, a new password). */
function AccountForm({ account, onDone, onCancel }) {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const editing = Boolean(account);
    const [form, setForm] = useState({ email: account?.email ?? '', name: account?.name ?? '', password: '' });
    const [saving, setSaving] = useState(false);

    const save = useSingleFlight(async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = { email: form.email, name: form.name, ...(form.password ? { password: form.password } : {}) };
            if (editing) await api.put(`/api/admin/accounts/${account.id}`, body, adminToken);
            else await api.post('/api/admin/accounts', body, adminToken);
            showToast(editing ? 'Admin account updated' : 'Admin account added. They can sign in on the normal sign-in page.', 'success');
            onDone();
        } catch (err) {
            showToast(errorText(err, 'Could not save'), 'error');
        } finally { setSaving(false); }
    });
    return (
        <form onSubmit={save} className="grid gap-4 rounded-xl border border-admin-border bg-admin-surface-alt p-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Email (their sign-in)" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <Input label="Name (optional)" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <Input
                label={editing ? 'New password (leave empty to keep the current one)' : 'Password'}
                type="text"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                hint="At least 8 characters, with a number. Share it with them privately; they can change it after signing in."
                required={!editing}
            />
            <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="turmeric" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add admin'}</Button>
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
        </form>
    );
}

/** Super admins only: the shop's admin accounts and the sign-in log. */
function ManageAccess() {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [accounts, setAccounts] = useState(null);
    const [log, setLog] = useState(null);
    const [editing, setEditing] = useState(null); // null | 'new' | account

    const load = () => {
        api.get('/api/admin/accounts', adminToken).then(setAccounts).catch(() => setAccounts([]));
        api.get('/api/admin/login-log?limit=60', adminToken).then(setLog).catch(() => setLog([]));
    };
    useEffect(() => { load(); }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

    const setActive = async (a, isActive) => {
        try { await api.put(`/api/admin/accounts/${a.id}`, { isActive }, adminToken); showToast(isActive ? 'Account switched on' : 'Account switched off. It is signed out everywhere.', 'success'); load(); } catch (err) { showToast(errorText(err, 'Could not update'), 'error'); }
    };
    const remove = async (a) => {
        if (!confirm(`Remove the admin login ${a.email}? They will no longer be able to open the admin panel.`)) return;
        try { await api.delete(`/api/admin/accounts/${a.id}`, adminToken); showToast('Admin login removed', 'success'); load(); } catch (err) { showToast(errorText(err, 'Could not remove'), 'error'); }
    };

    return (
        <>
            <AdminSection title="Shop admin logins" description="People who may open this admin panel with their own email and password. They sign in on the normal sign-in page and land here. Switching a login off, or giving it a new password, signs it out everywhere at once.">
                {editing ? (
                    <AccountForm account={editing === 'new' ? null : editing} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
                ) : (
                    <div><Button variant="outline" size="sm" onClick={() => setEditing('new')}><UserPlus size={15} /> Add admin</Button></div>
                )}
                <AdminTableShell>
                    {accounts === null ? <AdminLoadingState /> : accounts.length === 0 ? (
                        <AdminEmptyState icon={Users} title="No shop admin logins yet" description="Add the shop's email and a password; they can then sign in and change the password themselves." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead><tr className="border-b border-admin-border bg-admin-surface-alt text-left">
                                    <th className="p-4 font-medium text-admin-muted">Login</th><th className="p-4 font-medium text-admin-muted">Status</th>
                                    <th className="p-4 font-medium text-admin-muted">Last signed in</th><th className="w-14 p-4"><span className="sr-only">Actions</span></th>
                                </tr></thead>
                                <tbody>
                                    {accounts.map((a) => (
                                        <tr key={a.id} className="border-b border-admin-border-light">
                                            <td className="p-4 align-top"><p className="font-medium text-ink">{a.email}</p>{a.name && <p className="text-xs text-admin-muted">{a.name}</p>}</td>
                                            <td className="p-4 align-top"><AdminStatusPill tone={a.isActive ? 'success' : 'default'}>{a.isActive ? 'Can sign in' : 'Switched off'}</AdminStatusPill></td>
                                            <td className="p-4 align-top text-ink">{fmtDateTime(a.lastLoginAt)}</td>
                                            <td className="p-4 align-top">
                                                <AdminMenu label={`More actions for ${a.email}`} items={[
                                                    { label: 'Edit email, name or password', icon: Pencil, onClick: () => setEditing(a) },
                                                    a.isActive
                                                        ? { label: 'Switch off', icon: KeyRound, onClick: () => setActive(a, false) }
                                                        : { label: 'Switch on', icon: KeyRound, onClick: () => setActive(a, true) },
                                                    { label: 'Remove', icon: Trash2, danger: true, onClick: () => remove(a) },
                                                ]} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AdminTableShell>
            </AdminSection>

            <AdminSection title="Recent admin sign-ins" description="Every attempt to open the admin panel, newest first, including failed ones. Kept for 180 days.">
                <AdminTableShell>
                    {log === null ? <AdminLoadingState /> : log.length === 0 ? (
                        <AdminEmptyState icon={ShieldCheck} title="No sign-ins recorded yet" description="Admin sign-ins show up here from now on." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead><tr className="border-b border-admin-border bg-admin-surface-alt text-left">
                                    <th className="p-4 font-medium text-admin-muted">When</th><th className="p-4 font-medium text-admin-muted">Login</th>
                                    <th className="p-4 font-medium text-admin-muted">Result</th><th className="p-4 font-medium text-admin-muted">How</th><th className="p-4 font-medium text-admin-muted">IP address</th>
                                </tr></thead>
                                <tbody>
                                    {log.map((row, i) => (
                                        <tr key={`${row.at}-${i}`} className="border-b border-admin-border-light">
                                            <td className="p-4 text-ink">{fmtDateTime(row.at)}</td>
                                            <td className="p-4 text-ink">{row.email}</td>
                                            <td className="p-4"><AdminStatusPill tone={row.ok ? 'success' : 'danger'}>{row.ok ? 'Signed in' : 'Wrong password'}</AdminStatusPill></td>
                                            <td className="p-4 text-admin-muted">{VIA[row.via] ?? row.via}</td>
                                            <td className="p-4 font-mono text-xs text-admin-muted">{row.ip}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AdminTableShell>
            </AdminSection>
        </>
    );
}

/** Admin → Login & access. */
export default function AdminAccessPage() {
    const { adminToken } = useAdminAuth();
    const [session, setSession] = useState(null);
    useEffect(() => { api.get('/api/admin/session', adminToken).then(setSession).catch(() => setSession({ email: null, super: false, kind: 'server' })); }, [adminToken]);
    if (!session) return <AdminLoadingState />;

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Login & access" subtitle={session.super ? 'Your sign-in, the shop admin logins and the admin sign-in log.' : 'Your admin sign-in.'} />
            <AdminSection title="Your sign-in" description={session.email ? `Signed in as ${session.email}.` : 'Signed in with the studio login.'}>
                <OwnPassword session={session} />
            </AdminSection>
            {session.super && <ManageAccess />}
        </div>
    );
}
