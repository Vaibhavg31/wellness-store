import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import { useAuth } from '@/contexts/AuthContext';

function getSafeRedirect(path) {
    if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
        return '/';
    }
    return path;
}

export default function VerifyEmailPendingPage() {
    const [searchParams] = useSearchParams();
    const redirectTo = getSafeRedirect(searchParams.get('redirect'));
    const emailFromQuery = searchParams.get('email') || '';
    const { user, isAuthenticated } = useAuth();

    const displayEmail = user?.email || emailFromQuery;

    if (!displayEmail && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.emailVerified) {
        return <Navigate to={redirectTo} replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-cream">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Logo size="md" showHover className="mx-auto mb-8" />

                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-5">
                        <Mail size={28} className="text-forest" />
                    </div>
                    <h1 className="font-display text-3xl text-ink mb-2">Check your email</h1>
                    <p className="text-slate text-sm">
                        We sent a secure magic link to{' '}
                        <span className="font-medium text-ink">{displayEmail || 'your inbox'}</span>.
                        Click the link to verify your email and sign in.
                    </p>
                </div>

                <EmailVerificationBanner email={displayEmail} className="mb-6" />

                <Link to={redirectTo}>
                    <Button variant="turmeric" size="lg" className="w-full mb-3">
                        Continue browsing
                    </Button>
                </Link>
                <p className="text-center text-xs text-slate">
                    Didn&apos;t get it? Check spam, or use resend above.
                </p>
            </motion.div>
        </div>
    );
}
