import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Cake, Check, ChevronDown, Crown, Gift, Loader2, MailCheck, Percent, Smartphone, Sparkles } from 'lucide-react';
import Seo from '@/components/seo/Seo';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
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

const STEPS_INFO = [
    { icon: Smartphone, title: 'Join free', text: 'Confirm your mobile and email, add your birthday and address. It takes about a minute.' },
    { icon: BadgeCheck, title: 'Prices drop for you', text: 'Signed in, every Club product shows your member price instead of the regular one.' },
    { icon: Gift, title: 'Pay less at checkout', text: 'The member price is applied automatically in your bag. No codes to remember.' },
];

const FAQ = [
    { q: 'Is the Club really free?', a: 'Yes. Joining is free today, with no minimum purchase. Chikit may add points and rewards for members later; if so, you will be told first.' },
    { q: 'How do I get the member price?', a: 'Join, then stay signed in. Club prices appear on the product pages and in your bag by themselves.' },
    { q: 'Do offers and the Club price add together?', a: 'Pick & Mix boxes and Buy 1 Get 1 pairs keep their own offer price. The Club price applies to everything else, and coupons still work on top.' },
    { q: 'What do you do with my details?', a: 'We use them to make your card, send a birthday surprise and tell you about launches. They are never sold. See our privacy policy for the details.' },
];

/** The card itself: deep plum with a gold edge, the logo on its beige chip, and the name and number once the member has them. */
function ClubCard({ name, cardNo, since, className }) {
    return (
        <div className={cn('relative aspect-[1.586/1] w-full max-w-md overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-primary via-primary-deep to-primary-night p-6 text-white shadow-[0_28px_60px_rgb(36_10_38/0.45)] ring-1 ring-gold/60', className)} role="img" aria-label={`Chikit Club card${name ? ` for ${name}` : ''}`}>
            <span className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-white/10" aria-hidden="true" />
            <span className="pointer-events-none absolute -right-8 -top-12 size-72 rounded-full border border-white/10" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-gold/15 blur-2xl" aria-hidden="true" />
            <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                    <span className="rounded-xl bg-accent px-3 py-2"><img src="/brand/chikit-logo.webp" alt="Chikit" width="1000" height="305" className="h-7 w-auto" /></span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-caption font-extrabold uppercase tracking-[0.16em] text-primary-deep"><Crown size={13} aria-hidden="true" /> Club</span>
                </div>
                <div>
                    <p className="font-mono text-lead tracking-[0.2em] text-white/90">{cardNo || 'CHK-••••-••••••'}</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="truncate font-display text-h4">{name || 'Your name'}</p>
                        {since && <p className="shrink-0 text-caption text-white/70">Member since {since}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Steps({ step }) {
    const labels = ['Mobile', 'Email', 'About you'];
    return (
        <ol className="mb-7 flex items-center gap-2" aria-label="Sign-up steps">
            {labels.map((label, i) => {
                const done = i < step;
                const current = i === step;
                return (
                    <li key={label} className="flex flex-1 items-center gap-2">
                        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold', done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-accent-tint text-muted')} aria-current={current ? 'step' : undefined}>
                            {done ? <Check size={15} aria-hidden="true" /> : i + 1}
                        </span>
                        <span className={cn('truncate text-small font-semibold', current ? 'text-ink' : 'text-muted')}>{label}</span>
                        {i < labels.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-success' : 'bg-line')} aria-hidden="true" />}
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
                <span className="grid size-11 place-items-center rounded-full bg-accent text-primary"><Smartphone size={20} aria-hidden="true" /></span>
                <div>
                    <h3 className="font-sans text-h4 font-bold">Your mobile number</h3>
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
                <span className="grid size-11 place-items-center rounded-full bg-accent text-primary"><MailCheck size={20} aria-hidden="true" /></span>
                <div>
                    <h3 className="font-sans text-h4 font-bold">Confirm your email</h3>
                    <p className="text-small text-muted">{user.email}</p>
                </div>
            </div>
            {alreadyVerified && <><p className="mb-4 flex items-center gap-2 text-small font-semibold text-success"><Check size={16} aria-hidden="true" /> This email is already confirmed.</p><Button className="w-full" size="lg" onClick={onDone}>Continue</Button></>}
            {!alreadyVerified && !sent && <Button className="w-full" size="lg" onClick={send} loading={busy}>Email me a code</Button>}
            {!alreadyVerified && sent && (
                <form onSubmit={verify} className="space-y-4">
                    <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000" className="text-center text-xl tracking-[0.35em]" autoFocus />
                    {debugCode && <p className="rounded-xl bg-warning-tint px-3 py-2 text-caption text-warning">Test server: email is not set up here, so the code is <strong className="font-mono">{debugCode}</strong>.</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                        <Button type="submit" size="lg" disabled={code.length !== 6} loading={busy}>Confirm</Button>
                        <Button type="button" variant="outline" size="lg" disabled={busy || resendIn > 0} onClick={send}>{resendIn > 0 ? `Resend in ${resendIn}s` : 'Send again'}</Button>
                    </div>
                </form>
            )}
            {error && <p className="mt-3 rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-small text-danger" role="alert">{error}</p>}
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
                <span className="grid size-11 place-items-center rounded-full bg-accent text-primary"><Cake size={20} aria-hidden="true" /></span>
                <div>
                    <h3 className="font-sans text-h4 font-bold">A little about you</h3>
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
            {formError && <p className="rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-small text-danger" role="alert">{formError}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>Get my Club card</Button>
            <p className="text-center text-caption text-muted">By joining you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.</p>
        </form>
    );
}

function Faq() {
    const [open, setOpen] = useState(0);
    return (
        <div className="divide-y divide-line rounded-[1.5rem] bg-surface ring-1 ring-line">
            {FAQ.map((item, i) => (
                <div key={item.q}>
                    <h3 className="font-sans"><button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left text-body font-bold text-ink">{item.q}<ChevronDown size={20} className={cn('shrink-0 text-primary transition-transform', open === i && 'rotate-180')} aria-hidden="true" /></button></h3>
                    <p hidden={open !== i} className="px-5 pb-5 text-small text-muted">{item.a}</p>
                </div>
            ))}
        </div>
    );
}

/** /club: what the card gives, how it works, the sign-up for new members and the card itself for existing ones. */
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
    const percent = Number(club.discountPercent) || 0;
    const since = user?.club?.joinedAt ? new Date(user.club.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';

    return (
        <>
            <Seo title={club.cardName} description={`${club.cardName}: ${club.tagline || 'member prices on most of the Chikit range.'}`} path="/club" />
            <section className="relative isolate overflow-hidden bg-gradient-to-br from-primary-deep via-primary-deep to-primary-night text-white">
                <div className="pointer-events-none absolute -left-32 -top-24 size-[30rem] rounded-full bg-primary/50 blur-3xl" aria-hidden="true" />
                <div className="container-page relative grid items-center gap-10 py-12 lg:grid-cols-12 lg:gap-12 lg:py-20">
                    <div className="lg:col-span-6">
                        <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 text-caption font-bold uppercase tracking-[0.14em] text-primary-deep"><Crown size={14} aria-hidden="true" /> {member ? 'Welcome back' : 'Free to join'}</p>
                        <h1 className="mt-5 text-white">{member ? 'You are in the Club.' : percent > 0 ? `Pay ${percent}% less, every order.` : 'Pay less, every order.'}</h1>
                        <p className="mt-4 max-w-lg text-lead text-white/75">{member ? 'Your member prices show on every Club product while you are signed in.' : club.tagline}</p>
                        {!member && (
                            <ul className="mt-6 space-y-3">
                                {benefits.map((benefit, i) => {
                                    const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
                                    return <li key={benefit} className="flex items-center gap-3 text-body text-white/90"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-gold-soft"><Icon size={17} aria-hidden="true" /></span>{benefit}</li>;
                                })}
                            </ul>
                        )}
                        {!member && club.enabled !== false && <a href="#join" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-body font-bold text-primary-deep shadow-md transition-colors hover:bg-accent-hover">Join the Club free <ArrowRight size={18} aria-hidden="true" /></a>}
                        {member && <Link to="/shop" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-body font-bold text-primary-deep shadow-md hover:bg-accent-hover">Shop with member prices <ArrowRight size={18} aria-hidden="true" /></Link>}
                    </div>
                    <div className="flex justify-center lg:col-span-6 lg:justify-end">
                        <ClubCard name={member ? user?.name : ''} cardNo={member ? user?.club?.cardNo : ''} since={member ? since : ''} />
                    </div>
                </div>
            </section>

            <section className="bg-canvas py-12 lg:py-16" aria-labelledby="club-how">
                <div className="container-page">
                    <h2 id="club-how" className="text-h3">How it works</h2>
                    <ol className="mt-8 grid gap-5 md:grid-cols-3">
                        {STEPS_INFO.map(({ icon: Icon, title, text }, i) => (
                            <li key={title} className="rounded-[1.5rem] bg-accent-tint p-6 ring-1 ring-line">
                                <span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-primary text-accent"><Icon size={20} aria-hidden="true" /></span><span className="text-caption font-bold uppercase tracking-[0.14em] text-accent-ink">Step {i + 1}</span></span>
                                <h3 className="mt-4 font-sans text-h4 font-bold">{title}</h3>
                                <p className="mt-2 text-small text-muted">{text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section id="join" className="scroll-mt-28 bg-accent py-12 lg:py-16">
                <div className="container-page">
                    <div className="mx-auto max-w-xl">
                        {club.enabled === false && <p className="rounded-2xl bg-warning-tint p-4 text-center font-semibold text-warning">The club is not taking new members right now. Please check back soon.</p>}

                        {club.enabled !== false && member && (
                            <div className="rounded-[1.75rem] bg-surface p-7 text-center shadow-md sm:p-9" role="status">
                                {justJoined && <VerifyAnimation size={72} className="mx-auto mb-3 text-success" />}
                                <h2 className="text-h3">{justJoined ? 'Welcome to the club!' : 'You are a Club member'}</h2>
                                <p className="mt-2 text-muted">Your member prices show on every product while you are signed in. Card number <strong className="font-mono text-ink">{user.club.cardNo}</strong>.</p>
                                <Link to="/shop" className="mt-6 inline-block"><Button size="lg">Shop with member prices</Button></Link>
                            </div>
                        )}

                        {club.enabled !== false && !member && !isAuthenticated && (
                            <div className="rounded-[1.75rem] bg-surface p-7 text-center shadow-md sm:p-9">
                                <h2 className="text-h3">Join in three quick steps</h2>
                                <p className="mt-2 text-muted">Confirm your mobile and email, tell us your birthday and address, and your card is ready. Sign in first, or create an account: it takes a minute.</p>
                                <Link to={loginUrl('/club')} className="mt-6 inline-block"><Button size="lg">Sign in to join</Button></Link>
                            </div>
                        )}

                        {club.enabled !== false && !member && isAuthenticated && (
                            <div className="rounded-[1.75rem] bg-surface p-6 shadow-md sm:p-9">
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
                </div>
            </section>

            <section className="bg-canvas py-12 lg:py-16" aria-labelledby="club-faq">
                <div className="container-page"><div className="mx-auto max-w-2xl"><h2 id="club-faq" className="mb-6 text-h3">Good to know</h2><Faq /></div></div>
            </section>
        </>
    );
}
