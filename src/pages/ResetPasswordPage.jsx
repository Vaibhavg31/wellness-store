import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
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
            <div className="min-h-screen flex items-center justify-center px-6 bg-cream">
                <div className="text-center max-w-md">
                    <h1 className="font-serif text-2xl mb-4">Invalid reset link</h1>
                    <Link to="/forgot-password" className="text-wine hover:text-wine-light">Request a new link</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-cream">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Logo size="md" showHover className="mx-auto mb-8" />
                <h1 className="font-serif text-3xl text-charcoal text-center mb-8">Set new password</h1>

                {done ? (
                    <p className="text-center text-charcoal">Password updated. Redirecting to sign in…</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                        <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
                        {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}
                        <Button variant="gold" size="lg" className="w-full" type="submit" disabled={loading}>
                            {loading ? 'Updating…' : 'Update password'}
                        </Button>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
