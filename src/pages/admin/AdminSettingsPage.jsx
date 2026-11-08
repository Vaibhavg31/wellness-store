import { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useAdminDirtySave } from '@/hooks/useAdminDirtySave';
import { ToggleSwitch } from '@/components/admin/AdminFormUi';
import { AdminPageHeader, AdminLoadingState, AdminTableShell, AdminSaveBar, AdminPromoCard } from '@/components/admin/AdminUi';

const serviceToggles = [
    {
        key: 'emailEnabled',
        group: 'services',
        label: 'Emails to customers',
        description: 'Order confirmations, shipping updates and password reset emails',
        hint: 'Needs the email account to be connected (done once by your developer).',
    },
    {
        key: 'otpEnabled',
        group: 'services',
        label: 'Phone verification at checkout',
        description: 'Customers confirm their mobile number with a one-time code',
        hint: 'When off, customers can place orders without the code.',
    },
    {
        key: 'googleSignInEnabled',
        group: 'services',
        label: 'Sign in with Google',
        description: 'Let customers sign in with their Google account',
        hint: 'Needs a Google sign-in key (done once by your developer).',
    },
    {
        key: 'onlinePaymentEnabled',
        group: 'payments',
        label: 'Online payment',
        description: 'UPI, cards and net banking at checkout',
        hint: 'Needs Razorpay to be connected (done once by your developer). Each product can override this.',
    },
    {
        key: 'codEnabled',
        group: 'payments',
        label: 'Cash on Delivery',
        description: 'Pay when the order arrives',
        hint: 'Each product can override this in its own page.',
    },
];

function StatusPill({ ok, children }) {
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning'}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${ok ? 'bg-success' : 'bg-warning'}`} />
            {children}
        </span>
    );
}

/** Whether the payment gateway and Google sign-in keys are in place (they live in the server config, not in this page). */
function Connections({ adminToken }) {
    const [status, setStatus] = useState(null);
    useEffect(() => {
        if (!adminToken) return;
        api.get('/api/admin/integrations/status', adminToken).then(setStatus).catch(() => setStatus(false));
    }, [adminToken]);
    if (status === null) return null;
    if (status === false) return <p className="text-xs text-admin-muted">Could not read the connection status.</p>;
    const { razorpay: rp, google } = status;
    const row = 'flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4';
    return (
        <AdminTableShell className="max-w-2xl">
            <div className={`${row} border-b border-admin-border-light`}>
                <div className="min-w-0">
                    <span className="block text-sm font-medium text-ink">Razorpay (online payment)</span>
                    <span className="mt-0.5 block text-xs text-admin-muted">
                        {rp.connected
                            ? rp.mode === 'test' ? 'Test keys: payments are not real. Use Razorpay test cards and UPI ids.' : 'Live keys: real payments.'
                            : 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server config, then restart.'}
                        {' '}Unpaid online orders are held {rp.paymentWindowMinutes} minutes.
                    </span>
                </div>
                <StatusPill ok={rp.connected}>{rp.connected ? (rp.mode === 'test' ? 'Connected · Test mode' : 'Connected · Live') : 'Not connected'}</StatusPill>
            </div>
            <div className={`${row} border-b border-admin-border-light`}>
                <div className="min-w-0">
                    <span className="block text-sm font-medium text-ink">Razorpay webhook</span>
                    <span className="mt-0.5 block text-xs text-admin-muted break-all">
                        Confirms payments even when a customer closes the page. In Razorpay → Settings → Webhooks add <code className="rounded bg-canvas-alt px-1">{rp.webhookUrl}</code> with the events payment.captured, payment.failed, payment.authorized, order.paid, refund.processed and refund.failed, and put its secret in RAZORPAY_WEBHOOK_SECRET.
                    </span>
                </div>
                <StatusPill ok={rp.webhookConnected}>{rp.webhookConnected ? 'Connected' : 'Not set'}</StatusPill>
            </div>
            <div className={row}>
                <div className="min-w-0">
                    <span className="block text-sm font-medium text-ink">Google sign-in</span>
                    <span className="mt-0.5 block text-xs text-admin-muted break-all">
                        {google.connected
                            ? `Client ${google.clientId.slice(0, 12)}…${google.origin ? ` · ${google.origin} must be listed under "Authorised JavaScript origins" in Google Cloud.` : ''}`
                            : 'Add GOOGLE_CLIENT_ID to the server config, then restart.'}
                    </span>
                </div>
                <StatusPill ok={google.connected}>{google.connected ? 'Connected' : 'Not connected'}</StatusPill>
            </div>
        </AdminTableShell>
    );
}

export default function AdminSettingsPage() {
    const { adminToken } = useAdminAuth();
    const { refetch } = useSiteContent();
    const [services, setServices] = useState(null);
    const [payments, setPayments] = useState(null);

    // Homepage section visibility/order is managed in exactly one place —
    // Content Manager → Homepage (with drag-to-reorder) — this page used to
    // have its own separate, incomplete, non-reorderable copy of the same
    // toggles, which was confusing and easy to get out of sync.
    const combined = useMemo(
        () => (services && payments ? { services, payments } : null),
        [services, payments],
    );

    const {
        hasChanges,
        saving,
        setSaving,
        saved,
        markSaved,
        clearSaved,
        resetBaseline,
        isReady,
    } = useAdminDirtySave(combined);

    useEffect(() => {
        api.get('/api/settings').then((s) => {
            const initial = {
                services: s.services ?? {},
                payments: s.payments ?? {},
            };
            setServices(initial.services);
            setPayments(initial.payments);
            resetBaseline(initial);
        });
    }, [resetBaseline]);

    const toggleService = (item) => {
        clearSaved();
        if (item.group === 'payments') {
            setPayments((prev) => ({
                ...prev,
                [item.key]: prev?.[item.key] === false,
            }));
            return;
        }
        setServices((prev) => ({
            ...prev,
            [item.key]: prev?.[item.key] === false,
        }));
    };

    const isEnabled = (group, key) => {
        const source = group === 'payments' ? payments : services;
        return source?.[key] !== false;
    };

    const handleSave = async () => {
        if (!adminToken || !combined || !hasChanges) return;
        setSaving(true);
        try {
            const updated = await api.put('/api/settings', combined, adminToken);
            refetch();
            markSaved({
                services: updated.services ?? combined.services,
                payments: updated.payments ?? combined.payments,
            });
        } finally {
            setSaving(false);
        }
    };

    if (!services || !payments || !isReady) {
        return <AdminLoadingState />;
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                title="Settings"
                subtitle="Switch store features on or off"
            />

            <div>
                <h2 className="mb-3 text-sm font-semibold text-ink">Store features</h2>
                <AdminTableShell className="max-w-2xl">
                    {serviceToggles.map((item, i, arr) => (
                        <div
                            key={item.key}
                            className={`flex items-start justify-between gap-4 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-admin-border-light' : ''}`}
                        >
                            <div className="min-w-0">
                                <span className="text-sm font-medium text-ink block">{item.label}</span>
                                <span className="text-xs text-admin-muted block mt-0.5">{item.description}</span>
                                {item.hint && (
                                    <span className="text-[11px] text-muted block mt-1">{item.hint}</span>
                                )}
                            </div>
                            <ToggleSwitch
                                enabled={isEnabled(item.group, item.key)}
                                onChange={() => toggleService(item)}
                                ariaLabel={`Toggle ${item.label}`}
                            />
                        </div>
                    ))}
                </AdminTableShell>
            </div>

            <div>
                <h2 className="mb-3 text-sm font-semibold text-ink">Connections</h2>
                <Connections adminToken={adminToken} />
            </div>

            <div>
                <h2 className="mb-3 text-sm font-semibold text-ink">Homepage</h2>
                <div className="max-w-xl">
                    <AdminPromoCard
                        to={`${ADMIN_PATH}/content`}
                        icon={Layers}
                        title="Edit homepage sections"
                        description="Show, hide and reorder the sections on your homepage"
                    />
                </div>
            </div>

            <AdminSaveBar
                sticky
                hasChanges={hasChanges}
                saving={saving}
                saved={saved}
                onSave={handleSave}
                saveLabel="Save changes"
            />
        </div>
    );
}
