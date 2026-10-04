import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { Sparkles, ShoppingBag, Shield, Star, Leaf } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AmbientBlobs from '@/components/ui/AmbientBlobs';
import ConstellationField from '@/components/ui/ConstellationField';
import { useAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from '@/constants';
import { ApiError } from '@/services/api';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

function getSafeRedirect(path) {
    if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
        return '/';
    }
    return path;
}

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = getSafeRedirect(searchParams.get('redirect'));
    const isCheckoutLogin = redirectTo === '/checkout';
    const isAdminAccess = redirectTo === ADMIN_PATH;
    const googleBtnRef = useRef(null);
    const [googleWidth, setGoogleWidth] = useState(320);

    const { loginWithGoogle, loginWithEmail, registerWithEmail, isAuthenticated, isAdmin, adminLogin } = useAuth();
    const { welcomeUser } = useCustomerSession();
    const { content } = useSiteContent();

    const googleSignInEnabled = GOOGLE_ENABLED && content.services?.googleSignInEnabled !== false;

    const [mode, setMode] = useState('signin');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [showStudioLogin, setShowStudioLogin] = useState(false);

    useEffect(() => {
        const el = googleBtnRef.current;
        if (!el) return undefined;
        const update = () => setGoogleWidth(Math.min(el.offsetWidth, 400));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (isAdmin) navigate(ADMIN_PATH, { replace: true });
        else if (isAuthenticated) navigate(redirectTo, { replace: true });
    }, [isAdmin, isAuthenticated, navigate, redirectTo]);

    const goAfterLogin = (role, adminRedirect, userName) => {
        if (role === 'admin') {
            navigate(adminRedirect || ADMIN_PATH, { replace: true });
        } else {
            welcomeUser(userName);
            navigate(redirectTo, { replace: true });
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (mode === 'signup') {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (!name.trim()) {
                setError('Full name is required');
                return;
            }
        }

        setLoading(true);
        try {
            if (mode === 'signin') {
                const res = await loginWithEmail(email, password, rememberMe);
                goAfterLogin(res.role, res.redirect, res.user?.name);
                return;
            }

            const res = await registerWithEmail(email, password, name.trim(), confirmPassword);
            if (res.pendingVerification) {
                navigate(
                    `/verify-email-pending?email=${encodeURIComponent(res.email || email)}&redirect=${encodeURIComponent(redirectTo)}`,
                    { replace: true },
                );
                return;
            }

            goAfterLogin('customer', null, res.user?.name);
        } catch (err) {
            if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
                navigate(
                    `/verify-email-pending?email=${encodeURIComponent(err.email || email)}&redirect=${encodeURIComponent(redirectTo)}`,
                    { replace: true },
                );
                return;
            }
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await adminLogin(adminUser, adminPass);
            navigate(ADMIN_PATH, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid studio credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (response) => {
        if (!response.credential) {
            setError('Google did not return a credential. Please try again.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await loginWithGoogle(response.credential);
            goAfterLogin(res.role, res.redirect, res.user?.name);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const panelCopy = isAdminAccess
        ? {
            heading: <>Run the store<br />from one <span className="text-accent-hover italic">Studio</span></>,
            body: `Sign in with your admin Google account to manage products, orders, and storefront content for ${BRAND_NAME}.`,
        }
        : isCheckoutLogin
            ? {
                heading: <>You&apos;re one step<br />from <span className="text-accent-hover italic">checkout</span></>,
                body: 'Sign in to save your address book, track this order, and check out in seconds.',
            }
            : {
                heading: <>Wellness that fits<br />your <span className="text-accent-hover italic">everyday</span></>,
                body: BRAND_DESCRIPTION,
            };

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 py-14 sm:py-20 overflow-hidden bg-primary">
            <AmbientBlobs variant="dark" />
            <ConstellationField variant="light" density={0.9} className="opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary-deep/40 via-transparent to-primary-deep/60 pointer-events-none" aria-hidden="true" />

            <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">
                {/* Decorative brand panel — fills the desktop layout instead of
                    leaving a lone card adrift on a wide screen; text-only, no
                    stock photo, so it doesn't slide back into the old split-
                    screen jewelry-site look. */}
                <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="hidden lg:block text-canvas"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-canvas/10 border border-accent-hover/25 text-xs tracking-[0.2em] uppercase text-canvas/90 mb-8">
                        <Sparkles size={13} className="text-accent-hover" /> {BRAND_NAME}
                    </span>
                    <h2 className="font-display text-4xl xl:text-[3.25rem] leading-[1.15] font-semibold mb-6">
                        {panelCopy.heading}
                    </h2>
                    <p className="text-canvas/65 text-base xl:text-lg leading-relaxed max-w-md mb-10">
                        {panelCopy.body}
                    </p>
                    <div className="flex flex-wrap gap-4 xl:gap-6">
                        {[
                            { icon: Shield, label: 'FSSAI Certified' },
                            { icon: Star, label: '4.9★ Rated' },
                            { icon: Leaf, label: 'Lab Tested' },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-2.5 text-canvas/80">
                                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-canvas/10 border border-canvas/15 flex-shrink-0">
                                    <Icon size={16} className="text-accent-hover" strokeWidth={1.75} />
                                </span>
                                <span className="text-sm font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-[440px] mx-auto lg:mx-0 bg-canvas rounded-3xl shadow-lg border border-canvas/10 px-6 py-9 sm:px-10 sm:py-11"
            >
                <Logo size="md" showHover className="mx-auto mb-6 lg:hidden" />

                <div className="flex flex-col items-center gap-2 mb-8 lg:hidden">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-xs tracking-[0.2em] uppercase text-primary">
                        <Sparkles size={12} /> {BRAND_NAME}
                    </span>
                    {!isCheckoutLogin && !isAdminAccess && (
                        <p className="text-sm text-muted text-center max-w-[280px]">{BRAND_TAGLINE}</p>
                    )}
                </div>

                <div className="w-full">

                    <div className="space-y-6">
                        <div className="text-center lg:text-left">
                            {isCheckoutLogin && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs mb-4">
                                    <ShoppingBag size={14} />
                                    Checkout login
                                </div>
                            )}
                            <h1 className="font-display text-3xl sm:text-[2.25rem] text-ink mb-2">
                                {isCheckoutLogin ? 'Sign in to buy' : isAdminAccess ? 'Studio access' : mode === 'signin' ? 'Sign in' : 'Create account'}
                            </h1>
                            <p className="text-muted text-sm sm:text-base font-light">
                                {isAdminAccess
                                    ? `Sign in with your admin Google account to open ${BRAND_NAME} Studio`
                                    : mode === 'signup'
                                        ? 'Enter your details — we will email you a secure link to verify and sign in'
                                        : 'Use email and password, or continue with Google'}
                            </p>
                        </div>

                        {!isAdminAccess && (
                            <>
                                <div className="flex rounded-full bg-canvas border border-line/50 p-1">
                                    <button
                                        type="button"
                                        onClick={() => { setMode('signin'); setError(''); }}
                                        className={`flex-1 py-2.5 text-sm sm:text-base rounded-full transition-colors ${mode === 'signin' ? 'bg-primary text-canvas' : 'text-muted hover:text-ink'}`}
                                    >
                                        Sign in
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setMode('signup'); setError(''); }}
                                        className={`flex-1 py-2.5 text-sm sm:text-base rounded-full transition-colors ${mode === 'signup' ? 'bg-primary text-canvas' : 'text-muted hover:text-ink'}`}
                                    >
                                        Sign up
                                    </button>
                                </div>

                                <form onSubmit={handleEmailSubmit} className="space-y-4">
                                    {mode === 'signup' && (
                                        <Input
                                            label="Full name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            autoComplete="name"
                                        />
                                    )}
                                    <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                                    <Input
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                    />
                                    {mode === 'signup' && (
                                        <Input
                                            label="Confirm password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                        />
                                    )}
                                    {mode === 'signin' && (
                                        <div className="flex items-center justify-between text-sm">
                                            <label className="flex items-center gap-2 text-muted cursor-pointer">
                                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-line" />
                                                Remember me
                                            </label>
                                            <Link to="/forgot-password" className="text-primary hover:text-primary-hover">Forgot password?</Link>
                                        </div>
                                    )}
                                    {mode === 'signup' && (
                                        <p className="text-xs text-muted text-center -mt-2">
                                            We&apos;ll send a magic link to verify your email. Click it to complete sign-in.
                                        </p>
                                    )}
                                    <Button variant="turmeric" size="lg" className="w-full" type="submit" disabled={loading}>
                                        {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in with email' : 'Create account'}
                                    </Button>
                                </form>

                                {googleSignInEnabled && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-line/60" />
                                        <span className="text-xs text-muted uppercase tracking-wider">or</span>
                                        <div className="flex-1 h-px bg-line/60" />
                                    </div>
                                )}
                            </>
                        )}

                        {googleSignInEnabled ? (
                            <div ref={googleBtnRef} className="w-full flex justify-center lg:justify-start">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google sign-in was cancelled or blocked')}
                                    theme="outline"
                                    size="large"
                                    text="continue_with"
                                    shape="pill"
                                    width={googleWidth}
                                />
                            </div>
                        ) : GOOGLE_ENABLED ? (
                            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-sm text-muted text-center">
                                Google sign-in is turned off in store settings.
                            </div>
                        ) : !isAdminAccess ? (
                            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-sm text-muted text-center">
                                Add <code className="text-xs bg-canvas px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
                            </div>
                        ) : null}

                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center" role="alert">
                                {error}
                            </div>
                        )}

                        <p className="text-center text-sm text-muted">
                            By signing in you agree to our Terms &amp; Privacy Policy
                        </p>

                        <Link
                            to={isCheckoutLogin ? '/cart' : isAdminAccess ? '/' : '/shop'}
                            className="block text-center text-sm text-muted hover:text-primary transition-colors"
                        >
                            {isCheckoutLogin ? '← Back to cart' : isAdminAccess ? '← Back to store' : 'Continue shopping without signing in →'}
                        </Link>

                        {isAdminAccess && (
                            <div className="pt-4 border-t border-line/40">
                                <button
                                    type="button"
                                    onClick={() => setShowStudioLogin(!showStudioLogin)}
                                    className="text-xs text-muted hover:text-ink w-full text-center"
                                >
                                    {showStudioLogin ? 'Hide studio credentials' : 'Use studio username & password'}
                                </button>
                                {showStudioLogin && (
                                    <form onSubmit={handleAdminLogin} className="space-y-4 mt-4">
                                        <Input label="Username" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} required />
                                        <Input label="Password" type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} required />
                                        <Button variant="turmeric" size="lg" className="w-full" type="submit" disabled={loading}>
                                            {loading ? 'Signing in…' : 'Enter Studio'}
                                        </Button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex lg:hidden items-center justify-center gap-5 mt-8 pt-6 border-t border-line/40">
                    <span className="flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
                        <Shield size={13} className="text-primary" /> FSSAI
                    </span>
                    <span className="flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
                        <Star size={13} className="text-accent" /> 4.9 Rated
                    </span>
                    <span className="flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
                        <Leaf size={13} className="text-primary" /> Lab Tested
                    </span>
                </div>
            </motion.div>
            </div>
        </div>
    );
}
