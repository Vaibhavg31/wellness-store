import * as razorpay from '../services/razorpayService.js';
import { OrderRepository } from '../repositories/orderRepository.js';

/**
 * Everything that happens to an order paid online, after it is placed. It works the way the big Indian shops do:
 *
 *  - Placing an online order reserves the stock and holds the order for a short window (30 minutes) while the customer pays.
 *  - A failed or abandoned payment does NOT cancel the order straight away. The customer can try again, switch to Cash on
 *    Delivery, or cancel; the order page shows a "Pay now" button until the window ends.
 *  - Razorpay is asked directly before anything is cancelled (a UPI payment often completes after the payment window is closed),
 *    so money that did arrive is never ignored.
 *  - When the window ends unpaid, the order is cancelled, its stock and coupon are released and the customer is told.
 *  - Money that arrives for an order that is no longer waiting (cancelled, or switched to Cash on Delivery) is refunded
 *    automatically, as is a second payment for an order that was already paid.
 *  - Cancelling or returning a paid order refunds it through Razorpay.
 *
 * Every state change is a compare-and-set on the orders row (OrderRepository.updateIf), so the checkout, the Razorpay webhook,
 * the sweep and an admin acting at the same moment cannot confirm, cancel or refund an order twice.
 */

const SWEEP_EVERY_MS = 60 * 1000;
const GIVE_UP_CHECKING_AFTER_MS = 24 * 60 * 60 * 1000; // Razorpay unreachable for a day: cancel without asking it

export function paymentWindowMinutes() {
    const n = Number.parseInt(process.env.PAYMENT_WINDOW_MINUTES || '30', 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 5), 24 * 60) : 30;
}

export function paymentDeadline(order) {
    if (order?.paymentExpiresAt) return new Date(order.paymentExpiresAt);
    return new Date(new Date(order?.createdAt || Date.now()).getTime() + paymentWindowMinutes() * 60000);
}

/** An online order that is placed but not paid yet, so the customer can still pay, switch to cash, or cancel. */
export function isAwaitingPayment(order) {
    return order?.payment === 'razorpay' && order?.paymentStatus === 'pending' && order?.status === 'placed';
}

/** Razorpay's reason for a failed payment, short enough for the order row and kind enough to show the customer. */
export function describePaymentError(error) {
    const e = error && typeof error === 'object' ? error : {};
    const text = String(e.description || e.error_description || e.reason || e.error_reason || '').trim();
    if (!text || /^undefined$/i.test(text)) return 'The payment did not go through.';
    return text.slice(0, 250);
}

/** The payment that settles a Razorpay order, from its list of attempts: a captured one, else an authorised one. */
export function settledPayment(payments) {
    const list = Array.isArray(payments) ? payments : [];
    return list.find((p) => p?.status === 'captured') || list.find((p) => p?.status === 'authorized') || null;
}

const nowIso = () => new Date().toISOString();
const paise = (rupees) => Math.round(Number(rupees || 0) * 100);

/**
 * deps: { statusChange(order, status, note, by), restoreStock(order), releaseCoupon(order), sendEmail(order, event, prev),
 *         trackPurchase(order, analyticsIds, userId) }: the order routes' own helpers, so stock, coupons and emails behave
 * exactly as they do everywhere else.
 */
export function createPaymentFlow(deps) {
    const repo = new OrderRepository();
    const { statusChange, restoreStock, releaseCoupon, sendEmail, trackPurchase } = deps;
    let sweepTimer = null;

    const history = (order, entry) => [...(order.statusHistory ?? []), { at: nowIso(), by: 'system', ...entry }];

    /** Refunds a payment that is not (or no longer) wanted, and records it on the order. Never throws. */
    async function refundStrayPayment(order, paymentId, amountPaise, why) {
        let note;
        let changes = {};
        try {
            const refund = await razorpay.refundPayment(paymentId, amountPaise, { order_id: order.id, reason: why.slice(0, 200) });
            note = `${why} Refunded automatically (Razorpay refund ${refund.id}).`;
            if (paymentId === order.razorpayPaymentId) {
                changes = {
                    refundStatus: refund.status === 'processed' ? 'refunded' : 'pending', razorpayRefundId: String(refund.id || ''),
                    refundAmount: Number(refund.amount || amountPaise) / 100, refundError: null,
                    ...(refund.status === 'processed' ? { refundedAt: nowIso() } : {}),
                };
            }
        } catch (err) {
            note = `${why} The automatic refund failed (${err.message}); please refund payment ${paymentId} from the Razorpay dashboard.`;
            if (paymentId === order.razorpayPaymentId) changes = { refundStatus: 'failed', refundError: err.message.slice(0, 250) };
        }
        const stamp = `${nowIso().slice(0, 16).replace('T', ' ')} — ${note}`;
        const adminNotes = order.adminNotes ? `${order.adminNotes}\n${stamp}` : stamp;
        return repo.update(order.id, { ...changes, adminNotes, statusHistory: history(order, { status: order.status, note }), updatedAt: nowIso() });
    }

    /**
     * A payment for this order was captured (seen by the checkout, the webhook or a check with Razorpay). Confirms the order once,
     * or refunds the money when the order is no longer waiting for it. Returns the order as it now stands.
     */
    async function markPaid(orderOrId, { paymentId, signature = null, method = null, amountPaise = null, analytics = null, userId = null, via = 'checkout' }, depth = 0) {
        const order = typeof orderOrId === 'string' ? await repo.getById(orderOrId) : await repo.getById(orderOrId.id);
        if (!order || !paymentId) return order;
        const amount = amountPaise ?? order.razorpayAmount ?? paise(order.total);

        if (order.paymentStatus === 'paid') {
            if (order.razorpayPaymentId && order.razorpayPaymentId !== paymentId) {
                return refundStrayPayment(order, paymentId, amount, `A second payment (${paymentId}) arrived for an order that was already paid.`);
            }
            return order;
        }

        if (order.payment === 'razorpay' && order.paymentStatus === 'pending' && order.status === 'placed') {
            // Paid and confirmed in one write, so whoever reads the order next (the other racer, the shopper) sees it confirmed.
            const won = await repo.updateIf(order.id, { payment: 'razorpay', paymentStatus: 'pending', status: 'placed' }, { paymentStatus: 'paid', status: 'confirmed', razorpayPaymentId: paymentId, paidAt: nowIso() });
            if (!won) return depth < 2 ? markPaid(order.id, { paymentId, signature, method, amountPaise, analytics, userId, via }, depth + 1) : repo.getById(order.id);
            const note = via === 'webhook' ? 'Payment confirmed by Razorpay' : via === 'check' ? 'Payment confirmed (checked with Razorpay)' : 'Payment received';
            const updated = await repo.update(order.id, {
                ...statusChange(order, 'confirmed', note, 'system'),
                ...(signature ? { razorpaySignature: signature } : {}),
                ...(method ? { paymentMethod: String(method).slice(0, 30) } : {}),
                paymentError: null,
            });
            if (updated) {
                await trackPurchase(updated, analytics, userId || updated.userId);
                await sendEmail(updated, 'confirmed', 'placed');
            }
            return updated;
        }

        // The order stopped waiting before the money came in (it was cancelled, or switched to Cash on Delivery): give it back.
        if (order.status === 'cancelled' && order.payment === 'razorpay') {
            const won = await repo.updateIf(order.id, { status: 'cancelled', paymentStatus: ['pending', 'failed'] }, { paymentStatus: 'paid', razorpayPaymentId: paymentId, paidAt: nowIso(), ...(method ? { paymentMethod: String(method).slice(0, 30) } : {}) });
            if (!won) return depth < 2 ? markPaid(order.id, { paymentId, signature, method, amountPaise, analytics, userId, via }, depth + 1) : repo.getById(order.id);
            return refundStrayPayment({ ...order, paymentStatus: 'paid', razorpayPaymentId: paymentId }, paymentId, amount, 'The payment arrived after this order was cancelled.');
        }
        return refundStrayPayment(order, paymentId, amount, `An online payment (${paymentId}) arrived for an order that is not paid online.`);
    }

    /** Remembers why the latest try failed (shown to the customer and in the admin). The order keeps waiting. */
    async function recordFailure(order, error, paymentId = null) {
        if (!isAwaitingPayment(order)) return order;
        const message = describePaymentError(error);
        const note = `Payment attempt failed${paymentId ? ` (${paymentId})` : ''}: ${message}`;
        return repo.update(order.id, { paymentError: message, statusHistory: history(order, { status: 'payment_failed', note }), updatedAt: nowIso() });
    }

    /**
     * Asks Razorpay how this order's payment stands and acts on it. Returns { order, state } where state is
     * 'paid' (settled, possibly just now), 'pending' (no money yet) or 'unknown' (Razorpay could not be asked).
     */
    async function reconcile(order) {
        if (!order) return { order, state: 'unknown' };
        if (order.paymentStatus === 'paid') return { order, state: order.status === 'cancelled' ? 'refunded' : 'paid' };
        if (order.payment !== 'razorpay' || !order.razorpayOrderId || !razorpay.isRazorpayConfigured()) return { order, state: 'unknown' };
        let payments;
        try {
            payments = await razorpay.fetchOrderPayments(order.razorpayOrderId);
        } catch (err) {
            return { order, state: 'unknown', error: err.message };
        }
        let settled = settledPayment(payments);
        if (settled?.status === 'authorized') {
            try {
                settled = await razorpay.capturePayment(settled.id, Number(settled.amount) || order.razorpayAmount || paise(order.total));
            } catch (err) {
                // Already captured by Razorpay's own auto-capture: look again; otherwise try later.
                try { settled = settledPayment(await razorpay.fetchOrderPayments(order.razorpayOrderId)); } catch { settled = null; }
                if (settled?.status !== 'captured') return { order, state: 'unknown', error: err.message };
            }
        }
        if (settled) {
            const updated = await markPaid(order, { paymentId: String(settled.id), method: settled.method || null, amountPaise: Number(settled.amount) || null, via: 'check' });
            return { order: updated, state: updated?.paymentStatus === 'paid' && updated?.status !== 'cancelled' ? 'paid' : 'refunded' };
        }
        const failed = payments.find((p) => p?.status === 'failed');
        if (failed && isAwaitingPayment(order) && !order.paymentError) {
            return { order: await recordFailure(order, failed, failed.id), state: 'pending' };
        }
        return { order, state: 'pending' };
    }

    /**
     * Cancels an order that was never paid: stock and coupon go back. Razorpay is asked first, so an order whose payment did
     * complete is confirmed instead. Returns { order, cancelled, paid }.
     */
    async function cancelUnpaid(order, { by = 'customer', note = 'Payment not completed', reason = 'Payment not completed', email = 'cancelled', mustAsk = false } = {}) {
        const check = await reconcile(order);
        if (check.state === 'paid' || check.state === 'refunded') return { order: check.order, cancelled: false, paid: check.state === 'paid' };
        if (check.state === 'unknown' && mustAsk && razorpay.isRazorpayConfigured() && check.error) return { order, cancelled: false, paid: false, retryLater: true };
        const current = check.order || order;
        const now = nowIso();
        const won = await repo.updateIf(current.id, { payment: 'razorpay', paymentStatus: 'pending', status: 'placed' }, { paymentStatus: 'failed', status: 'cancelled', cancelledAt: now, updatedAt: now });
        if (!won) return { order: await repo.getById(current.id), cancelled: false, paid: false };
        await restoreStock(current);
        await releaseCoupon(current);
        const updated = await repo.update(current.id, { ...statusChange(current, 'cancelled', note, by), cancelReason: reason, cancelledBy: by, paymentStatus: 'failed' });
        if (updated && email) await sendEmail(updated, email, 'placed');
        return { order: updated, cancelled: true, paid: false };
    }

    /**
     * Gives a paid online order its money back through Razorpay (full amount). Safe to call twice: once a refund is under way
     * or done it is not sent again. Throws an Error with a readable message when the refund cannot be made.
     */
    async function refundOrder(order, { reason = 'Order refund', by = 'admin' } = {}) {
        if (order.payment !== 'razorpay' || order.paymentStatus !== 'paid' || !order.razorpayPaymentId) throw new Error('Only orders paid online can be refunded through Razorpay.');
        if (order.refundStatus === 'refunded') return order;
        if (order.razorpayRefundId && ['pending', 'processing'].includes(order.refundStatus)) return order;
        if (!razorpay.isRazorpayConfigured()) throw new Error('Razorpay is not connected, so the refund cannot be sent. Refund it from the Razorpay dashboard.');
        const won = await repo.updateIf(order.id, { refundStatus: [null, 'pending', 'failed'], razorpayRefundId: [null, ''] }, { refundStatus: 'processing', refundError: null });
        if (!won) return repo.getById(order.id);
        const amount = order.razorpayAmount || paise(order.total);
        try {
            const refund = await razorpay.refundPayment(order.razorpayPaymentId, amount, { order_id: order.id, reason: String(reason).slice(0, 200) });
            const done = refund.status === 'processed';
            const fresh = (await repo.getById(order.id)) || order;
            return repo.update(order.id, {
                refundStatus: done ? 'refunded' : 'pending', razorpayRefundId: String(refund.id || ''), refundAmount: Number(refund.amount || amount) / 100,
                ...(done ? { refundedAt: nowIso() } : {}),
                statusHistory: history(fresh, { status: 'refund_started', by, note: `${reason}. Refund of ₹${(Number(refund.amount || amount) / 100).toFixed(2)} sent to Razorpay (${refund.id}).` }),
                updatedAt: nowIso(),
            });
        } catch (err) {
            await repo.update(order.id, { refundStatus: 'failed', refundError: err.message.slice(0, 250), updatedAt: nowIso() });
            throw new Error(`The refund could not be sent: ${err.message}`);
        }
    }

    /** One Razorpay webhook event (signature already checked). Returns a short note for the response body. */
    async function handleWebhook(event, payload) {
        const payment = payload?.payload?.payment?.entity || {};
        const refund = payload?.payload?.refund?.entity || {};

        if (['payment.captured', 'order.paid', 'payment.authorized'].includes(event)) {
            const order = await repo.findByRazorpayOrderId(String(payment.order_id || payload?.payload?.order?.entity?.id || ''));
            if (!order) return 'order not found';
            if (event === 'payment.authorized' || payment.status === 'authorized') {
                const check = await reconcile(order); // captures it, then confirms (or refunds)
                return `checked: ${check.state}`;
            }
            await markPaid(order, { paymentId: String(payment.id || ''), method: payment.method || null, amountPaise: Number(payment.amount) || null, via: 'webhook' });
            return 'paid';
        }
        if (event === 'payment.failed') {
            const order = await repo.findByRazorpayOrderId(String(payment.order_id || ''));
            if (!order) return 'order not found';
            await recordFailure(order, payment, payment.id);
            return 'failure recorded';
        }
        if (['refund.processed', 'refund.failed', 'refund.created'].includes(event)) {
            const order = await repo.findByRazorpayPaymentId(String(refund.payment_id || payment.id || ''));
            if (!order) return 'order not found';
            if (event === 'refund.processed') {
                await repo.update(order.id, { refundStatus: 'refunded', refundedAt: nowIso(), razorpayRefundId: String(refund.id || order.razorpayRefundId || ''), refundAmount: Number(refund.amount || 0) / 100 || order.refundAmount, refundError: null, updatedAt: nowIso() });
            } else if (event === 'refund.failed') {
                await repo.update(order.id, { refundStatus: 'failed', refundError: 'Razorpay could not complete the refund. Please refund the customer another way.', updatedAt: nowIso() });
            } else if (!order.razorpayRefundId) {
                // A refund started from the Razorpay dashboard.
                await repo.update(order.id, { refundStatus: 'pending', razorpayRefundId: String(refund.id || ''), refundAmount: Number(refund.amount || 0) / 100, updatedAt: nowIso() });
            }
            return 'refund updated';
        }
        return 'ignored';
    }

    /** Cancels orders whose payment window has ended unpaid. Runs every minute; one bad order never stops the rest. */
    async function sweep() {
        let done = 0;
        try {
            for (const order of await repo.listExpiredAwaitingPayment(50)) {
                try {
                    const stale = Date.now() - new Date(order.createdAt).getTime() > GIVE_UP_CHECKING_AFTER_MS;
                    const result = await cancelUnpaid(order, {
                        by: 'system', reason: 'Payment not completed', email: 'payment_failed', mustAsk: !stale,
                        note: `No payment within ${paymentWindowMinutes()} minutes, so the order was cancelled and its items released.`,
                    });
                    if (result.cancelled) done++;
                } catch (err) {
                    console.error(`[payments] could not close unpaid order ${order.id}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[payments] sweep failed:', err.message);
        }
        return done;
    }

    function startSweep() {
        if (sweepTimer) return;
        sweepTimer = setInterval(sweep, SWEEP_EVERY_MS);
        sweepTimer.unref?.();
        setTimeout(sweep, 15000).unref?.();
    }

    return { markPaid, recordFailure, reconcile, cancelUnpaid, refundOrder, handleWebhook, sweep, startSweep };
}
