import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '@/components/auth/AuthShell';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { api } from '@/services/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/api/auth/forgot-password', { email });
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell backTo="/login" backLabel="← Back to sign in">
            <h1 className="mb-2 text-center text-h2">Forgot password</h1>
            <p className="mb-8 text-center text-small text-muted">Enter your email and we&apos;ll send a secure reset link if an account exists.</p>

            {sent ? (
                <p className="rounded-lg bg-success-tint p-5 text-center text-ink" role="status">Check your inbox for a reset link. It expires in 1 hour.</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                    {error && <p className="text-center text-small text-danger" role="alert">{error}</p>}
                    <Button size="lg" className="w-full" type="submit" loading={loading}>Send reset link</Button>
                </form>
            )}
        </AuthShell>
    );
}
