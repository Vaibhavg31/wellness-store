import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
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

    if (!displayEmail && !isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.emailVerified) return <Navigate to={redirectTo} replace />;

    return (
        <AuthShell backTo={null}>
            <div className="mb-8 text-center">
                <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-primary-tint text-primary"><Mail size={28} aria-hidden="true" /></span>
                <h1 className="mb-2 text-h2">Check your email</h1>
                <p className="text-small text-muted">
                    We sent a secure magic link to <strong className="text-ink">{displayEmail || 'your inbox'}</strong>. Click the link to verify your email and sign in.
                </p>
            </div>

            <EmailVerificationBanner email={displayEmail} className="mb-6" />

            <Link to={redirectTo} className="block"><Button size="lg" className="mb-3 w-full">Continue browsing</Button></Link>
            <p className="text-center text-caption text-muted">Didn&apos;t get it? Check spam, or use resend above.</p>
        </AuthShell>
    );
}
