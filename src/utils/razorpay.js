/**
 * Razorpay Checkout in the browser: load checkout.js once, open the payment window, and the whole "pay for this order" round
 * trip (open → confirm with our server, or ask our server whether the money arrived anyway when the window is closed).
 * Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */
import { api } from '@/services/api';
import { getAnalyticsIds } from '@/utils/analytics';

let scriptPromise = null;

function loadRazorpayScript() {
    if (typeof window !== 'undefined' && window.Razorpay) {
        return Promise.resolve(window.Razorpay);
    }
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        const fail = () => {
            scriptPromise = null;
            reject(new Error('The payment window could not load. Check your internet connection and try again.'));
        };
        const existing = document.querySelector('script[data-razorpay]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.Razorpay));
            existing.addEventListener('error', fail);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.dataset.razorpay = 'true';
        script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : fail());
        script.onerror = fail;
        document.body.appendChild(script);
    });

    return scriptPromise;
}

/** Thrown when the customer closes the payment window without paying. `lastError` is Razorpay's reason for the last failed try. */
export class PaymentClosedError extends Error {
    constructor(lastError) {
        super(lastError?.description || 'Payment was not completed.');
        this.name = 'PaymentClosedError';
        this.lastError = lastError || null;
    }
}

/**
 * Opens the Razorpay window. Resolves with { razorpay_order_id, razorpay_payment_id, razorpay_signature } once a payment succeeds.
 * A failed try does not close the window (Razorpay lets the customer try another card or UPI app right there); `onFailure` is told
 * about it. Rejects with PaymentClosedError when the window is closed without a success.
 */
export async function openRazorpayCheckout(opts) {
    const Razorpay = await loadRazorpayScript();

    return new Promise((resolve, reject) => {
        let settled = false;
        let lastError = null;

        const rzp = new Razorpay({
            key: opts.key,
            amount: opts.amount,
            currency: 'INR',
            name: opts.name || 'Chikit',
            description: opts.description || 'Order payment',
            image: opts.image || undefined,
            order_id: opts.orderId,
            prefill: {
                name: opts.customerName || '',
                email: opts.email || '',
                contact: opts.phone || '',
            },
            notes: opts.notes || undefined,
            theme: { color: '#602460' },
            retry: { enabled: true },
            handler(response) {
                settled = true;
                resolve(response);
            },
            modal: {
                confirm_close: true,
                ondismiss() {
                    if (!settled) {
                        settled = true;
                        reject(new PaymentClosedError(lastError));
                    }
                },
            },
        });

        rzp.on('payment.failed', (response) => {
            lastError = response?.error || { description: 'Payment failed' };
            try { opts.onFailure?.(lastError); } catch { /* reporting only */ }
        });

        rzp.open();
    });
}

/**
 * Pays for one of the customer's orders that is waiting for its online payment.
 *  - `start`: the Razorpay details returned when the order was placed ({ keyId, orderId, amount }); omit to ask the server
 *    (POST /orders/:id/pay), which is how "Try again" and "Pay now" work.
 * Resolves with { status, order, message }:
 *  - 'paid'      the order is paid and confirmed
 *  - 'pending'   not paid (window closed or the try failed); the order is still waiting, `message` says why
 *  - 'refunded'  the money came in after the order had stopped waiting, so it is being refunded
 *  - 'closed'    the order can no longer be paid (cancelled / time ran out); `message` says so
 * Other errors (network, server) are thrown.
 */
export async function payForOrder({ order, token, start = null, prefill = {} }) {
    let details = start;
    let current = order;
    if (!details) {
        let res;
        try {
            res = await api.post(`/api/orders/${encodeURIComponent(order.id)}/pay`, {}, token);
        } catch (err) {
            if (err?.status === 400 || err?.status === 410) return { status: 'closed', order: current, message: err.message };
            throw err;
        }
        if (res.paid) return { status: 'paid', order: res.order };
        details = res.razorpay;
        current = res.order || current;
    }

    let payment;
    try {
        payment = await openRazorpayCheckout({
            key: details.keyId,
            orderId: details.orderId,
            amount: details.amount,
            customerName: prefill.name || current.shipping?.name || '',
            email: prefill.email || current.email || '',
            phone: prefill.phone || String(current.shipping?.phone || '').replace(/\D/g, '').slice(-10),
            description: `Order ${current.id}`,
            notes: { order_id: current.id },
            onFailure: (error) => {
                api.post(`/api/orders/${encodeURIComponent(current.id)}/payment-failed`, { error: { description: error?.description, reason: error?.reason, metadata: error?.metadata } }, token).catch(() => {});
            },
        });
    } catch (err) {
        if (!(err instanceof PaymentClosedError)) throw err;
        // A UPI app can finish after the window is closed: ask the server (which asks Razorpay) before calling it unpaid.
        try {
            const check = await api.post(`/api/orders/${encodeURIComponent(current.id)}/check-payment`, {}, token);
            if (check.state === 'paid') return { status: 'paid', order: check.order };
            if (check.state === 'refunded') return { status: 'refunded', order: check.order, message: 'Your payment came in after this order was cancelled, so it is being refunded.' };
            current = check.order || current;
        } catch { /* keep it pending */ }
        return { status: 'pending', order: current, message: err.lastError?.description || current.paymentError || '' };
    }

    try {
        const verified = await api.post('/api/orders/verify-payment', {
            orderId: current.id,
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpaySignature: payment.razorpay_signature,
            analytics: getAnalyticsIds(),
        }, token);
        return { status: 'paid', order: verified };
    } catch (err) {
        if (err?.code === 'PAYMENT_REFUNDED') return { status: 'refunded', order: err.order || current, message: err.message };
        // The payment went through at Razorpay but our confirmation call failed (network): the webhook / a check confirms it.
        try {
            const check = await api.post(`/api/orders/${encodeURIComponent(current.id)}/check-payment`, {}, token);
            if (check.state === 'paid') return { status: 'paid', order: check.order };
        } catch { /* fall through */ }
        return { status: 'pending', order: current, message: 'We are confirming your payment. If money left your account, this order confirms itself within a few minutes. Please do not pay again.' };
    }
}
