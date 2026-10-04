import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Check, Copy, Gift, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useDialog } from '@/hooks/useDialog';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

const STORAGE_KEY = 'chikit-offer';

/** The code this visitor already unlocked on this browser, or null. */
export function readUnlocked() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        return null;
    }
}

function saveUnlocked(result) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {
        /* storage blocked — they can simply unlock again */
    }
}

function CodeTicket({ result, onClose }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(result.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            /* clipboard unavailable — the code is still on screen */
        }
    };
    return (
        <div className="animate-fade-up text-center" role="status">
            <span className="mx-auto mb-3 grid size-12 animate-pop place-items-center rounded-full bg-success-tint text-success"><Check size={24} aria-hidden="true" /></span>
            <h3 className="text-h4">Your code is ready</h3>
            <button type="button" onClick={copy} className="mt-4 flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed border-accent bg-accent-tint px-4 py-3 text-left transition-colors hover:bg-accent-tint/70">
                <span className="font-mono text-lead font-semibold tracking-wider text-ink">{result.code}</span>
                <span className="inline-flex items-center gap-1.5 text-caption font-medium text-primary-deep">
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy'}
                </span>
            </button>
            <p className="mt-3 text-caption text-muted">
                {result.description}{result.minOrderAmount > 0 ? `${result.description ? ' · ' : ''}Valid on orders above ${formatPrice(result.minOrderAmount)}` : ''}
            </p>
            <Link to="/shop" onClick={onClose} className="mt-5 block"><Button className="w-full">Start shopping</Button></Link>
        </div>
    );
}

/**
 * The panel the sticky offer tab opens: what the offer is, how it works, then either an email field that unlocks
 * the code or (when no email is required) a single button. The code comes from the server, never the page source.
 * `preview` (admin) shows the same panel without contacting the server.
 */
export default function OfferPanel({ offer, onClose, onUnlocked, preview = false }) {
    const panelRef = useDialog(true, onClose);
    const [result, setResult] = useState(preview ? null : readUnlocked());
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            const unlocked = preview
                ? { code: 'YOUR-CODE', label: offer.tabLabel, description: 'Your coupon description appears here.', minOrderAmount: 0 }
                : await api.post('/api/offer/unlock', { email });
            if (!preview) saveUnlocked(unlocked);
            setResult(unlocked);
            onUnlocked?.(unlocked);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
            <div className="absolute inset-0 animate-fade-in bg-ink/60" onClick={onClose} aria-hidden="true" />
            <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="offer-title" tabIndex={-1} className="relative max-h-[92dvh] w-full max-w-md animate-fade-up overflow-y-auto rounded-t-2xl bg-surface shadow-lg focus:outline-none sm:rounded-2xl">
                <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-xs hover:bg-white">
                    <X size={16} />
                </button>

                <div className="bg-gradient-to-br from-primary to-primary-deep px-6 pb-6 pt-8 text-white">
                    <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-caption font-semibold tracking-wide"><Gift size={14} aria-hidden="true" /> {offer.tabLabel}</span>
                    <h2 id="offer-title" className="text-h3 text-white">{offer.title}</h2>
                    {offer.subtitle && <p className="mt-2 text-small text-white/85">{offer.subtitle}</p>}
                </div>

                <div className="p-6">
                    {result ? (
                        <CodeTicket result={result} onClose={onClose} />
                    ) : (
                        <>
                            {offer.steps.length > 0 && (
                                <ol className="mb-6 space-y-4">
                                    {offer.steps.map((step, i) => (
                                        <li key={step} className="relative flex items-start gap-3 text-small text-ink">
                                            {i < offer.steps.length - 1 && <span className="absolute left-[0.9rem] top-8 h-[calc(100%-0.25rem)] w-px bg-line" aria-hidden="true" />}
                                            <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-primary-tint text-caption font-semibold text-primary-deep">{i + 1}</span>
                                            <span className="pt-1">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                            <form onSubmit={submit} noValidate>
                                {offer.requireEmail && (
                                    <>
                                        <label htmlFor="offer-email" className="mb-1.5 block text-small font-medium text-ink">Email address</label>
                                        <input
                                            id="offer-email"
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            aria-invalid={Boolean(error)}
                                            className="mb-3 h-12 w-full rounded-full border border-line-strong bg-surface px-5 text-body text-ink placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </>
                                )}
                                <Button type="submit" size="lg" className="w-full" loading={busy}>{offer.buttonLabel}</Button>
                                <p className="mt-3 min-h-5 text-center text-caption text-danger" role="alert">{error}</p>
                                {offer.requireEmail && <p className="text-center text-caption text-muted">No spam. Unsubscribe anytime.</p>}
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
