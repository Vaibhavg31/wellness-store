import { useCallback, useEffect, useState } from 'react';
import { Copy, Eye, KeyRound, Pencil, Plug, RefreshCw, Send, Trash2, Webhook } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { AdminSection, AdminTextarea } from '@/components/admin/ContentEditor';
import { AdminEmptyState, AdminLoadingState, AdminMenu, AdminPageHeader, AdminSelect, AdminStatusPill, AdminTableShell } from '@/components/admin/AdminUi';
import { useSingleFlight } from '@/hooks/useSingleFlight';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '–');
const errorText = (err, fallback) => (err instanceof Error ? err.message : fallback);
const apiBase = () => `${window.location.origin}/api/v1`;
const IP_EXAMPLE = ['203.0.113.7', '198.51.100.0/24'].join(String.fromCharCode(10));

async function copy(text, showToast, what = 'Copied') {
    try { await navigator.clipboard.writeText(text); showToast(what, 'success'); } catch { showToast('Could not copy. Select the text and copy it by hand.', 'error'); }
}

function Checks({ legend, options, value, onChange }) {
    return (
        <fieldset>
            {legend && <legend className="mb-1.5 text-small font-medium text-ink">{legend}</legend>}
            <div className="grid gap-2 sm:grid-cols-2">
                {options.map((o) => (
                    <label key={o.id} className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-ink">
                        <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((v) => v !== o.id))} />
                        <span><span className="font-medium">{o.label}</span>{o.hint && <span className="block text-xs text-admin-muted">{o.hint}</span>}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

/** Shows a key or secret that will not be shown again, with a copy button. */
function SecretModal({ secret, onClose }) {
    const { showToast } = useToast();
    return (
        <Modal isOpen={Boolean(secret)} onClose={onClose} title={secret?.title ?? ''} size="sm">
            {secret && (
                <div className="space-y-4">
                    <p className="text-sm text-ink">{secret.text}</p>
                    <div className="break-all rounded-lg border border-admin-border bg-admin-surface-alt p-3 font-mono text-sm text-ink" data-secret>{secret.value}</div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="turmeric" onClick={() => copy(secret.value, showToast, 'Copied. Send it to the partner privately.')}><Copy size={15} /> Copy</Button>
                        <Button variant="ghost" onClick={onClose}>I have saved it</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Partners ──────────────────────────────────────────────────────────────────────────────────────────────────────────

function PartnerForm({ partner, meta, onSaved, onCancel }) {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState({
        name: partner?.name ?? '', contactEmail: partner?.contactEmail ?? '',
        scopes: partner?.scopes ?? meta.scopes.map((s) => s.id), allowedPayments: partner?.allowedPayments ?? ['prepaid'],
        ipAllowlist: (partner?.ipAllowlist ?? []).join('\n'),
    });
    const [saving, setSaving] = useState(false);
    const save = useSingleFlight(async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = { ...form, ipAllowlist: form.ipAllowlist };
            if (partner) { await api.put(`/api/admin/integrations/partners/${partner.id}`, body, adminToken); showToast('Partner saved', 'success'); onSaved(null); }
            else { const res = await api.post('/api/admin/integrations/partners', body, adminToken); onSaved(res.apiKey); }
        } catch (err) { showToast(errorText(err, 'Could not save'), 'error'); } finally { setSaving(false); }
    });
    return (
        <form onSubmit={save} className="grid gap-4 rounded-xl border border-admin-border bg-admin-surface-alt p-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Partner name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} hint="Shown on their orders, e.g. “Amazon”, “Corporate gifting desk”" required />
                <Input label="Contact email (optional)" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} hint="Who to tell if the key changes" />
            </div>
            <Checks legend="What this key may do" options={meta.scopes} value={form.scopes} onChange={(scopes) => setForm({ ...form, scopes })} />
            <Checks
                legend="How their orders are paid"
                options={meta.payments.map((p) => ({ ...p, hint: p.id === 'prepaid' ? 'The partner has already taken the money; the order is marked paid.' : 'Your courier collects cash; uses the shop’s cash-on-delivery switch.' }))}
                value={form.allowedPayments}
                onChange={(allowedPayments) => setForm({ ...form, allowedPayments })}
            />
            <div>
                <label htmlFor="partner-ips" className="mb-1.5 block text-small font-medium text-ink">Only allow these IP addresses (optional)</label>
                <AdminTextarea id="partner-ips" rows={2} value={form.ipAllowlist} onChange={(v) => setForm({ ...form, ipAllowlist: typeof v === 'string' ? v : v.target.value })} placeholder={IP_EXAMPLE} />
                <p className="mt-1.5 text-caption text-muted">One per line. Leave empty to allow any address. Ask the partner for their server’s fixed IP for extra safety.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="turmeric" disabled={saving}>{saving ? 'Saving…' : partner ? 'Save changes' : 'Create partner and key'}</Button>
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
        </form>
    );
}

function Partners({ data, reload, onSecret }) {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [editing, setEditing] = useState(null);
    const scopeLabel = Object.fromEntries(data.scopes.map((s) => [s.id, s.label]));

    const act = async (fn, ok) => { try { await fn(); if (ok) showToast(ok, 'success'); reload(); } catch (err) { showToast(errorText(err, 'Could not do that'), 'error'); } };
    const rotate = (p) => {
        if (!confirm(`Make a new key for ${p.name}? Their current key stops working at once, so give them the new one straight away.`)) return;
        act(async () => { const res = await api.post(`/api/admin/integrations/partners/${p.id}/rotate-key`, {}, adminToken); onSecret({ title: `New API key for ${p.name}`, text: 'Copy it now: for safety it is shown only this once. The old key has stopped working.', value: res.apiKey }); });
    };
    const remove = (p) => {
        if (!confirm(`Remove ${p.name}? Their key stops working and their webhooks are removed. Their orders stay in Orders.`)) return;
        act(() => api.delete(`/api/admin/integrations/partners/${p.id}`, adminToken), 'Partner removed');
    };

    return (
        <AdminSection title="API partners" description="A partner is another business whose system places orders in your shop (a marketplace, a reseller, a gifting desk). Each gets its own secret key. Prices always come from your shop, never from the partner.">
            {editing ? (
                <PartnerForm
                    partner={editing === 'new' ? null : editing}
                    meta={data}
                    onCancel={() => setEditing(null)}
                    onSaved={(key) => {
                        const name = editing === 'new' ? 'the partner' : editing.name;
                        setEditing(null); reload();
                        if (key) onSecret({ title: 'Partner created: here is their API key', text: `Send this key to ${name} privately (not in a group chat). For safety it is shown only this once; if it is lost, make a new one.`, value: key });
                    }}
                />
            ) : (
                <div><Button variant="outline" size="sm" onClick={() => setEditing('new')}><Plug size={15} /> Add partner</Button></div>
            )}
            <AdminTableShell>
                {data.partners.length === 0 ? (
                    <AdminEmptyState icon={Plug} title="No partners yet" description="Add one to give another business an API key for placing orders." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead><tr className="border-b border-admin-border bg-admin-surface-alt text-left">
                                <th className="p-4 font-medium text-admin-muted">Partner</th><th className="p-4 font-medium text-admin-muted">Key</th>
                                <th className="p-4 font-medium text-admin-muted">May</th><th className="p-4 font-medium text-admin-muted">Orders</th>
                                <th className="p-4 font-medium text-admin-muted">Last used</th><th className="w-14 p-4"><span className="sr-only">Actions</span></th>
                            </tr></thead>
                            <tbody>
                                {data.partners.map((p) => (
                                    <tr key={p.id} className="border-b border-admin-border-light align-top">
                                        <td className="p-4">
                                            <p className="font-medium text-ink">{p.name}</p>
                                            {p.contactEmail && <p className="text-xs text-admin-muted">{p.contactEmail}</p>}
                                            <div className="mt-1"><AdminStatusPill tone={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Key works' : 'Switched off'}</AdminStatusPill></div>
                                        </td>
                                        <td className="p-4 font-mono text-xs text-ink">{p.keyPrefix}…</td>
                                        <td className="p-4 text-xs text-ink">
                                            {p.scopes.map((s) => <p key={s}>{scopeLabel[s] ?? s}</p>)}
                                            <p className="mt-1 text-admin-muted">Payment: {p.allowedPayments.join(', ')}{p.ipAllowlist.length > 0 ? ` · ${p.ipAllowlist.length} IP${p.ipAllowlist.length > 1 ? 's' : ''} only` : ''}</p>
                                        </td>
                                        <td className="p-4 tabular-nums text-ink">{p.orderCount}</td>
                                        <td className="p-4 text-ink">{fmt(p.lastUsedAt)}</td>
                                        <td className="p-4">
                                            <AdminMenu label={`More actions for ${p.name}`} items={[
                                                { label: 'Edit', icon: Pencil, onClick: () => setEditing(p) },
                                                { label: 'Make a new key', icon: RefreshCw, onClick: () => rotate(p) },
                                                p.isActive
                                                    ? { label: 'Switch key off', icon: KeyRound, onClick: () => act(() => api.put(`/api/admin/integrations/partners/${p.id}`, { isActive: false }, adminToken), 'Key switched off. Their calls are refused until you switch it on.') }
                                                    : { label: 'Switch key on', icon: KeyRound, onClick: () => act(() => api.put(`/api/admin/integrations/partners/${p.id}`, { isActive: true }, adminToken), 'Key switched on') },
                                                { label: 'Remove', icon: Trash2, danger: true, onClick: () => remove(p) },
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
    );
}

// ── Webhooks ──────────────────────────────────────────────────────────────────────────────────────────────────────────

function WebhookForm({ hook, data, onSaved, onCancel }) {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const allEvents = !hook || hook.events.includes('*');
    const [form, setForm] = useState({ url: hook?.url ?? '', description: hook?.description ?? '', partnerId: hook?.partnerId ?? '', all: allEvents, events: allEvents ? [] : hook.events });
    const [saving, setSaving] = useState(false);
    const save = useSingleFlight(async (e) => {
        e.preventDefault();
        if (!form.all && form.events.length === 0) return showToast('Tick at least one event, or choose “Every event”', 'error');
        setSaving(true);
        try {
            const body = { url: form.url, description: form.description, partnerId: form.partnerId || null, events: form.all ? ['*'] : form.events };
            if (hook) { await api.put(`/api/admin/integrations/webhooks/${hook.id}`, body, adminToken); showToast('Webhook saved', 'success'); onSaved(null); }
            else { const res = await api.post('/api/admin/integrations/webhooks', body, adminToken); onSaved(res.secret); }
        } catch (err) { showToast(errorText(err, 'Could not save'), 'error'); } finally { setSaving(false); }
        return undefined;
    });
    return (
        <form onSubmit={save} className="grid gap-4 rounded-xl border border-admin-border bg-admin-surface-alt p-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Send to this address" type="url" inputMode="url" value={form.url} placeholder="https://partner.example.com/chikit-webhook" onChange={(e) => setForm({ ...form, url: e.target.value })} hint="Must be https://. The receiver gets a signed POST for each event." required />
                <Input label="Note (optional)" value={form.description} maxLength={160} onChange={(e) => setForm({ ...form, description: e.target.value })} hint="e.g. “Shiprocket”, “Our ERP”" />
            </div>
            <div className="max-w-md">
                <label htmlFor="hook-partner" className="mb-1.5 block text-small font-medium text-ink">Which orders</label>
                <AdminSelect id="hook-partner" value={form.partnerId} onChange={(v) => setForm({ ...form, partnerId: typeof v === 'string' ? v : v.target.value })} options={[{ value: '', label: 'Every order in the shop' }, ...data.partners.map((p) => ({ value: p.id, label: `Only orders from ${p.name}` }))]} />
                <p className="mt-1.5 text-caption text-muted">A partner’s webhook should only hear about that partner’s orders. Use “Every order” for your own tools (shipping, accounts).</p>
            </div>
            <fieldset>
                <legend className="mb-1.5 text-small font-medium text-ink">Which events</legend>
                <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-ink">
                    <input type="checkbox" className="size-4 accent-primary" checked={form.all} onChange={(e) => setForm({ ...form, all: e.target.checked })} />
                    <span className="font-medium">Every event (also new ones added later)</span>
                </label>
                {!form.all && <Checks legend="" options={data.events.map((ev) => ({ id: ev.id, label: ev.label, hint: ev.id }))} value={form.events} onChange={(events) => setForm({ ...form, events })} />}
            </fieldset>
            <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="turmeric" disabled={saving}>{saving ? 'Saving…' : hook ? 'Save changes' : 'Add webhook'}</Button>
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
        </form>
    );
}

function Webhooks({ data, reload, onSecret, onTested }) {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [editing, setEditing] = useState(null);
    const [testing, setTesting] = useState('');
    const partnerName = Object.fromEntries(data.partners.map((p) => [p.id, p.name]));
    const eventLabel = Object.fromEntries(data.events.map((e) => [e.id, e.label]));

    const act = async (fn, ok) => { try { await fn(); if (ok) showToast(ok, 'success'); reload(); } catch (err) { showToast(errorText(err, 'Could not do that'), 'error'); } };
    const test = async (h) => {
        setTesting(h.id);
        try {
            const d = await api.post(`/api/admin/integrations/webhooks/${h.id}/test`, {}, adminToken);
            if (d.status === 'delivered') showToast(`Test delivered: the receiver answered ${d.responseCode} in ${d.durationMs} ms`, 'success');
            else showToast(`Test not delivered: ${d.error || `the receiver answered ${d.responseCode}`}`, 'error');
            onTested(); reload();
        } catch (err) { showToast(errorText(err, 'Could not send the test'), 'error'); } finally { setTesting(''); }
    };
    const reveal = (h) => act(async () => { const res = await api.get(`/api/admin/integrations/webhooks/${h.id}/secret`, adminToken); onSecret({ title: 'Signing secret', text: 'The receiver uses this to check each message really came from your shop. Keep it private.', value: res.secret }); });
    const rotate = (h) => {
        if (!confirm('Make a new signing secret? Messages are signed with the new one at once, so update the receiver straight away.')) return;
        act(async () => { const res = await api.post(`/api/admin/integrations/webhooks/${h.id}/rotate-secret`, {}, adminToken); onSecret({ title: 'New signing secret', text: 'Put this in the receiving system now: messages are already signed with it.', value: res.secret }); });
    };
    const remove = (h) => { if (confirm(`Remove the webhook to ${h.url}? It stops getting messages, and its log is deleted.`)) act(() => api.delete(`/api/admin/integrations/webhooks/${h.id}`, adminToken), 'Webhook removed'); };

    return (
        <AdminSection title="Webhooks" description={`Your shop sends a signed message to these addresses the moment an order is placed or changes (status, payment, tracking, return, refund). A failed message is tried again ${data.maxAttempts} times over about two days.`}>
            {editing ? (
                <WebhookForm
                    hook={editing === 'new' ? null : editing}
                    data={data}
                    onCancel={() => setEditing(null)}
                    onSaved={(secret) => { setEditing(null); reload(); if (secret) onSecret({ title: 'Webhook added: here is its signing secret', text: 'Give this to whoever runs the receiving system. Every message carries a signature made with it (X-Chikit-Signature), so they can check it came from you. You can see it again later under “Show signing secret”.', value: secret }); }}
                />
            ) : (
                <div><Button variant="outline" size="sm" onClick={() => setEditing('new')}><Webhook size={15} /> Add webhook</Button></div>
            )}
            <AdminTableShell>
                {data.webhooks.length === 0 ? (
                    <AdminEmptyState icon={Webhook} title="No webhooks yet" description="Add the address a partner (or your own tool) gave you to be told about orders." />
                ) : (
                    <ul className="divide-y divide-admin-border-light">
                        {data.webhooks.map((h) => (
                            <li key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                                <div className="min-w-0 flex-1">
                                    <p className="break-all font-mono text-xs text-ink">{h.url}</p>
                                    <p className="mt-1 text-xs text-admin-muted">
                                        {h.description && <>{h.description} · </>}
                                        {h.partnerId ? `Orders from ${partnerName[h.partnerId] ?? 'a removed partner'}` : 'Every order'} ·{' '}
                                        {h.events.includes('*') ? 'every event' : h.events.map((e) => eventLabel[e] ?? e).join(', ')}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                        <AdminStatusPill tone={!h.isActive ? 'default' : h.consecutiveFailures > 0 ? 'danger' : 'success'}>
                                            {!h.isActive ? 'Switched off' : h.consecutiveFailures > 0 ? `${h.consecutiveFailures} failed in a row` : 'Working'}
                                        </AdminStatusPill>
                                        {h.lastSuccessAt && <span className="text-admin-muted">Last delivered {fmt(h.lastSuccessAt)}</span>}
                                        {h.pending > 0 && <span className="text-admin-muted">{h.pending} waiting to retry</span>}
                                        {h.failed > 0 && <span className="text-danger">{h.failed} gave up</span>}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button variant="outline" size="sm" onClick={() => test(h)} disabled={!h.isActive || testing === h.id}><Send size={14} /> {testing === h.id ? 'Sending…' : 'Send test'}</Button>
                                    <AdminMenu label={`More actions for the webhook to ${h.url}`} items={[
                                        { label: 'Edit', icon: Pencil, onClick: () => setEditing(h) },
                                        { label: 'Show signing secret', icon: Eye, onClick: () => reveal(h) },
                                        { label: 'Make a new secret', icon: RefreshCw, onClick: () => rotate(h) },
                                        h.isActive
                                            ? { label: 'Switch off', icon: Webhook, onClick: () => act(() => api.put(`/api/admin/integrations/webhooks/${h.id}`, { isActive: false }, adminToken), 'Webhook switched off') }
                                            : { label: 'Switch on', icon: Webhook, onClick: () => act(() => api.put(`/api/admin/integrations/webhooks/${h.id}`, { isActive: true }, adminToken), 'Webhook switched on') },
                                        { label: 'Remove', icon: Trash2, danger: true, onClick: () => remove(h) },
                                    ]} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </AdminTableShell>
        </AdminSection>
    );
}

// ── Delivery log ──────────────────────────────────────────────────────────────────────────────────────────────────────

const STATUS = { delivered: ['success', 'Delivered'], pending: ['warning', 'Will retry'], sending: ['warning', 'Sending'], failed: ['danger', 'Gave up'], skipped: ['default', 'Not sent'] };

function DeliveryLog({ data, refreshKey }) {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [status, setStatus] = useState('');
    const [rows, setRows] = useState(null);
    const [open, setOpen] = useState(null);
    const urlOf = Object.fromEntries(data.webhooks.map((w) => [w.id, w.description || w.url]));

    const load = useCallback(() => {
        api.get(`/api/admin/integrations/deliveries?limit=60${status ? `&status=${status}` : ''}`, adminToken).then(setRows).catch(() => setRows([]));
    }, [adminToken, status]);
    useEffect(() => { load(); }, [load, refreshKey]);

    const retry = async (d) => {
        try {
            const res = await api.post(`/api/admin/integrations/deliveries/${d.id}/retry`, {}, adminToken);
            showToast(res.status === 'delivered' ? 'Sent again: delivered' : `Sent again, still failing: ${res.error || res.responseCode}`, res.status === 'delivered' ? 'success' : 'error');
            load();
        } catch (err) { showToast(errorText(err, 'Could not resend'), 'error'); }
    };
    const view = async (d) => { try { setOpen(await api.get(`/api/admin/integrations/deliveries/${d.id}`, adminToken)); } catch (err) { showToast(errorText(err, 'Could not open it'), 'error'); } };

    return (
        <AdminSection title="Webhook log" description="Every message sent, newest first. Delivered messages are kept 30 days, failed ones 90 days.">
            <div className="flex flex-wrap items-center gap-2">
                <AdminSelect aria-label="Show" value={status} onChange={(v) => setStatus(typeof v === 'string' ? v : v.target.value)} options={[{ value: '', label: 'All messages' }, { value: 'failed', label: 'Gave up' }, { value: 'pending', label: 'Will retry' }, { value: 'delivered', label: 'Delivered' }]} />
                <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={14} /> Refresh</Button>
            </div>
            <AdminTableShell>
                {rows === null ? <AdminLoadingState /> : rows.length === 0 ? (
                    <AdminEmptyState icon={Send} title="Nothing sent yet" description="Messages appear here once a webhook is added and an order is placed or changes. Try “Send test”." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead><tr className="border-b border-admin-border bg-admin-surface-alt text-left">
                                <th className="p-3 font-medium text-admin-muted">When</th><th className="p-3 font-medium text-admin-muted">Event</th>
                                <th className="p-3 font-medium text-admin-muted">To</th><th className="p-3 font-medium text-admin-muted">Result</th>
                                <th className="p-3 font-medium text-admin-muted">Tries</th><th className="p-3"><span className="sr-only">Actions</span></th>
                            </tr></thead>
                            <tbody>
                                {rows.map((d) => {
                                    const [tone, label] = STATUS[d.status] ?? ['default', d.status];
                                    return (
                                        <tr key={d.id} className="border-b border-admin-border-light align-top">
                                            <td className="whitespace-nowrap p-3 text-ink">{fmt(d.createdAt)}</td>
                                            <td className="p-3"><p className="font-mono text-xs text-ink">{d.eventType}</p>{d.orderId && <p className="font-mono text-[11px] text-admin-muted">{d.orderId}</p>}</td>
                                            <td className="max-w-[14rem] truncate p-3 text-xs text-ink" title={urlOf[d.endpointId]}>{urlOf[d.endpointId] ?? 'Removed webhook'}</td>
                                            <td className="p-3">
                                                <AdminStatusPill tone={tone}>{label}</AdminStatusPill>
                                                <p className="mt-1 text-[11px] text-admin-muted">{d.responseCode ? `Answered ${d.responseCode}` : ''}{d.error && d.status !== 'delivered' ? ` ${d.error}` : ''}{d.nextAttemptAt ? ` · next try ${fmt(d.nextAttemptAt)}` : ''}</p>
                                            </td>
                                            <td className="p-3 tabular-nums text-ink">{d.attempts}</td>
                                            <td className="whitespace-nowrap p-3 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => view(d)}>View</Button>
                                                {d.status !== 'sending' && d.status !== 'skipped' && <Button variant="ghost" size="sm" onClick={() => retry(d)}>Send again</Button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminTableShell>
            <Modal isOpen={Boolean(open)} onClose={() => setOpen(null)} title={open ? `${open.eventType} message` : ''} size="lg">
                {open && (
                    <div className="space-y-3 text-sm">
                        <p className="text-admin-muted">Event id <span className="font-mono text-ink">{open.eventId}</span> · delivery <span className="font-mono text-ink">{open.id}</span></p>
                        <pre className="max-h-[50vh] overflow-auto rounded-lg border border-admin-border bg-admin-surface-alt p-3 font-mono text-xs text-ink">{JSON.stringify(open.payload, null, 2)}</pre>
                        {open.responseBody && <><p className="font-medium text-ink">The receiver answered {open.responseCode}:</p><pre className="max-h-40 overflow-auto rounded-lg border border-admin-border bg-admin-surface-alt p-3 font-mono text-xs text-ink">{open.responseBody}</pre></>}
                    </div>
                )}
            </Modal>
        </AdminSection>
    );
}

// ── Quick guide ───────────────────────────────────────────────────────────────────────────────────────────────────────

function QuickGuide({ version }) {
    const { showToast } = useToast();
    const example = `curl -X POST ${apiBase()}/orders \\
  -H "Authorization: Bearer ck_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalRef": "PARTNER-10023",
    "payment": "prepaid",
    "customer": { "name": "Asha Rao", "email": "asha@example.com" },
    "shipping": { "phone": "9876543210", "address": "12 MG Road", "city": "Pune", "state": "Maharashtra", "pincode": "411001" },
    "items": [ { "sku": "WS-BIO-1M", "quantity": 2 } ]
  }'`;
    return (
        <AdminSection title="How a partner connects" description="Send the partner their API key and this address. The full guide for their developers (every field, error and webhook) is docs/partner-api.md in the project.">
            <div className="grid gap-3 text-sm text-ink">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-admin-muted">API address</span>
                    <code className="rounded bg-admin-surface-alt px-2 py-1 font-mono text-xs">{apiBase()}</code>
                    <Button variant="ghost" size="sm" onClick={() => copy(apiBase(), showToast)}><Copy size={14} /> Copy</Button>
                    <span className="text-xs text-admin-muted">version {version}</span>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-admin-muted">
                    <li><span className="font-mono text-ink">GET /products</span>: the catalogue with prices, pack sizes (SKU) and stock.</li>
                    <li><span className="font-mono text-ink">POST /orders/quote</span>: what an order would cost, without placing it.</li>
                    <li><span className="font-mono text-ink">POST /orders</span>: place an order. Sending the same <span className="font-mono">externalRef</span> twice never makes two orders.</li>
                    <li><span className="font-mono text-ink">GET /orders</span>, <span className="font-mono text-ink">GET /orders/:id</span>, <span className="font-mono text-ink">POST /orders/:id/cancel</span>: follow and cancel their own orders.</li>
                </ul>
                <pre className="overflow-x-auto rounded-lg border border-admin-border bg-admin-surface-alt p-3 font-mono text-xs leading-relaxed">{example}</pre>
            </div>
        </AdminSection>
    );
}

/** Admin → API & webhooks. */
export default function AdminIntegrationsPage() {
    const { adminToken } = useAdminAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [secret, setSecret] = useState(null);
    const [logKey, setLogKey] = useState(0);
    const reload = useCallback(() => {
        api.get('/api/admin/integrations', adminToken).then((d) => { setData(d); setError(''); }).catch((err) => setError(errorText(err, 'Could not load')));
    }, [adminToken]);
    useEffect(() => { reload(); }, [reload]);

    if (error && !data) return <p className="text-sm text-danger">{error}</p>;
    if (!data) return <AdminLoadingState />;
    return (
        <div className="space-y-6">
            <AdminPageHeader title="API & webhooks" subtitle="Let other businesses place orders from their own systems, and tell them (or your own tools) the moment an order changes." />
            <Partners data={data} reload={reload} onSecret={setSecret} />
            <Webhooks data={data} reload={() => { reload(); setLogKey((k) => k + 1); }} onSecret={setSecret} onTested={() => setLogKey((k) => k + 1)} />
            <DeliveryLog data={data} refreshKey={logKey} />
            <QuickGuide version={data.apiVersion} />
            <SecretModal secret={secret} onClose={() => setSecret(null)} />
        </div>
    );
}
