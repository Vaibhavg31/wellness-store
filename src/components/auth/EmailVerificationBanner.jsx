import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';

export default function EmailVerificationBanner({ className = '', compact = false, email: emailProp = '' }) {
    const { user, resendVerificationEmail } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const email = user?.email || emailProp;

    if (!email || user?.emailVerified) {
        return null;
    }

    const handleResend = async () => {
        setLoading(true);
        setMessage('');
        setError('');
        try {
            const res = await resendVerificationEmail(user ? undefined : email);
            setMessage(res?.message || 'Verification email sent. Check your inbox.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send email');
        } finally {
            setLoading(false);
        }
    };

    if (compact) {
        return (
            <div className={`p-4 rounded-xl bg-amber-50 border border-amber-200/80 ${className}`}>
                <p className="text-sm text-charcoal mb-2">
                    Verify <span className="font-medium">{email}</span> to place orders.
                </p>
                <Button variant="outline" size="sm" type="button" onClick={handleResend} disabled={loading}>
                    {loading ? 'Sending…' : 'Resend email'}
                </Button>
                {message && <p className="text-xs text-emerald mt-2">{message}</p>}
                {error && <p className="text-xs text-red-600 mt-2" role="alert">{error}</p>}
            </div>
        );
    }

    return (
        <div className={`p-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex gap-4 ${className}`}>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg text-charcoal mb-1">Verify your email</h3>
                <p className="text-sm text-soft-brown mb-3">
                    We sent a magic link to <span className="font-medium text-charcoal">{email}</span>.
                    Click it to verify and sign in.
                </p>
                <Button variant="outline" size="sm" type="button" onClick={handleResend} disabled={loading}>
                    {loading ? (
                        <span className="inline-flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Sending…
                        </span>
                    ) : (
                        'Resend verification email'
                    )}
                </Button>
                {message && <p className="text-xs text-emerald mt-2">{message}</p>}
                {error && <p className="text-xs text-red-600 mt-2" role="alert">{error}</p>}
            </div>
        </div>
    );
}
