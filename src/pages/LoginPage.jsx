import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { Sparkles, ShoppingBag } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { BRAND_NAME, BRAND_TAGLINE } from '@/constants';
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

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-charcoal">
            <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
                <div className="absolute inset-0">
                    <img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&q=85" alt="" className="w-full h-full object-cover" aria-hidden="true" />
                    <div className="absolute inset-0 bg-gradient-to-br from-charcoal/95 via-wine-deep/80 to-charcoal/90" />
                </div>
                <div className="relative z-10">
                    <Logo size="md" showHover />
                </div>
                <div className="relative z-10 max-w-md">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ivory/10 border border-blush/30 mb-6">
                        <Sparkles size={12} className="text-blush" />
                        <span className="text-[10px] tracking-[0.25em] uppercase text-ivory/90">{BRAND_NAME}</span>
                    </div>
                    <h2 className="font-serif text-4xl text-ivory leading-tight mb-4">
                        {isCheckoutLogin ? (
                            <>Complete your <span className="italic text-blush">order</span></>
                        ) : (
                            <>Shop <span className="italic text-blush">wellness</span></>
                        )}
                    </h2>
                    <p className="text-ivory/60 font-light leading-relaxed">
                        {isCheckoutLogin
                            ? 'Sign in to checkout. We verify your phone when you place the order.'
                            : BRAND_TAGLINE}
                    </p>
                </div>
                <p className="relative z-10 text-[10px] tracking-wider text-ivory/30 uppercase">
                    FSSAI Certified · Lab Tested · Free Delivery ₹1999+
                </p>
            </div>

            <div className="flex items-center justify-center px-6 py-16 bg-cream">
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px]">
                    <Logo size="md" showHover className="mx-auto mb-10 lg:hidden" />

                    <div className="space-y-6">
                        <div className="text-center lg:text-left">
                            {isCheckoutLogin && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-wine/10 text-wine text-xs mb-4">
                                    <ShoppingBag size={14} />
                                    Checkout login
                                </div>
                            )}
                            <h1 className="font-serif text-3xl text-charcoal mb-2">
                                {isCheckoutLogin ? 'Sign in to buy' : isAdminAccess ? 'Studio access' : mode === 'signin' ? 'Sign in' : 'Create account'}
                            </h1>
                            <p className="text-soft-brown text-sm font-light">
                                {isAdminAccess
                                    ? `Sign in with your admin Google account to open ${BRAND_NAME} Studio`
                                    : mode === 'signup'
                                        ? 'Enter your details — we will email you a secure link to verify and sign in'
                                        : 'Use email and password, or continue with Google'}
                            </p>
                        </div>

                        {!isAdminAccess && (
                            <>
                                <div className="flex rounded-full bg-ivory border border-border/50 p-1">
                                    <button
                                        type="button"
                                        onClick={() => { setMode('signin'); setError(''); }}
                                        className={`flex-1 py-2 text-sm rounded-full transition-colors ${mode === 'signin' ? 'bg-wine text-ivory' : 'text-soft-brown hover:text-charcoal'}`}
                                    >
                                        Sign in
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setMode('signup'); setError(''); }}
                                        className={`flex-1 py-2 text-sm rounded-full transition-colors ${mode === 'signup' ? 'bg-wine text-ivory' : 'text-soft-brown hover:text-charcoal'}`}
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
                                            <label className="flex items-center gap-2 text-soft-brown cursor-pointer">
                                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-border" />
                                                Remember me
                                            </label>
                                            <Link to="/forgot-password" className="text-wine hover:text-wine-light">Forgot password?</Link>
                                        </div>
                                    )}
                                    {mode === 'signup' && (
                                        <p className="text-xs text-soft-brown text-center -mt-2">
                                            We&apos;ll send a magic link to verify your email. Click it to complete sign-in.
                                        </p>
                                    )}
                                    <Button variant="gold" size="lg" className="w-full" type="submit" disabled={loading}>
                                        {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in with email' : 'Create account'}
                                    </Button>
                                </form>

                                {googleSignInEnabled && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-border/60" />
                                        <span className="text-xs text-soft-brown uppercase tracking-wider">or</span>
                                        <div className="flex-1 h-px bg-border/60" />
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
                            <div className="p-4 rounded-xl bg-gold/10 border border-gold/20 text-sm text-soft-brown text-center">
                                Google sign-in is turned off in store settings.
                            </div>
                        ) : !isAdminAccess ? (
                            <div className="p-4 rounded-xl bg-gold/10 border border-gold/20 text-sm text-soft-brown text-center">
                                Add <code className="text-xs bg-ivory px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
                            </div>
                        ) : null}

                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center" role="alert">
                                {error}
                            </div>
                        )}

                        <p className="text-center text-xs text-soft-brown">
                            By signing in you agree to our Terms &amp; Privacy Policy
                        </p>

                        <Link
                            to={isCheckoutLogin ? '/cart' : isAdminAccess ? '/' : '/shop'}
                            className="block text-center text-sm text-soft-brown hover:text-wine transition-colors"
                        >
                            {isCheckoutLogin ? '← Back to cart' : isAdminAccess ? '← Back to store' : 'Continue shopping without signing in →'}
                        </Link>

                        {isAdminAccess && (
                            <div className="pt-4 border-t border-border/40">
                                <button
                                    type="button"
                                    onClick={() => setShowStudioLogin(!showStudioLogin)}
                                    className="text-xs text-soft-brown hover:text-charcoal w-full text-center"
                                >
                                    {showStudioLogin ? 'Hide studio credentials' : 'Use studio username & password'}
                                </button>
                                {showStudioLogin && (
                                    <form onSubmit={handleAdminLogin} className="space-y-4 mt-4">
                                        <Input label="Username" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} required />
                                        <Input label="Password" type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} required />
                                        <Button variant="gold" size="lg" className="w-full" type="submit" disabled={loading}>
                                            {loading ? 'Signing in…' : 'Enter Studio'}
                                        </Button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
