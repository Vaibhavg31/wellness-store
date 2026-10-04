import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

function getSafeRedirect(path) {
    if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
        return '/';
    }
    return path;
}

/** Dedupe verify API calls — React StrictMode mounts twice in dev. */
const verifyRequests = new Map();
/** Ensure login runs once per link (avoid toast / state loops). */
const verifyCompleted = new Set();

function verifyEmailOnce(token, email) {
    const key = `${email}:${token}`;
    if (verifyRequests.has(key)) {
        return verifyRequests.get(key);
    }

    const promise = api.post('/api/auth/verify-email', { token, email });
    verifyRequests.set(key, promise);
    promise.finally(() => {
        verifyRequests.delete(key);
    });

    return promise;
}

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');

    const token = (searchParams.get('token') || '').trim();
    const email = (searchParams.get('email') || '').trim().toLowerCase();
    const redirectTo = getSafeRedirect(searchParams.get('redirect'));
    const verifyKey = `${email}:${token}`;

    useEffect(() => {
        if (!token || !email) {
            setStatus('invalid');
            return undefined;
        }

        let cancelled = false;

        verifyEmailOnce(token, email)
            .then((res) => {
                if (cancelled || verifyCompleted.has(verifyKey)) return;
                verifyCompleted.add(verifyKey);

                if (res.token && res.user) {
                    login(res.token, res.user);
                }

                setStatus('success');
                setMessage(res?.message || 'Email verified successfully.');
            })
            .catch((err) => {
                if (cancelled) return;
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Verification failed');
            });

        return () => {
            cancelled = true;
        };
    }, [token, email, verifyKey, login]);

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-canvas">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md text-center"
            >
                <Logo size="md" showHover className="mx-auto mb-8" />

                {status === 'loading' && (
                    <>
                        <h1 className="font-display text-3xl text-ink mb-3">Verifying your email…</h1>
                        <p className="text-muted text-sm">Please wait a moment.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle size={48} className="text-primary mx-auto mb-4" />
                        <h1 className="font-display text-3xl text-ink mb-3">You&apos;re signed in</h1>
                        <p className="text-muted text-sm mb-8">{message}</p>
                        <Button
                            variant="turmeric"
                            size="lg"
                            className="w-full"
                            type="button"
                            onClick={() => navigate(redirectTo, { replace: true })}
                        >
                            Continue shopping
                        </Button>
                    </>
                )}

                {(status === 'error' || status === 'invalid') && (
                    <>
                        <XCircle size={48} className="text-primary mx-auto mb-4" />
                        <h1 className="font-display text-3xl text-ink mb-3">
                            {status === 'invalid' ? 'Invalid link' : 'Verification failed'}
                        </h1>
                        <p className="text-muted text-sm mb-8">
                            {status === 'invalid'
                                ? 'This verification link is missing required information.'
                                : message}
                        </p>
                        <div className="space-y-3">
                            <Link
                                to={`/verify-email-pending?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`}
                                className="block"
                            >
                                <Button variant="turmeric" size="lg" className="w-full">Request a new link</Button>
                            </Link>
                            <Link to="/login" className="block text-sm text-primary hover:text-primary-hover">
                                Back to sign in
                            </Link>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
