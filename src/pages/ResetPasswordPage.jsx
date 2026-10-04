import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthShell from '@/components/auth/AuthShell';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { api } from '@/services/api';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/auth/reset-password', { token, email, password, confirmPassword: confirm });
            setDone(true);
            setTimeout(() => navigate('/login', { replace: true }), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token || !email) {
        return (
            <AuthShell backTo="/login" backLabel="← Back to sign in">
                <div className="text-center">
                    <h1 className="mb-4 text-h3">Invalid reset link</h1>
                    <Link to="/forgot-password" className="font-medium text-primary hover:underline">Request a new link</Link>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell backTo="/login" backLabel="← Back to sign in">
            <h1 className="mb-8 text-center text-h2">Set new password</h1>
            {done ? (
                <p className="rounded-lg bg-success-tint p-5 text-center text-ink" role="status">Password updated. Redirecting to sign in…</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                    <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
                    {error && <p className="text-center text-small text-danger" role="alert">{error}</p>}
                    <Button size="lg" className="w-full" type="submit" loading={loading}>Update password</Button>
                </form>
            )}
        </AuthShell>
    );
}
