import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Cake, Check, Crown, Gift, Loader2, MailCheck, Percent, Smartphone, Sparkles } from 'lucide-react';
import Seo from '@/components/seo/Seo';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Logo from '@/components/ui/Logo';
import VerifyAnimation from '@/components/ui/VerifyAnimation';
import CheckoutInlineOtp, { normalizeCheckoutPhone } from '@/components/checkout/CheckoutInlineOtp';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { api } from '@/services/api';
import { loginUrl } from '@/utils/authRedirect';
import { lookupPincode, isValidPincode } from '@/utils/pincodeLookup';
import { cn } from '@/utils/formatPrice';

const GENDERS = [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const BENEFIT_ICONS = [Percent, Sparkles, Gift, BadgeCheck];

/** The card itself: plum, with the name and number once the member has them. */
function ClubCard({ name, cardNo, since, className }) {
    return (
        <div className={cn('relative aspect-[1.586/1] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-deep to-primary-night p-5 text-white shadow-[0_24px_48px_rgb(67_26_67/0.35)]', className)} role="img" aria-label={`Chikit Club Card${name ? ` for ${name}` : ''}`}>
            <span className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/8" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-accent/20" aria-hidden="true" />
            <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                    <span className="rounded-lg bg-accent px-2.5 py-1.5"><Logo size="sm" /></span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-caption font-bold uppercase tracking-widest text-ink"><Crown size={13} aria-hidden="true" /> Club</span>
                </div>
                <div>
                    <p className="font-mono text-lead tracking-[0.18em]">{cardNo || 'CHK-••••-••••••'}</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="truncate font-display text-h4">{name || 'Your name'}</p>
                        {since && <p className="shrink-0 text-caption text-white/80">Since {since}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Steps({ step }) {
    const labels = ['Mobile', 'Email', 'About you'];
    return (
        <ol className="mb-6 flex items-center gap-2" aria-label="Sign-up steps">
            {labels.map((label, i) => {
                const done = i < step;
                const current = i === step;
                return (
                    <li key={label} className="flex flex-1 items-center gap-2">
                        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold', done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-canvas-alt text-muted')} aria-current={current ? 'step' : undefined}>
                            {done ? <Check size={15} aria-hidden="true" /> : i + 1}
                        </span>
                        <span className={cn('truncate text-small font-medium', current ? 'text-ink' : 'text-muted')}>{label}</span>
                        {i < labels.length - 1 && <span className={cn('h-px flex-1', done ? 'bg-success' : 'bg-line')} aria-hidden="true" />}
                    </li>
                );
            })}
        </ol>
    );
}

/** Step 1: the mobile number, confirmed with an SMS code. */
function MobileStep({ user, token, status, onDone }) {
    const [phone, setPhone] = useState(normalizeCheckoutPhone(user?.phone));
    const [otpActive, setOtpActive] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const digits = normalizeCheckoutPhone(phone);
    const alreadyVerified = Boolean(user?.phoneVerified) && normalizeCheckoutPhone(user?.phone) === digits && digits.length === 10;

    const start = async () => {
        setError('');
        if (digits.length !== 10) return setError('Enter a valid 10-digit mobile number');
        if (alreadyVerified) return onDone(digits);
        if (status?.skip?.phone) {
            // Test servers have the SMS check switched off: save the number and carry on.
            setBusy(true);
            try {
                const res = await api.post('/api/auth/confirm-phone-otp', { phone: digits, otp: '' }, token);
                return onDone(res.phone);
            } catch (err) {
                return setError(err instanceof Error ? err.message : 'Could not save your number');
            } finally { setBusy(false); }
        }
        return setOtpActive(true);
    };

    return (
        <div>
            <div className="mb-4 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-tint text-primary"><Smartphone size={20} aria-hidden="true" /></span>
                <div>
                    <h3 className="font-sans text-h4">Your mobile number</h3>
                    <p className="text-small text-muted">We confirm it with a one-time SMS code.</p>
                </div>
            </div>
            <Input label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={phone} disabled={otpActive} onChange={(e) => { setPhone(e.target.value); setError(''); }} error={!otpActive ? error : ''} placeholder="10-digit number" />
            {!otpActive && <Button className="mt-4 w-full" size="lg" onClick={start} loading={busy}>{alreadyVerified ? 'Continue' : 'Send OTP'}</Button>}
            <CheckoutInlineOtp phone={digits} token={token} active={otpActive} onCancel={() => setOtpActive(false)} onVerified={(verified) => onDone(verified || digits)} />
        </div>
    );
}

/** Step 2: the email address, confirmed with a code sent to it. */
function EmailStep({ user, token, status, onDone }) {
    const [sent, setSent] = useState(false);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [debugCode, setDebugCode] = useState('');
    const [resendIn, setResendIn] = useState(0);
    const alreadyVerified = !status?.needs?.email;

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [resendIn]);

    const send = async () => {
        setError('');
        setBusy(true);
        try {
            const res = await api.post('/api/club/email-otp/send', { email: user.email }, token);
            if (res?.devMode && !res.debugCode) return onDone(); // the e-mail check is off on this server
            setSent(true);
            setResendIn(30);
            setDebugCode(res?.debugCode || '');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send the code');
        } finally { setBusy(false); }
        return undefined;
    };

    const verify = async (e) => {
        e?.preventDefault();
        setError('');
        setBusy(true);
        try {
            await api.post('/api/club/email-otp/verify', { code }, token);
            onDone();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'That code did not work');
        } finally { setBusy(false); }
    };

    return (
        <div>
            <div className="mb-4 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-tint text-primary"><MailCheck size={20} aria-hidden="true" /></span>
                <div>
                    <h3 className="font-sans text-h4">Confirm your email</h3>
                    <p className="text-small text-muted">{user.email}</p>
                </div>
            </div>
            {alreadyVerified && <><p className="mb-4 flex items-center gap-2 text-small font-medium text-success"><Check size={16} aria-hidden="true" /> This email is already confirmed.</p><Button className="w-full" size="lg" onClick={onDone}>Continue</Button></>}
            {!alreadyVerified && !sent && <Button className="w-full" size="lg" onClick={send} loading={busy}>Email me a code</Button>}
            {!alreadyVerified && sent && (
                <form onSubmit={verify} className="space-y-4">
                    <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000" className="text-center text-xl tracking-[0.35em]" autoFocus />
                    {debugCode && <p className="rounded-md bg-warning-tint px-3 py-2 text-caption text-warning">Test server: email is not set up here, so the code is <strong className="font-mono">{debugCode}</strong>.</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                        <Button type="submit" size="lg" disabled={code.length !== 6} loading={busy}>Confirm</Button>
                        <Button type="button" variant="outline" size="lg" disabled={busy || resendIn > 0} onClick={send}>{resendIn > 0 ? `Resend in ${resendIn}s` : 'Send again'}</Button>
                    </div>
                </form>
            )}
            {error && <p className="mt-3 rounded-md border border-danger/30 bg-danger-tint px-3 py-2 text-small text-danger" role="alert">{error}</p>}
        </div>
    );
}

/** Step 3: birthday, gender and the delivery address. */
function DetailsStep({ user, token, onJoined }) {
    const saved = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];
    const [form, setForm] = useState({
        name: user?.name ?? '',
        dob: user?.dob ?? '',
        gender: user?.gender ?? '',
        address: saved?.address ?? '',
        landmark: saved?.landmark ?? '',
        pincode: saved?.pincode ?? '',
        city: saved?.city ?? '',
        state: saved?.state ?? '',
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: '' })); };

    // Fill the town and state from the PIN code.
    useEffect(() => {
        const pin = form.pincode.replace(/\D/g, '');
        if (!isValidPincode(pin)) return undefined;
        let cancelled = false;
        lookupPincode(pin).then((hit) => { if (hit && !cancelled) setForm((f) => ({ ...f, city: f.city || hit.city, state: f.state || hit.state })); });
        return () => { cancelled = true; };
    }, [form.pincode]);

    const today = new Date().toISOString().slice(0, 10);

    const submit = async (e) => {
        e.preventDefault();
        const next = {};
        if (!form.name.trim()) next.name = 'Enter your name';
        if (!form.dob) next.dob = 'Enter your date of birth';
        else if (form.dob > today) next.dob = 'That date is in the future';
        if (!form.gender) next.gender = 'Choose one';
        if (!form.address.trim()) next.address = 'Enter your address';
        if (!isValidPincode(form.pincode)) next.pincode = 'Enter a 6-digit PIN code';
        if (!form.city.trim()) next.city = 'Enter your city';
        if (!form.state.trim()) next.state = 'Enter your state';
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setBusy(true);
        setFormError('');
        try {
            const joined = await api.post('/api/club/join', {
                name: form.name.trim(),
                dob: form.dob,
                gender: form.gender,
                address: { name: form.name.trim(), address: form.address.trim(), landmark: form.landmark.trim(), city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.replace(/\D/g, '') },
            }, token);
            onJoined(joined);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not complete your sign-up');
        } finally { setBusy(false); }
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-4">
            <div className="mb-2 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-tint text-primary"><Cake size={20} aria-hidden="true" /></span>
                <div>
                    <h3 className="font-sans text-h4">A little about you</h3>
                    <p className="text-small text-muted">For your card and a birthday surprise.</p>
                </div>
            </div>
            <Input label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Date of birth" type="date" max={today} autoComplete="bday" value={form.dob} onChange={set('dob')} error={errors.dob} />
                <Select label="Gender" value={form.gender} onChange={set('gender')} error={errors.gender}>
                    <option value="">Select…</option>
                    {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
            </div>
            <Input label="Address" autoComplete="street-address" value={form.address} onChange={set('address')} error={errors.address} placeholder="House / flat, street, area" />
            <Input label="Landmark (optional)" value={form.landmark} onChange={set('landmark')} />
            <div className="grid gap-4 sm:grid-cols-3">
                <Input label="PIN code" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.pincode} onChange={set('pincode')} error={errors.pincode} />
                <Input label="City" autoComplete="address-level2" value={form.city} onChange={set('city')} error={errors.city} />
                <Input label="State" autoComplete="address-level1" value={form.state} onChange={set('state')} error={errors.state} />
            </div>
            {formError && <p className="rounded-md border border-danger/30 bg-danger-tint px-3 py-2 text-small text-danger" role="alert">{formError}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>Get my Club Card</Button>
            <p className="text-center text-caption text-muted">By joining you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.</p>
        </form>
    );
}

/** /club: what the card gives, the sign-up for new members, and the card for existing ones. */
export default function ClubPage() {
    const { content } = useSiteContent();
    const { token, user, isAuthenticated, updateUser } = useAuth();
    const club = content.extras.club;
    const [status, setStatus] = useState(null);
    const [step, setStep] = useState(0);
    const [justJoined, setJustJoined] = useState(false);
    const member = Boolean(isAuthenticated && user?.club?.member);

    const load = useCallback(() => {
        if (!token) return;
        api.get('/api/club/status', token).then(setStatus).catch(() => setStatus(null));
    }, [token]);
    useEffect(load, [load]);

    // Start at the first step that is not already done.
    useEffect(() => {
        if (!status || member) return;
        setStep((s) => (s === 0 && !status.needs.phone && status.phone ? 1 : s));
    }, [status, member]);

    const onPhoneDone = (phone) => { updateUser({ phone, phoneVerified: true }); setStatus((s) => (s ? { ...s, phone, needs: { ...s.needs, phone: false } } : s)); setStep(1); };
    const onEmailDone = () => { updateUser({ emailVerified: true }); setStatus((s) => (s ? { ...s, needs: { ...s.needs, email: false } } : s)); setStep(2); };
    const onJoined = (profile) => { updateUser(profile); setJustJoined(true); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    const benefits = club.benefits ?? [];
    const since = user?.club?.joinedAt ? new Date(user.club.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';

    return (
        <>
            <Seo title={club.cardName} description={`${club.cardName}: ${club.tagline || 'member prices on most of the Chikit range.'}`} path="/club" />
            <section className="bg-brand-beige text-primary-deep">
                <div className="container-page grid items-center gap-8 py-10 lg:grid-cols-2 lg:gap-14 lg:py-16">
                    <div>
                        <p className="mb-3 text-caption font-semibold uppercase tracking-[0.18em] text-accent-ink">Free to join</p>
                        <h1 className="text-primary-deep">{club.cardName}</h1>
                        <p className="mt-4 max-w-lg text-lead text-primary-deep/80">{club.tagline}</p>
                        <ul className="mt-6 space-y-3">
                            {benefits.map((benefit, i) => {
                                const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
                                return (
                                    <li key={benefit} className="flex items-center gap-3 text-body text-primary-deep">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-accent shadow-xs"><Icon size={17} aria-hidden="true" /></span>
                                        {benefit}
                                    </li>
                                );
                            })}
                        </ul>
                        {club.discountPercent > 0 && <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-small font-semibold text-white shadow-md"><Crown size={16} className="text-accent" aria-hidden="true" /> Save {club.discountPercent}% on most products</p>}
                    </div>
                    {/* On a phone the sign-up form is what the visitor came for, so the big card only shows there once they are a member. */}
                    <div className={cn('flex justify-center lg:justify-end', !member && 'max-lg:hidden')}>
                        <ClubCard name={member ? user?.name : ''} cardNo={member ? user?.club?.cardNo : ''} since={member ? since : ''} />
                    </div>
                </div>
            </section>

            <section className="container-page py-10 lg:py-14">
                <div className="mx-auto max-w-xl">
                    {club.enabled === false && <p className="rounded-lg bg-warning-tint p-4 text-center text-warning">The club is not taking new members right now. Please check back soon.</p>}

                    {club.enabled !== false && member && (
                        <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-sm sm:p-8" role="status">
                            {justJoined && <VerifyAnimation size={72} className="mx-auto mb-3 text-success" />}
                            <h2 className="text-h3">{justJoined ? 'Welcome to the club!' : 'You are a Club member'}</h2>
                            <p className="mt-2 text-muted">Your member prices show on every product while you are signed in. Card number <strong className="font-mono text-ink">{user.club.cardNo}</strong>.</p>
                            <Link to="/shop" className="mt-6 inline-block"><Button size="lg">Shop with member prices</Button></Link>
                        </div>
                    )}

                    {club.enabled !== false && !member && !isAuthenticated && (
                        <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-sm sm:p-8">
                            <h2 className="text-h3">Join in three quick steps</h2>
                            <p className="mt-2 text-muted">Confirm your mobile and email, tell us your birthday and address, and your card is ready. Sign in first (or create an account); it only takes a minute.</p>
                            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                                <Link to={loginUrl('/club')}><Button size="lg" className="w-full">Sign in to join</Button></Link>
                            </div>
                        </div>
                    )}

                    {club.enabled !== false && !member && isAuthenticated && (
                        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-8">
                            {!status ? (
                                <p className="flex items-center justify-center gap-2 py-10 text-muted"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading…</p>
                            ) : (
                                <>
                                    <Steps step={step} />
                                    {step === 0 && <MobileStep user={user} token={token} status={status} onDone={onPhoneDone} />}
                                    {step === 1 && <EmailStep user={user} token={token} status={status} onDone={onEmailDone} />}
                                    {step === 2 && <DetailsStep user={user} token={token} onJoined={onJoined} />}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
