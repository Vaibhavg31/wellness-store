import { httpRequest } from '../lib/httpClient.js';
import { isEmailEnabled as isEmailServiceEnabled } from '../lib/servicesConfig.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';

/**
 * Brevo transactional email via REST API. Mirrors backend/lib/BrevoService.php.
 * Button/accent color updated from the old template's forest green (#0F5132)
 * to the Chikit brand plum (#602460) — the PHP version was never updated
 * when the rest of the site was rebranded.
 */
const API_URL = 'https://api.brevo.com/v3/smtp/email';
const BRAND_PLUM = '#602460';

export async function isBrevoEnabled() {
    if (!(await isEmailServiceEnabled())) return false;
    if (String(process.env.BREVO_ENABLED || 'true').toLowerCase().trim() === 'false') return false;
    return apiKey() !== '' && senderEmail() !== '';
}

const apiKey = () => String(process.env.BREVO_API_KEY || '').trim();
const senderEmail = () => String(process.env.BREVO_SENDER_EMAIL || '').trim();

async function senderName() {
    const name = String(process.env.BREVO_SENDER_NAME || '').trim();
    if (name) return name;
    try {
        const settings = await new SettingsRepository().get();
        return settings.brandName || 'Chikit';
    } catch {
        return 'Chikit';
    }
}

async function brandTagline() {
    try {
        const settings = await new SettingsRepository().get();
        return settings.brandTagline || 'Ayurveda and Wellness';
    } catch {
        return 'Ayurveda and Wellness';
    }
}

async function replyEmail() {
    const reply = String(process.env.BREVO_REPLY_EMAIL || '').trim();
    if (reply) return reply;
    try {
        const settings = await new SettingsRepository().get();
        return settings.contact?.email || senderEmail();
    } catch {
        return senderEmail();
    }
}

function frontendUrl() {
    return String(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
}

function adminEmails() {
    const raw = String(process.env.ADMIN_EMAILS || '').trim();
    if (!raw) return [];
    const emails = raw.split(',').map((e) => e.trim()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    return [...new Set(emails)];
}

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatInr(amount) {
    return `₹${Number(amount || 0).toFixed(2)}`;
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        }) + ' IST';
    } catch {
        return iso;
    }
}

function shortOrderId(id) {
    if (!id) return '';
    const parts = String(id).split('-');
    if (parts.length > 1) return `#${parts[parts.length - 1].slice(0, 8)}`;
    return `#${String(id).slice(-8)}`;
}

function paymentLabel(order) {
    const payment = order.payment || '';
    const paymentStatus = order.paymentStatus || '';
    const refundStatus = order.refundStatus || '';

    if (payment === 'razorpay') {
        if (refundStatus === 'refunded') return 'Refunded';
        if (paymentStatus === 'paid') return 'Paid Online';
        if (paymentStatus === 'failed') return 'Payment Failed';
        return 'Payment Pending';
    }
    if (refundStatus === 'refunded') return 'COD · Refunded';
    return 'Cash on Delivery';
}

function wrapEmail(title, bodyHtml, brand, tagline) {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(44,36,28,0.08);">
<tr><td style="padding:28px 32px 12px;text-align:center;border-bottom:1px solid #efe6d8;">
<p style="margin:0;font-size:22px;font-weight:600;color:#2c241c;letter-spacing:0.04em;">${esc(brand)}</p>
<p style="margin:6px 0 0;font-size:12px;color:#8b7355;letter-spacing:0.12em;text-transform:uppercase;">${esc(tagline)}</p>
</td></tr>
<tr><td style="padding:28px 32px 32px;">${bodyHtml}</td></tr>
<tr><td style="padding:20px 32px;background:#faf7f2;text-align:center;">
<p style="margin:0 0 6px;font-size:12px;color:#8b7355;">Questions? Reply to this email. We are happy to help.</p>
<p style="margin:0;font-size:11px;color:#b0a08d;">© ${year} ${esc(brand)}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderItemsTable(order, withHeading) {
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) return '';

    const heading = withHeading
        ? '<p style="margin:0 0 12px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Items</p>'
        : '';

    const rows = items.map((item) => {
        const title = esc(item.title || 'Product');
        const qty = Number(item.quantity || 1);
        const price = formatInr(item.price || 0);
        const lineTotal = formatInr((Number(item.price) || 0) * qty);
        const image = String(item.image || '').trim();
        const imageCell = image
            ? `<img src="${esc(image)}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:8px;background:#f3ece3;">`
            : '<div style="width:56px;height:56px;border-radius:8px;background:#f3ece3;"></div>';

        return `<tr>
<td style="padding:12px 0;border-bottom:1px solid #efe6d8;width:64px;vertical-align:top;">${imageCell}</td>
<td style="padding:12px 12px;border-bottom:1px solid #efe6d8;vertical-align:top;">
<p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#2c241c;">${title}</p>
<p style="margin:0;font-size:13px;color:#8b7355;">Qty ${qty} × ${price}</p>
</td>
<td style="padding:12px 0;border-bottom:1px solid #efe6d8;text-align:right;vertical-align:top;white-space:nowrap;">
<strong style="font-size:14px;color:#2c241c;">${lineTotal}</strong>
</td>
</tr>`;
    }).join('');

    return `${heading}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>`;
}

function renderSummary(order) {
    const subtotal = formatInr(order.subtotal || 0);
    const discount = Number(order.discountAmount || 0);
    const delivery = Number(order.deliveryFee || 0);
    const total = formatInr(order.total || 0);

    const discountRow = discount > 0
        ? `<tr><td style="padding:4px 0;color:#4a3f35;">Discount</td><td style="padding:4px 0;text-align:right;color:#1f7a4d;">-${formatInr(discount)}</td></tr>`
        : '';

    const couponCode = String(order.couponCode || '').trim();
    const couponNote = couponCode
        ? `<tr><td colspan="2" style="padding:0 0 8px;font-size:12px;color:#8b7355;">Coupon: ${esc(couponCode)}</td></tr>`
        : '';

    const deliveryLabel = delivery <= 0 ? 'Free' : formatInr(delivery);

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#faf7f2;border-radius:12px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 12px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Summary</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
${couponNote}
<tr><td style="padding:4px 0;color:#4a3f35;">Subtotal</td><td style="padding:4px 0;text-align:right;color:#2c241c;">${subtotal}</td></tr>
${discountRow}
<tr><td style="padding:4px 0;color:#4a3f35;">Delivery</td><td style="padding:4px 0;text-align:right;color:#2c241c;">${deliveryLabel}</td></tr>
<tr><td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#2c241c;border-top:1px solid #e8ddd0;">Total</td><td style="padding:12px 0 0;text-align:right;font-size:16px;font-weight:700;color:#2c241c;border-top:1px solid #e8ddd0;">${total}</td></tr>
</table>
</td></tr>
</table>`;
}

function renderShipping(order) {
    const shipping = order.shipping || {};
    if (Object.keys(shipping).length === 0) return '';

    const name = esc(shipping.name || '');
    const phone = esc(shipping.phone || '');
    const address = esc(shipping.address || '');
    const landmark = String(shipping.landmark || '').trim();
    const city = esc(shipping.city || '');
    const state = esc(shipping.state || '');
    const pincode = esc(shipping.pincode || '');
    const landmarkLine = landmark ? `<br>${esc(landmark)}` : '';

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#faf7f2;border-radius:12px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 12px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Delivery address</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#2c241c;">
<strong>${name}</strong><br>
${address}${landmarkLine}<br>
${city}, ${state} ${pincode}<br>
Phone: ${phone}
</p>
</td></tr>
</table>`;
}

async function orderBody(order, headline, intro, wrapIntro = true) {
    const shortId = shortOrderId(order.id);
    const orderUrl = esc(`${frontendUrl()}/orders/${encodeURIComponent(order.id || '')}`);
    const placedAt = formatDate(order.createdAt);
    const payment = esc(paymentLabel(order));
    const introHtml = wrapIntro
        ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3f35;">${esc(intro)}</p>`
        : intro;

    const brand = await senderName();
    const tagline = await brandTagline();

    const body = `<p style="margin:0 0 8px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Order ${shortId}</p>
<h2 style="margin:0 0 12px;font-size:24px;font-weight:600;color:#2c241c;">${esc(headline)}</h2>
${introHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr>
<td style="padding:12px 16px;background:#faf7f2;border-radius:10px 10px 0 0;border-bottom:1px solid #efe6d8;">
<span style="font-size:13px;color:#8b7355;">Placed on</span><br><strong style="font-size:14px;color:#2c241c;">${placedAt}</strong>
</td>
<td style="padding:12px 16px;background:#faf7f2;border-radius:10px 10px 0 0;border-bottom:1px solid #efe6d8;">
<span style="font-size:13px;color:#8b7355;">Payment</span><br><strong style="font-size:14px;color:#2c241c;">${payment}</strong>
</td>
</tr>
</table>
${renderItemsTable(order, true)}
${renderSummary(order)}
${renderShipping(order)}
<p style="margin:28px 0 0;text-align:center;">
<a href="${orderUrl}" style="display:inline-block;padding:14px 32px;background:#2c241c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">View order details</a>
</p>`;

    return wrapEmail(headline, body, brand, tagline);
}

async function orderPlacedMail(order) {
    const shortId = shortOrderId(order.id);
    const isRazorpayPending = order.payment === 'razorpay' && order.paymentStatus !== 'paid';
    const headline = isRazorpayPending ? 'Order received. Complete your payment' : 'Thank you for your order!';
    const intro = isRazorpayPending
        ? 'We have received your order. Please complete the online payment to confirm it.'
        : 'We have received your order and will confirm it shortly. You will receive another email once it is confirmed.';

    return { subject: `Order received ${shortId} | ${await senderName()}`, html: await orderBody(order, headline, intro), tags: ['order', 'order_placed'] };
}

async function orderConfirmedMail(order) {
    const shortId = shortOrderId(order.id);
    return {
        subject: `Order confirmed ${shortId} | ${await senderName()}`,
        html: await orderBody(order, 'Your order is confirmed!', 'Payment received and your order is confirmed. We are preparing it with care.'),
        tags: ['order', 'order_confirmed'],
    };
}

async function orderShippedMail(order) {
    const shortId = shortOrderId(order.id);
    const tracking = String(order.trackingNumber || '').trim();
    const carrier = String(order.carrier || '').trim();
    const eta = String(order.estimatedDelivery || '').trim();

    let extra = '<p style="margin:0 0 12px;font-size:15px;color:#4a3f35;">Your order is on its way!</p>';
    if (tracking || carrier || eta) {
        extra += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf7f2;border-radius:12px;"><tr><td style="padding:16px 20px;">';
        if (carrier) extra += `<p style="margin:0 0 6px;font-size:14px;color:#4a3f35;"><strong>Carrier:</strong> ${esc(carrier)}</p>`;
        if (tracking) extra += `<p style="margin:0 0 6px;font-size:14px;color:#4a3f35;"><strong>Tracking:</strong> ${esc(tracking)}</p>`;
        if (eta) extra += `<p style="margin:0;font-size:14px;color:#4a3f35;"><strong>Estimated delivery:</strong> ${esc(eta)}</p>`;
        extra += '</td></tr></table>';
    }

    return {
        subject: `Order shipped ${shortId} | ${await senderName()}`,
        html: await orderBody(order, 'Your order has shipped', extra, false),
        tags: ['order', 'order_shipped'],
    };
}

async function orderCancelledMail(order) {
    const shortId = shortOrderId(order.id);
    return {
        subject: `Order cancelled ${shortId} | ${await senderName()}`,
        html: await orderBody(order, 'Your order was cancelled', 'This order has been cancelled. If you were charged online, any refund will be processed as per our policy.'),
        tags: ['order', 'order_cancelled'],
    };
}

async function orderStatusMail(order, status, title, message) {
    const shortId = shortOrderId(order.id);
    return { subject: `Order update ${shortId}: ${title}`, html: await orderBody(order, title, message), tags: ['order', `order_${status}`] };
}

async function buildOrderMail(order, event) {
    switch (event) {
        case 'placed': return orderPlacedMail(order);
        case 'confirmed': return orderConfirmedMail(order);
        case 'out_for_delivery': return orderStatusMail(order, 'out_for_delivery', 'Out for Delivery', 'Your order is on its way!');
        case 'packed': return orderStatusMail(order, 'packed', 'Being Packed', 'Your order is being carefully packed.');
        case 'shipped': return orderShippedMail(order);
        case 'delivered': return orderStatusMail(order, 'delivered', 'Delivered', 'Your order has been delivered. We hope you love it!');
        case 'cancelled': return orderCancelledMail(order);
        default: return null;
    }
}

async function notifyAdminsNewOrder(order) {
    const admins = adminEmails();
    if (admins.length === 0) return;

    const shortId = shortOrderId(order.id);
    const total = formatInr(order.total || 0);
    const payment = paymentLabel(order);
    const customer = esc(order.shipping?.name || 'Customer');
    const itemsHtml = renderItemsTable(order, false);
    let adminPath = String(process.env.ADMIN_PATH || '/chikit-studio').trim();
    if (!adminPath) adminPath = '/chikit-studio';
    const adminUrl = esc(`${frontendUrl()}${adminPath}/orders`);
    const brand = esc(await senderName());
    const tagline = await brandTagline();

    const body = `<p style="margin:0 0 16px;font-size:15px;color:#4a3f35;">A new order has been placed on ${brand}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf7f2;border-radius:12px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 8px;font-size:13px;color:#8b7355;text-transform:uppercase;letter-spacing:0.08em;">Order</p>
<p style="margin:0;font-size:20px;font-weight:600;color:#2c241c;">${shortId}</p>
<p style="margin:8px 0 0;font-size:14px;color:#4a3f35;">${customer} · ${payment} · <strong>${total}</strong></p>
</td></tr>
</table>
${itemsHtml}
<p style="margin:20px 0 0;text-align:center;">
<a href="${adminUrl}" style="display:inline-block;padding:12px 28px;background:#2c241c;color:#fff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">Open admin panel</a>
</p>`;

    const html = wrapEmail('New order received', body, brand, tagline);

    for (const adminEmail of admins) {
        await sendTransactionalEmail(adminEmail, `New order ${shortId}: ${total}`, html, null, { tags: ['order', 'admin', 'new_order'] });
    }
}

export async function handleOrderEvent(order, event) {
    if (!(await isBrevoEnabled())) return;

    const customerEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(order.email || '') ? order.email : null;
    const customerName = String(order.shipping?.name || '').trim();

    const mail = await buildOrderMail(order, event);
    if (!mail) return;

    if (customerEmail) {
        await sendTransactionalEmail(customerEmail, mail.subject, mail.html, customerName || null, { tags: mail.tags });
    }

    const payment = order.payment || '';
    const paymentStatus = order.paymentStatus || '';

    if (event === 'placed' && payment !== 'razorpay') {
        await notifyAdminsNewOrder(order);
    }
    if (event === 'confirmed' && payment === 'razorpay' && paymentStatus === 'paid') {
        await notifyAdminsNewOrder(order);
    }
}

export async function sendTransactionalEmail(to, subject, htmlContent, toName = null, options = {}) {
    if (!(await isBrevoEnabled())) return { ok: false, error: 'Brevo is not configured' };

    const recipient = { email: to };
    if (toName && toName.trim()) recipient.name = toName.trim();

    const payload = {
        sender: { name: await senderName(), email: senderEmail() },
        to: [recipient],
        subject,
        htmlContent,
        replyTo: { email: await replyEmail(), name: await senderName() },
    };

    if (Array.isArray(options.tags) && options.tags.length > 0) {
        payload.tags = options.tags.filter(Boolean).map(String);
    }

    const headers = ['accept: application/json', 'content-type: application/json', `api-key: ${apiKey()}`];
    const result = await httpRequest('POST', API_URL, headers, JSON.stringify(payload), 30000);
    const httpCode = result.httpCode || 0;

    if (!result.ok) {
        console.error(`[Brevo] Network error: ${result.error || 'unknown'}`);
        return { ok: false, error: result.error || 'Network error', httpCode };
    }

    let data = null;
    try { data = JSON.parse(result.body || '{}'); } catch { /* leave null */ }

    if (httpCode < 200 || httpCode >= 300) {
        const message = data?.message || data?.code || 'Brevo API error';
        console.error(`[Brevo] HTTP ${httpCode}: ${message} | ${result.body}`);
        return { ok: false, error: message, httpCode };
    }

    return { ok: true, messageId: data?.messageId || '', httpCode };
}

export async function sendEmailVerification(to, name, verifyUrl) {
    const brand = await senderName();
    const year = new Date().getFullYear();
    const safeName = esc(name);
    const safeUrl = esc(verifyUrl);

    const html = `<p>Hi ${safeName},</p>
<p>Welcome to ${brand}! Please confirm your email address to place orders and receive updates.</p>
<p style="margin:28px 0;">
<a href="${safeUrl}" style="display:inline-block;padding:14px 28px;background:${BRAND_PLUM};color:#faf7f2;text-decoration:none;border-radius:999px;font-weight:600;">
Verify email address
</a>
</p>
<p style="font-size:13px;color:#8b7355;">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
<p style="font-size:12px;color:#b0a08d;">© ${year} ${brand}</p>`;

    return sendTransactionalEmail(to, `Verify your email — ${brand}`, html, name, { tags: ['email-verification'] });
}

export async function sendPasswordReset(to, name, resetUrl) {
    const brand = await senderName();
    const year = new Date().getFullYear();
    const safeName = esc(name);
    const safeUrl = esc(resetUrl);

    const body = `<p style="margin:0 0 12px;font-size:16px;color:#2c241c;">Hi ${safeName},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3f35;">We received a request to reset your password. Click the button below to choose a new one.</p>
<p style="margin:28px 0;text-align:center;">
<a href="${safeUrl}" style="display:inline-block;padding:14px 32px;background:${BRAND_PLUM};color:#faf7f2;text-decoration:none;border-radius:999px;font-weight:600;">Reset password</a>
</p>
<p style="margin:0 0 8px;font-size:13px;color:#8b7355;">This link expires in 1 hour.</p>
<p style="margin:0;font-size:12px;color:#b0a08d;">If you did not request this, ignore this email — your password stays the same.<br>© ${year} ${brand}</p>`;

    const html = wrapEmail('Reset your password', body, brand, await brandTagline());
    return sendTransactionalEmail(to, `Reset your password — ${brand}`, html, name, { tags: ['password-reset', 'auth'] });
}
