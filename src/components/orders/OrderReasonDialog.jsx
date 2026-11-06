import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { api } from '@/services/api';
import { cn } from '@/utils/formatPrice';
import { useSingleFlight } from '@/hooks/useSingleFlight';

let cachedReasons = null;

/** The cancel / return reason lists and the rules around them, from the server (one copy, shared with the admin). */
export function useOrderReasons() {
    const [data, setData] = useState(cachedReasons);
    useEffect(() => {
        if (cachedReasons) return undefined;
        let live = true;
        api.get('/api/orders/reasons').then((d) => { cachedReasons = d; if (live) setData(d); }).catch(() => {});
        return () => { live = false; };
    }, []);
    return data;
}

const COPY = {
    cancel: {
        title: 'Cancel this order',
        intro: 'Please tell us why. It helps us fix what went wrong, and it takes five seconds.',
        confirm: 'Cancel order',
        keep: 'Keep my order',
        noteHint: 'Tell us a little more',
        done: 'Your order is cancelled',
    },
    return: {
        title: 'Return this order',
        intro: 'We are sorry it was not right. Tell us what happened and we will look into it and get back to you.',
        confirm: 'Request return',
        keep: 'Not now',
        noteHint: 'What happened? (batch number, what you noticed)',
        done: 'Return requested. We will get back to you soon',
    },
};

/**
 * Asks why an order is being cancelled or returned: a short list of reasons plus "Other" with a note. On confirm it calls the server and
 * hands back the updated order. `mode` is "cancel" or "return".
 */
export default function OrderReasonDialog({ mode, order, token, isOpen, onClose, onDone, showToast }) {
    const reasons = useOrderReasons();
    const copy = COPY[mode];
    const list = reasons ? reasons[mode] : [];
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (isOpen) { setReason(''); setNote(''); setError(''); setBusy(false); } }, [isOpen, mode]);

    const needsNote = reason === 'other';
    const submit = useSingleFlight(async () => {
        if (!reason) { setError('Please choose a reason.'); return; }
        if (needsNote && note.trim().length < 3) { setError('Please tell us a little more.'); return; }
        setBusy(true);
        setError('');
        try {
            const updated = await api.post(`/api/orders/${order.id}/${mode}`, { reason, note: note.trim() }, token);
            showToast(copy.done, 'success');
            onDone(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    });

    return (
        <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title={copy.title} size="sm">
            <p className="text-small text-muted">{copy.intro}</p>
            <fieldset className="mt-4">
                <legend className="sr-only">Reason</legend>
                {list.length === 0 && <p className="py-6 text-center text-small text-muted"><Loader2 size={18} className="mx-auto animate-spin" aria-label="Loading" /></p>}
                <div className="grid gap-2">
                    {list.map((r) => (
                        <label key={r.id} className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-small transition-colors', reason === r.id ? 'border-primary bg-primary-soft text-ink' : 'border-line hover:border-primary/50')}>
                            <input type="radio" name="order-reason" value={r.id} checked={reason === r.id} onChange={() => { setReason(r.id); setError(''); }} className="size-4 accent-[var(--color-primary)]" />
                            {r.label}
                        </label>
                    ))}
                </div>
            </fieldset>
            {reason && (
                <div className="mt-4">
                    <label htmlFor="reason-note" className="mb-1.5 block text-small font-medium text-ink">{copy.noteHint}{needsNote ? '' : ' (optional)'}</label>
                    <textarea id="reason-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-small focus:border-primary focus:outline-none" />
                </div>
            )}
            {error && <p role="alert" className="mt-3 rounded-lg bg-danger-tint px-3 py-2 text-small text-danger">{error}</p>}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={onClose} disabled={busy}>{copy.keep}</Button>
                <Button onClick={submit} disabled={busy || !reason} className={mode === 'cancel' ? 'bg-danger hover:bg-danger' : undefined}>{busy ? 'Please wait…' : copy.confirm}</Button>
            </div>
        </Modal>
    );
}
