import { useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useSingleFlight } from '@/hooks/useSingleFlight';

const card = 'rounded-xl border border-line bg-surface p-5 sm:p-6';

/** My Account → your name (editable), email and phone (shown), and the password (change it, or set one for a Google account). */
export default function AccountDetails() {
    const { token, user, updateUser } = useAuth();
    const { showToast } = useToast();

    const [name, setName] = useState(user?.name ?? '');
    const [nameError, setNameError] = useState('');
    const [savingName, setSavingName] = useState(false);
    const nameChanged = name.trim().replace(/\s+/g, ' ') !== (user?.name ?? '');

    const hasPassword = user?.hasPassword !== false;
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [pwError, setPwError] = useState('');
    const [savingPw, setSavingPw] = useState(false);

    const saveName = useSingleFlight(async (event) => {
        event.preventDefault();
        setNameError('');
        const clean = name.trim().replace(/\s+/g, ' ');
        if (!clean) { setNameError('Please enter your name'); return; }
        setSavingName(true);
        try {
            const updated = await api.put('/api/auth/profile', { name: clean }, token);
            updateUser({ name: updated.name });
            setName(updated.name);
            showToast('Your name has been updated', 'success');
        } catch (err) {
            setNameError(err instanceof Error ? err.message : 'Could not save your name');
        } finally {
            setSavingName(false);
        }
    });

    const savePassword = useSingleFlight(async (event) => {
        event.preventDefault();
        setPwError('');
        if (hasPassword && !pw.current) { setPwError('Please enter your current password'); return; }
        if (pw.next.length < 8) { setPwError('The new password must be at least 8 characters'); return; }
        if (pw.next !== pw.confirm) { setPwError('The new passwords do not match'); return; }
        setSavingPw(true);
        try {
            const res = await api.post('/api/auth/change-password', { currentPassword: pw.current, newPassword: pw.next, confirmPassword: pw.confirm }, token);
            setPw({ current: '', next: '', confirm: '' });
            updateUser({ hasPassword: true });
            showToast(res?.message || 'Your password has been changed', 'success');
        } catch (err) {
            setPwError(err instanceof Error ? err.message : 'Could not change your password');
        } finally {
            setSavingPw(false);
        }
    });

    return (
        <section aria-labelledby="account-details" className="mt-10 grid gap-4 lg:grid-cols-2">
            <form onSubmit={saveName} className={card} noValidate>
                <div className="mb-4 flex items-center gap-2">
                    <UserRound size={20} className="text-primary" aria-hidden="true" />
                    <h2 id="account-details" className="font-display text-xl text-ink">Your details</h2>
                </div>
                <div className="space-y-4">
                    <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" error={nameError || undefined} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="min-w-0">
                            <p className="text-small font-medium text-ink">Email</p>
                            <p className="mt-1 text-small text-muted [overflow-wrap:anywhere]">{user?.email}</p>
                        </div>
                        <div className="min-w-0">
                            <p className="text-small font-medium text-ink">Phone</p>
                            <p className="mt-1 text-small text-muted">{user?.phone || 'Added and verified at checkout'}</p>
                        </div>
                    </div>
                    <Button type="submit" size="sm" loading={savingName} disabled={!nameChanged}>Save name</Button>
                </div>
            </form>

            <form onSubmit={savePassword} className={card} noValidate>
                <div className="mb-4 flex items-center gap-2">
                    <KeyRound size={20} className="text-primary" aria-hidden="true" />
                    <h2 className="font-display text-xl text-ink">{hasPassword ? 'Change password' : 'Set a password'}</h2>
                </div>
                {!hasPassword && <p className="-mt-2 mb-4 text-small text-muted">You signed up with Google. Set a password to also sign in with your email.</p>}
                <div className="space-y-4">
                    {hasPassword && <Input label="Current password" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />}
                    <Input label="New password" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" hint="At least 8 characters" />
                    <Input label="Confirm new password" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
                    {pwError && <p role="alert" className="text-small text-danger">{pwError}</p>}
                    <Button type="submit" size="sm" loading={savingPw} disabled={!pw.next}>{hasPassword ? 'Change password' : 'Set password'}</Button>
                </div>
            </form>
        </section>
    );
}
