/**
 * Load Razorpay Checkout.js once, then open the payment modal.
 * Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */

let scriptPromise = null;

function loadRazorpayScript() {
    if (typeof window !== 'undefined' && window.Razorpay) {
        return Promise.resolve(window.Razorpay);
    }
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-razorpay]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.Razorpay));
            existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.dataset.razorpay = 'true';
        script.onload = () => resolve(window.Razorpay);
        script.onerror = () => {
            scriptPromise = null;
            reject(new Error('Failed to load Razorpay Checkout'));
        };
        document.body.appendChild(script);
    });

    return scriptPromise;
}

/**
 * @param {object} opts
 * @param {string} opts.key
 * @param {string} opts.orderId - Razorpay order id (order_…)
 * @param {number} opts.amount - paise
 * @param {string} [opts.name]
 * @param {string} [opts.description]
 * @param {string} [opts.email]
 * @param {string} [opts.phone]
 * @returns {Promise<{ razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }>}
 */
export async function openRazorpayCheckout(opts) {
    const Razorpay = await loadRazorpayScript();

    return new Promise((resolve, reject) => {
        let settled = false;

        const rzp = new Razorpay({
            key: opts.key,
            amount: opts.amount,
            currency: 'INR',
            name: opts.name || 'Chikit',
            description: opts.description || 'Order payment',
            order_id: opts.orderId,
            prefill: {
                name: opts.customerName || '',
                email: opts.email || '',
                contact: opts.phone || '',
            },
            theme: { color: '#5A0009' },
            handler(response) {
                settled = true;
                resolve(response);
            },
            modal: {
                ondismiss() {
                    if (!settled) {
                        reject(new Error('Payment cancelled'));
                    }
                },
            },
        });

        rzp.on('payment.failed', (response) => {
            settled = true;
            const msg = response?.error?.description || 'Payment failed';
            reject(new Error(msg));
        });

        rzp.open();
    });
}
