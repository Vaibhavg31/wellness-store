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
        label: 'Email Service',
        description: 'Order confirmations, shipping updates, password reset emails (Brevo)',
        hint: 'Also requires BREVO_API_KEY in config.json',
    },
    {
        key: 'otpEnabled',
        group: 'services',
        label: 'OTP Service',
        description: 'Mobile number verification at checkout (MSG91)',
        hint: 'When off, customers can place orders without OTP',
    },
    {
        key: 'googleSignInEnabled',
        group: 'services',
        label: 'Google Sign-In',
        description: 'Allow customers to sign in with Google',
        hint: 'Also requires GOOGLE_CLIENT_ID in config.json',
    },
    {
        key: 'onlinePaymentEnabled',
        group: 'payments',
        label: 'Online Payment (Razorpay)',
        description: 'UPI, cards and net banking at checkout',
        hint: 'Also requires Razorpay keys in config.json. Products can override.',
    },
    {
        key: 'codEnabled',
        group: 'payments',
        label: 'Cash on Delivery',
        description: 'Pay when the order arrives',
        hint: 'Products can override this per item in the product editor',
    },
];

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
                subtitle="Enable or disable store services and homepage sections."
                actions={
                    <AdminSaveBar
                        hasChanges={hasChanges}
                        saving={saving}
                        saved={saved}
                        onSave={handleSave}
                        saveLabel="Save Settings"
                    />
                }
            />

            <div>
                <h2 className="text-sm font-semibold text-ink mb-1">Store Services</h2>
                <p className="text-xs text-admin-muted mb-3">
                    Turn features on or off site-wide. Credentials still come from config.json — toggles control whether each service is active.
                </p>
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
                <h2 className="text-sm font-semibold text-ink mb-1">Homepage Sections</h2>
                <p className="text-xs text-admin-muted mb-3">
                    Managed in one place — show/hide and drag to reorder homepage sections there.
                </p>
                <div className="max-w-xl">
                    <AdminPromoCard
                        to={`${ADMIN_PATH}/content`}
                        icon={Layers}
                        title="Open Content Manager"
                        description="Homepage tab — toggle visibility and drag sections into order"
                    />
                </div>
            </div>

            <AdminSaveBar
                sticky
                hasChanges={hasChanges}
                saving={saving}
                saved={saved}
                onSave={handleSave}
                saveLabel="Save Settings"
            />
        </div>
    );
}
