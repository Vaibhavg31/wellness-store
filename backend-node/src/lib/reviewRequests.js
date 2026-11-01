import { getPool } from './db.js';
import * as emailService from '../services/emailService.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';

/**
 * "How was it?" emails: one per delivered order, sent `reviewRequestDays` after the order was marked delivered
 * (Website content → Product pages & reorder reminders; 0 turns it off). Runs every 30 minutes; does nothing until the
 * email account is connected. Only orders delivered in the last 30 days are considered, so switching this on never mails
 * old customers about old orders.
 */
const EVERY_MS = 30 * 60 * 1000;
const BATCH = 25;
const PLUM = '#602460';
let timer = null;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function emailHtml({ brand, name, items, siteUrl }) {
    const year = new Date().getFullYear();
    const list = items.map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f0e6dc;font-size:15px;color:#2c241c;">${esc(i.title)}</td>
<td style="padding:10px 0;border-bottom:1px solid #f0e6dc;text-align:right;"><a href="${esc(`${siteUrl}/product/${encodeURIComponent(i.productId)}#reviews`)}" style="display:inline-block;padding:8px 18px;background:${PLUM};color:#faf7f2;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;">Write a review</a></td></tr>`).join('');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#fee1c5;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;"><tr><td>
<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:${PLUM};">${esc(brand)}</p>
<p style="margin:0 0 20px;font-size:14px;color:#8b7355;">How are you finding your order?</p>
<p style="margin:0 0 12px;font-size:16px;color:#2c241c;">Hi ${esc(name || 'there')},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3f35;">Your order has arrived. When you have had a chance to try it, a short review helps other people choose, and helps us make it better.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list}</table>
<p style="margin:24px 0 0;font-size:12px;color:#b0a08d;">You are getting this one email because you ordered from ${esc(brand)}.<br>© ${year} ${esc(brand)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function runReviewRequests() {
    try {
        if (!(await emailService.isEmailEnabled())) return 0;
        const settings = await new SettingsRepository().get();
        const days = Number(settings.extras?.reviewRequestDays ?? 0);
        if (!days) return 0;
        const brand = settings.brandName || 'Chikit';
        const siteUrl = String(process.env.FRONTEND_URL || '').replace(/\/+$/, '');
        if (!siteUrl) return 0;

        const pool = getPool();
        const [orders] = await pool.query(
            `SELECT o.id, o.email, s.name, MAX(h.changed_at) AS delivered_at
               FROM orders o
               JOIN order_status_history h ON h.order_id = o.id AND h.status = 'delivered'
               LEFT JOIN order_shipping s ON s.order_id = o.id
              WHERE o.status = 'delivered' AND o.review_request_sent_at IS NULL AND o.email IS NOT NULL AND o.email <> ''
              GROUP BY o.id, o.email, s.name
             HAVING delivered_at <= (UTC_TIMESTAMP() - INTERVAL ? DAY) AND delivered_at >= (UTC_TIMESTAMP() - INTERVAL 30 DAY)
              ORDER BY delivered_at ASC
              LIMIT ${BATCH}`,
            [days],
        );
        let sent = 0;
        for (const order of orders) {
            const [items] = await pool.query('SELECT DISTINCT product_id AS productId, title FROM order_items WHERE order_id = ? AND product_id IS NOT NULL AND (is_custom = 0 OR is_custom IS NULL)', [order.id]);
            if (items.length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(order.email)) {
                const result = await emailService.sendTransactionalEmail(order.email, `How is your ${brand} order?`, emailHtml({ brand, name: order.name, items, siteUrl }), order.name || null, { tags: ['review-request', 'order'] });
                if (!result?.ok) continue; // not sent: try again next round
                sent++;
            }
            await pool.query('UPDATE orders SET review_request_sent_at = ? WHERE id = ?', [new Date().toISOString().slice(0, 19).replace('T', ' '), order.id]);
        }
        if (sent) console.log(`[review-requests] sent ${sent}`);
        return sent;
    } catch (err) {
        console.error('[review-requests]', err?.message || err);
        return 0;
    }
}

export function startReviewRequests() {
    if (timer) return;
    setTimeout(runReviewRequests, 2 * 60 * 1000).unref?.();
    timer = setInterval(runReviewRequests, EVERY_MS);
    timer.unref?.();
}
