import { formatIndianAddress } from '@/utils/formatAddress';
import { formatOrderDate, paymentLabel, shortOrderId } from '@/constants/orders';
import { formatPrice } from '@/utils/formatPrice';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Contact lines worth printing: skips the placeholder number the store starts with until the real one is set. */
function storeContact(content) {
    const contact = content?.contact ?? {};
    const lines = [];
    if (contact.email) lines.push(contact.email);
    if (contact.whatsappDisplay && !/0{5}/.test(contact.whatsappDisplay.replace(/\D/g, ''))) lines.push(contact.whatsappDisplay);
    return lines;
}

/** The order as a printable receipt (HTML document). Shared by the customer's order page and the admin order view. */
export function invoiceHtml(order, content) {
    const origin = window.location.origin;
    const shipping = order.shipping ?? {};
    const store = content?.siteName || 'Chikit';
    const items = (order.items ?? []).map((item) => {
        // Order lines usually carry the pack in the title already ("… — 1 Month Supply"); say it once.
        const pack = item.variantLabel && !String(item.title).includes(item.variantLabel) ? item.variantLabel : null;
        const detail = [pack, item.offerTitle || item.bundleTitle].filter(Boolean).join(' · ');
        return `<tr><td>${esc(item.title)}${detail ? `<div class="sub">${esc(detail)}</div>` : ''}</td><td class="num">${item.quantity}</td><td class="num">${esc(formatPrice(item.price))}</td><td class="num">${esc(formatPrice(item.price * item.quantity))}</td></tr>`;
    }).join('');
    const rows = [
        ['Subtotal', formatPrice(order.subtotal)],
        ...(order.discountAmount > 0 ? [[`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `− ${formatPrice(order.discountAmount)}`]] : []),
        ['Delivery', order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Free'],
    ].map(([label, value]) => `<tr><td>${esc(label)}</td><td class="num">${esc(value)}</td></tr>`).join('');

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(shortOrderId(order.id))} · ${esc(store)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font: 14px/1.5 Poppins, system-ui, sans-serif; color: #241720; background: #fff; }
  .sheet { max-width: 760px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 20px; border-bottom: 2px solid #602460; }
  header img { height: 52px; width: auto; }
  h1 { margin: 0; font: 600 22px/1.2 Lora, Georgia, serif; color: #602460; text-align: right; }
  .meta { text-align: right; color: #62545E; font-size: 13px; }
  .cols { display: flex; gap: 32px; margin: 24px 0; }
  .cols > div { flex: 1; }
  .label { font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #7E5118; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  .items th { text-align: left; font-size: 12px; color: #62545E; border-bottom: 1px solid #E5DDD6; padding: 8px 6px; }
  .items td { border-bottom: 1px solid #EDE8E2; padding: 10px 6px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .sub { color: #62545E; font-size: 12px; }
  .totals { width: 300px; margin: 16px 0 0 auto; }
  .totals td { padding: 4px 6px; }
  .grand td { border-top: 2px solid #241720; font-weight: 700; font-size: 16px; padding-top: 8px; }
  footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #E5DDD6; color: #62545E; font-size: 12px; text-align: center; }
  .actions { text-align: center; margin: 0 0 24px; }
  .actions button { font: inherit; padding: 10px 22px; border-radius: 999px; border: 0; background: #602460; color: #fff; cursor: pointer; }
  @media print { body { padding: 0; } .actions { display: none; } }
</style></head><body><div class="sheet">
<p class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></p>
<header>
  <div><img src="${origin}/brand/chikit-logo-480.webp" alt="${esc(store)}"><div class="sub">${storeContact(content).map(esc).join(' · ')}</div></div>
  <div><h1>Invoice</h1><div class="meta">Order ${esc(shortOrderId(order.id))}<br>${esc(formatOrderDate(order.createdAt, { time: false }))}</div></div>
</header>
<div class="cols">
  <div><div class="label">Deliver to</div>${esc(shipping.name)}<br>${esc(formatIndianAddress(shipping, { multiline: false }))}${shipping.phone ? `<br>${esc(shipping.phone)}` : ''}${order.email ? `<br>${esc(order.email)}` : ''}</div>
  <div><div class="label">Payment</div>${esc(paymentLabel(order))}<div class="label" style="margin-top:12px">Status</div>${esc(String(order.status ?? '').replace(/_/g, ' '))}</div>
</div>
<table class="items"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead><tbody>${items}</tbody></table>
<table class="totals"><tbody>${rows}<tr class="grand"><td>Total</td><td class="num">${esc(formatPrice(order.total))}</td></tr></tbody></table>
<footer>Thank you for shopping with ${esc(store)}. Prices include applicable taxes. This is a computer-generated invoice and needs no signature.</footer>
</div></body></html>`;
}

/** Opens the invoice in a new tab, ready to print or save as PDF. Call from a click so the browser allows the new tab. */
export function openInvoice(order, content) {
    const win = window.open('', '_blank');
    if (!win) return false;
    win.document.open();
    win.document.write(invoiceHtml(order, content));
    win.document.close();
    return true;
}
