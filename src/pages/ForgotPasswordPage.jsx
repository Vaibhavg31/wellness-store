import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
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
        <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-cream">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Logo size="md" showHover className="mx-auto mb-8" />
                <h1 className="font-display text-3xl text-ink text-center mb-2">Forgot password</h1>
                <p className="text-slate text-sm text-center mb-8">
                    Enter your email and we&apos;ll send a secure reset link if an account exists.
                </p>

                {sent ? (
                    <div className="p-5 rounded-2xl bg-forest/5 border border-forest/15 text-center">
                        <p className="text-ink mb-4">Check your inbox for a reset link. It expires in 1 hour.</p>
                        <Link to="/login" className="text-forest hover:text-forest-light text-sm">Back to sign in</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                        {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}
                        <Button variant="turmeric" size="lg" className="w-full" type="submit" disabled={loading}>
                            {loading ? 'Sending…' : 'Send reset link'}
                        </Button>
                        <Link to="/login" className="block text-center text-sm text-slate hover:text-forest">← Back to sign in</Link>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
