import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { ShoppingBag, Shield, Star, Leaf } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import AuthSlider from '@/components/auth/AuthSlider';
import AuthPhone from '@/components/auth/AuthPhone';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import AutoHeight from '@/components/ui/AutoHeight';
import SwipePanels from '@/components/ui/SwipePanels';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { BRAND_NAME, BRAND_DESCRIPTION } from '@/constants';
import { ApiError } from '@/services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_ENABLED = !!GOOGLE_CLIENT_ID;

function getSafeRedirect(path) {
    if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
        return '/';
    }
    return path;
}

function LoginScreen() {
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

    const wide = useMediaQuery('(min-width: 1024px)') && !isAdminAccess;

    useEffect(() => {
        const el = googleBtnRef.current;
        if (!el) return undefined;
        const update = () => setGoogleWidth(Math.min(el.offsetWidth, 400));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [wide, mode]);

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
        let leaving = false; // once we are heading to another page, keep the button busy until this screen is replaced
        try {
            if (mode === 'signin') {
                const res = await loginWithEmail(email, password, rememberMe);
                leaving = true;
                goAfterLogin(res.role, res.redirect, res.user?.name);
                return;
            }

            const res = await registerWithEmail(email, password, name.trim(), confirmPassword);
            if (res.pendingVerification) {
                leaving = true;
                navigate(
                    `/verify-email-pending?email=${encodeURIComponent(res.email || email)}&redirect=${encodeURIComponent(redirectTo)}`,
                    { replace: true },
                );
                return;
            }

            leaving = true;
            goAfterLogin('customer', null, res.user?.name);
        } catch (err) {
            if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
                leaving = true;
                navigate(
                    `/verify-email-pending?email=${encodeURIComponent(err.email || email)}&redirect=${encodeURIComponent(redirectTo)}`,
                    { replace: true },
                );
                return;
            }
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        } finally {
            if (!leaving) setLoading(false);
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        let leaving = false;
        try {
            await adminLogin(adminUser, adminPass);
            leaving = true;
            navigate(ADMIN_PATH, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid studio credentials');
        } finally {
            if (!leaving) setLoading(false);
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
            heading: <>Run the store<br />from one <span className="text-primary italic">Studio</span></>,
            body: `Sign in with your admin Google account to manage products, orders, and storefront content for ${BRAND_NAME}.`,
        }
        : isCheckoutLogin
            ? {
                heading: <>You&apos;re one step<br />from <span className="text-primary italic">checkout</span></>,
                body: 'Sign in to save your address book, track this order, and check out in seconds.',
            }
            : {
                heading: <>Ayurveda that fits<br />your <span className="text-primary italic">everyday</span></>,
                body: BRAND_DESCRIPTION,
            };

    const aside = (
        <>
            <h2 className="text-h2">{panelCopy.heading}</h2>
            <p className="mt-5 max-w-md text-lead text-muted">{panelCopy.body}</p>
            <ul className="mt-10 space-y-4">
                {[
                    { icon: Shield, label: 'FSSAI certified' },
                    { icon: Star, label: '4.9★ rated by customers' },
                    { icon: Leaf, label: 'Lab-tested purity' },
                ].map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-3 font-medium text-ink">
                        <span className="grid size-10 place-items-center rounded-full bg-surface text-primary"><Icon size={18} aria-hidden="true" /></span>
                        {label}
                    </li>
                ))}
            </ul>
        </>
    );

    /** One sign-in / sign-up form (heading, fields, submit). The fields are shared, so nothing typed is lost when switching. */
    const renderPanel = (panel) => (
        <div className="space-y-6">
            <div className="text-center">
                {isCheckoutLogin && (
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1 text-caption font-semibold text-primary-deep">
                        <ShoppingBag size={14} aria-hidden="true" /> Checkout login
                    </p>
                )}
                {mode === panel ? <h1 className="text-h2">{panel === 'signin' ? (isCheckoutLogin ? 'Sign in to buy' : 'Sign in') : 'Create account'}</h1> : <p className="text-h2 font-display">{panel === 'signin' ? 'Sign in' : 'Create account'}</p>}
                <p className="mt-2 text-small text-muted">
                    {panel === 'signup'
                        ? 'Enter your details — we will email you a secure link to verify and sign in'
                        : 'Use email and password, or continue with Google'}
                </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
                {panel === 'signup' && <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />}
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={panel === 'signin' ? 'current-password' : 'new-password'} />
                {panel === 'signup' && <Input label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />}
                {panel === 'signin' && (
                    <div className="flex items-center justify-between text-small">
                        <label className="flex cursor-pointer items-center gap-2 text-muted">
                            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="size-4 rounded border-line-strong accent-primary" />
                            Remember me
                        </label>
                        <Link to="/forgot-password" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">Forgot password?</Link>
                    </div>
                )}
                {panel === 'signup' && <p className="text-center text-caption text-muted">We&apos;ll send a magic link to verify your email. Click it to complete sign-in.</p>}
                <Button size="lg" className="w-full" type="submit" loading={loading}>{panel === 'signin' ? 'Sign in with email' : 'Create account'}</Button>
            </form>
        </div>
    );
    const googleBlock = googleSignInEnabled ? (
        <div ref={googleBtnRef} className="flex w-full justify-center">
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
    ) : null;
    const orDivider = googleSignInEnabled && (
        <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-caption uppercase tracking-wider text-muted">or</span>
            <span className="h-px flex-1 bg-line" />
        </div>
    );
    const errorBlock = <AutoHeight>{error && <p className="rounded-lg bg-danger-tint p-3 text-center text-small text-danger" role="alert">{error}</p>}</AutoHeight>;
    const terms = (
        <p className="text-center text-caption text-muted">
            By signing in you agree to our <Link to="/terms" className="underline">Terms</Link> &amp; <Link to="/privacy" className="underline">Privacy Policy</Link>
        </p>
    );
    const switchMode = (next) => { setMode(next); setError(''); };
    const backProps = {
        backTo: isCheckoutLogin ? '/cart' : isAdminAccess ? '/' : '/shop',
        backLabel: isCheckoutLogin ? '← Back to bag' : isAdminAccess ? '← Back to store' : 'Continue shopping without signing in →',
    };

    // Large screens: one wide card whose brand panel slides between the two forms.
    if (wide) {
        const column = (panel) => (
            <div className="space-y-6">
                {renderPanel(panel)}
                {orDivider}
                {mode === panel && googleBlock}
                {mode === panel && errorBlock}
                {terms}
            </div>
        );
        return (
            <AuthShell wide animateHeight={false} {...backProps}>
                <AuthSlider
                    mode={mode}
                    onMode={switchMode}
                    signin={column('signin')}
                    signup={column('signup')}
                    points={['FSSAI certified', '4.9★ rated by customers', 'Lab-tested purity']}
                    copy={{
                        signin: { title: 'New to Chikit?', body: 'Create an account to save your addresses, track orders and check out in seconds.', action: 'Create account' },
                        signup: { title: 'Welcome back', body: 'Already have an account? Sign in to pick up right where you left off.', action: 'Sign in' },
                    }}
                />
            </AuthShell>
        );
    }

    // Phones and tablets: a brand header with the message for each side, the switch on its edge, the form card below.
    if (!isAdminAccess) {
        const checkoutCopy = { eyebrow: 'Almost there', title: 'One step from checkout', body: 'Sign in or create an account to save your address book and check out in seconds.' };
        const copy = isCheckoutLogin
            ? { signin: checkoutCopy, signup: checkoutCopy }
            : {
                signin: { eyebrow: 'Welcome back', title: 'Good to see you again', body: 'Sign in to pick up right where you left off.' },
                signup: { eyebrow: 'New to Chikit?', title: 'Start your wellness ritual', body: 'Create an account and unlock:' },
            };
        return (
            <AuthPhone mode={mode} onMode={switchMode} copy={copy} {...backProps}>
                <div className="space-y-6">
                    <SwipePanels index={mode === 'signin' ? 0 : 1}>
                        {['signin', 'signup'].map((panel) => <div key={panel}>{renderPanel(panel)}</div>)}
                    </SwipePanels>
                    {orDivider}
                    {googleBlock}
                    {errorBlock}
                    {terms}
                </div>
            </AuthPhone>
        );
    }

    const tabClass = (active) => `relative z-10 flex-1 rounded-full py-2.5 text-small font-medium transition-colors duration-300 ${active ? 'text-white' : 'text-muted hover:text-ink'}`;
    const notice = 'rounded-lg bg-accent-tint p-4 text-center text-small text-ink';

    return (
        <AuthShell
            aside={aside}
            animateHeight={false}
            backTo={isCheckoutLogin ? '/cart' : isAdminAccess ? '/' : '/shop'}
            backLabel={isCheckoutLogin ? '← Back to bag' : isAdminAccess ? '← Back to store' : 'Continue shopping without signing in →'}
        >
            <div className="space-y-6">
                {isAdminAccess ? (
                    <div className="text-center">
                        <h1 className="text-h2">Studio access</h1>
                        <p className="mt-2 text-small text-muted">{`Sign in with your admin Google account to open ${BRAND_NAME} Studio`}</p>
                    </div>
                ) : (
                    <>
                        <div className="relative flex rounded-full bg-canvas-alt p-1" role="tablist" aria-label="Sign in or sign up">
                            <span
                                aria-hidden="true"
                                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-sm transition-transform duration-500 ease-[var(--ease-out-soft)]"
                                style={{ transform: mode === 'signup' ? 'translateX(100%)' : 'none' }}
                            />
                            <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); }} className={tabClass(mode === 'signin')}>Sign in</button>
                            <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); }} className={tabClass(mode === 'signup')}>Sign up</button>
                        </div>

                        {/* Two cards side by side; switching tabs swipes the track. Fields are shared, so nothing typed is lost. */}
                        <SwipePanels index={mode === 'signin' ? 0 : 1}>
                            {['signin', 'signup'].map((panel) => <div key={panel}>{renderPanel(panel)}</div>)}
                        </SwipePanels>

                        {googleSignInEnabled && (
                            <div className="flex items-center gap-3" aria-hidden="true">
                                <span className="h-px flex-1 bg-line" />
                                <span className="text-caption uppercase tracking-wider text-muted">or</span>
                                <span className="h-px flex-1 bg-line" />
                            </div>
                        )}
                    </>
                )}

                {googleSignInEnabled ? (
                    <div ref={googleBtnRef} className="flex w-full justify-center">
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
                    <p className={notice}>Google sign-in is turned off in store settings.</p>
                ) : !isAdminAccess && import.meta.env.DEV ? (
                    <p className={notice}>Add <code className="rounded bg-surface px-1 text-caption">VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.</p>
                ) : null}

                <AutoHeight>{error && <p className="rounded-lg bg-danger-tint p-3 text-center text-small text-danger" role="alert">{error}</p>}</AutoHeight>

                <p className="text-center text-caption text-muted">
                    By signing in you agree to our <Link to="/terms" className="underline">Terms</Link> &amp; <Link to="/privacy" className="underline">Privacy Policy</Link>
                </p>

                {isAdminAccess && (
                    <div className="border-t border-line pt-4">
                        <button type="button" onClick={() => setShowStudioLogin(!showStudioLogin)} aria-expanded={showStudioLogin} className="w-full text-center text-small text-muted hover:text-ink">
                            {showStudioLogin ? 'Hide studio credentials' : 'Use studio username & password'}
                        </button>
                        {showStudioLogin && (
                            <form onSubmit={handleAdminLogin} className="mt-4 space-y-4">
                                <Input label="Username or email" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} required />
                                <Input label="Password" type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} required />
                                <Button size="lg" className="w-full" type="submit" loading={loading}>Enter Studio</Button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </AuthShell>
    );
}

/** Google's sign-in script is only loaded here, not on every storefront page. */
export default function LoginPage() {
    if (!GOOGLE_CLIENT_ID) return <LoginScreen />;
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <LoginScreen />
        </GoogleOAuthProvider>
    );
}
