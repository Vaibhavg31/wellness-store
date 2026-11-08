import { useEffect, useState } from 'react';
import { AlertCircle, Clock, CreditCard, Truck, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { payForOrder } from '@/utils/razorpay';
import { getAnalyticsIds } from '@/utils/analytics';
import { paymentDeadline, shortOrderId } from '@/constants/orders';

function useCountdown(deadline) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const left = Math.max(0, deadline.getTime() - now);
    const mins = Math.floor(left / 60000);
    const secs = Math.floor((left % 60000) / 1000);
    return { left, text: `${mins}:${String(secs).padStart(2, '0')}` };
}

/**
 * An online order that is placed but not paid yet (a payment failed, or the window was closed). Like the big shops do it: the
 * order and its items are held for a short while, and the customer can try again, pay on delivery instead, or cancel.
 *
 * variant 'checkout' replaces the checkout form right after a failed payment; 'order' sits on the order page.
 * onPaid(order) / onChanged(order) / onCancelled(order) report what happened; `message` is the reason the last try failed.
 */
export default function PaymentDue({ order, token, variant = 'order', codAllowed = false, message = '', prefill, onPaid, onChanged, onCancelled }) {
    const deadline = paymentDeadline(order);
    const { left, text } = useCountdown(deadline);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [note, setNote] = useState(message || order.paymentError || '');
    const [confirmCancel, setConfirmCancel] = useState(false);
    const expired = left <= 0;

    useEffect(() => { setNote(message || order.paymentError || ''); }, [message, order.paymentError]);

    // When the time runs out, ask the server where the order stands (it may have been paid at the last second).
    useEffect(() => {
        if (!expired) return undefined;
        const t = setTimeout(() => {
            api.post(`/api/orders/${encodeURIComponent(order.id)}/check-payment`, {}, token)
                .then((res) => (res.state === 'paid' ? onPaid?.(res.order) : onChanged?.(res.order)))
                .catch(() => {});
        }, 1500);
        return () => clearTimeout(t);
    }, [expired]); // eslint-disable-line react-hooks/exhaustive-deps

    const run = async (what, fn) => {
        if (busy) return;
        setBusy(what);
        setError('');
        try {
            await fn();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy('');
        }
    };

    const tryAgain = () => run('pay', async () => {
        const result = await payForOrder({ order, token, prefill });
        if (result.status === 'paid') return onPaid?.(result.order);
        if (result.status === 'refunded' || result.status === 'closed') {
            setError(result.message);
            return onChanged?.(result.order);
        }
        setNote(result.message || 'The payment was not completed.');
        onChanged?.(result.order);
    });

    const payOnDelivery = () => run('cod', async () => {
        const updated = await api.post(`/api/orders/${encodeURIComponent(order.id)}/pay-on-delivery`, { analytics: getAnalyticsIds() }, token);
        if (updated.payment === 'cod' || updated.paymentStatus === 'paid') return onPaid?.(updated);
        onChanged?.(updated);
    });

    const cancel = () => run('cancel', async () => {
        try {
            const updated = await api.post('/api/orders/cancel-pending', { orderId: order.id }, token);
            onCancelled?.(updated);
        } catch (err) {
            if (err?.code === 'ALREADY_PAID' && err.order) return onPaid?.(err.order);
            throw err;
        }
    });

    const time = deadline.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    const isCheckout = variant === 'checkout';

    return (
        <section className="rounded-lg border-2 border-primary/30 bg-surface p-5 sm:p-6" aria-labelledby={`pay-${order.id}`} role={isCheckout ? 'alert' : undefined}>
            <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary"><CreditCard size={20} aria-hidden="true" /></span>
                <div className="min-w-0">
                    <h2 id={`pay-${order.id}`} className="font-sans text-h4 text-ink">{expired ? 'The time to pay has run out' : isCheckout ? 'Payment not completed' : 'Complete your payment'}</h2>
                    <p className="mt-1 text-small text-muted">
                        Order <span className="font-mono text-ink">{shortOrderId(order.id)}</span> · <strong className="text-ink">{formatPrice(order.total)}</strong>
                    </p>
                </div>
            </div>

            {note && !expired && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger-tint px-3 py-2 text-small text-danger">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {note}
                </p>
            )}

            {expired ? (
                <p className="mt-4 text-small text-muted">We are closing this order and releasing its items. If any money left your account, it is refunded automatically. You can place the order again from your bag.</p>
            ) : (
                <>
                    <p className="mt-4 flex items-center gap-2 text-small text-ink">
                        <Clock size={16} className="shrink-0 text-primary" aria-hidden="true" />
                        <span>Your order and its items are held until <strong>{time}</strong> (<span aria-live="off" className="tabular-nums">{text}</span> left).</span>
                    </p>
                    <p className="mt-2 text-caption text-muted">If money already left your account, please do not pay again: the order confirms itself within a few minutes, or the money is refunded automatically.</p>

                    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                        <Button onClick={tryAgain} loading={busy === 'pay'} disabled={Boolean(busy)} className="sm:flex-1">
                            {isCheckout ? 'Try again' : 'Pay now'} · {formatPrice(order.total)}
                        </Button>
                        {codAllowed && (
                            <Button variant="outline" onClick={payOnDelivery} loading={busy === 'cod'} disabled={Boolean(busy)} className="sm:flex-1">
                                <Truck size={16} aria-hidden="true" /> Pay on delivery instead
                            </Button>
                        )}
                    </div>
                    <div className="mt-3 text-center sm:text-left">
                        {confirmCancel ? (
                            <span className="inline-flex flex-wrap items-center gap-2 text-small">
                                <span className="text-muted">Cancel this order?</span>
                                <Button size="sm" variant="ghost" onClick={cancel} loading={busy === 'cancel'} disabled={Boolean(busy)} className="text-danger">Yes, cancel it</Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)} disabled={Boolean(busy)}>Keep it</Button>
                            </span>
                        ) : (
                            <button type="button" onClick={() => setConfirmCancel(true)} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-1.5 text-small text-muted hover:text-danger">
                                <XCircle size={14} aria-hidden="true" /> Cancel order
                            </button>
                        )}
                    </div>
                </>
            )}

            {error && <p className="mt-3 rounded-lg bg-danger-tint px-3 py-2 text-small text-danger" role="alert">{error}</p>}
        </section>
    );
}
