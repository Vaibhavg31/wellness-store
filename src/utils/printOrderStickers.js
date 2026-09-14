import { formatIndianAddress } from '@/utils/formatAddress';
import { formatPrice } from '@/utils/formatPrice';
import { BRAND_NAME } from '@/constants';
import { formatOrderDate, shortOrderId } from '@/constants/orders';

const SENDER = {
    name: BRAND_NAME,
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395007',
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildItemsListMarkup(order) {
    const items = order.items || [];
    if (items.length === 0) {
        return '<li class="item-row"><span class="item-name">No items</span></li>';
    }

    return items.map((item) => {
        const qty = item.quantity || 1;
        const lineTotal = (item.price || 0) * qty;
        return `
            <li class="item-row">
                <span class="item-qty">${qty}×</span>
                <span class="item-name">${escapeHtml(item.title || 'Item')}</span>
                <span class="item-price">${escapeHtml(formatPrice(lineTotal))}</span>
            </li>
        `;
    }).join('');
}

function buildStickerMarkup(order) {
    const shipping = order.shipping || {};
    const address = formatIndianAddress(shipping, { multiline: true });
    const orderRef = shortOrderId(order.id);
    const pincode = shipping.pincode || '—';
    const itemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

    return `
        <article class="sticker" role="article" aria-label="Shipping label ${escapeHtml(orderRef)}">
            <header class="sticker-header">
                <p class="brand-name">${escapeHtml(SENDER.name)}</p>
                <p class="brand-sub">Shipping Label</p>
            </header>

            <section class="deliver-section">
                <p class="section-label">Deliver To</p>
                <p class="recipient-name">${escapeHtml(shipping.name || 'Customer')}</p>
                <p class="recipient-address">${escapeHtml(address || '—').replace(/\n/g, '<br/>')}</p>
                <div class="pin-row">
                    <span class="pin-label">PIN</span>
                    <span class="pin-value">${escapeHtml(pincode)}</span>
                </div>
                ${shipping.phone ? `<p class="recipient-phone">Mob: ${escapeHtml(shipping.phone)}</p>` : ''}
            </section>

            <section class="order-section">
                <div class="order-meta">
                    <div>
                        <p class="meta-label">Order ID</p>
                        <p class="meta-value mono">${escapeHtml(orderRef)}</p>
                    </div>
                    <div class="meta-right">
                        <p class="meta-label">Date</p>
                        <p class="meta-value">${escapeHtml(formatOrderDate(order.createdAt, { time: false }))}</p>
                    </div>
                </div>

                <div class="order-summary">
                    <p class="summary-line">
                        <span class="summary-label">Items</span>
                        <span class="summary-value">${itemCount}</span>
                    </p>
                    <p class="summary-line">
                        <span class="summary-label">Order Total</span>
                        <span class="summary-value strong">${escapeHtml(formatPrice(order.total))}</span>
                    </p>
                </div>

                <div class="items-block">
                    <p class="items-heading">Order Details</p>
                    <ul class="items-list">
                        ${buildItemsListMarkup(order)}
                    </ul>
                </div>
            </section>

            <footer class="sender-section">
                <p class="section-label">Ship From</p>
                <p class="sender-line">${escapeHtml(SENDER.name)}</p>
                <p class="sender-line">${escapeHtml(SENDER.city)}, ${escapeHtml(SENDER.state)} — ${escapeHtml(SENDER.pincode)}</p>
            </footer>
        </article>
    `;
}

function stickerStyles() {
    return `
        *, *::before, *::after { box-sizing: border-box; }

        @page {
            size: 3in 5in;
            margin: 0;
        }

        html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        body {
            width: 3in;
        }

        .sticker {
            width: 3in;
            height: 5in;
            padding: 0.12in;
            border: 1.5px solid #111;
            display: flex;
            flex-direction: column;
            gap: 0.06in;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            background: #fff;
        }

        .sticker:last-child {
            page-break-after: auto;
            break-after: auto;
        }

        .sticker-header {
            padding-bottom: 0.06in;
            border-bottom: 1.5px solid #111;
        }

        .brand-name {
            margin: 0;
            font-size: 10.5pt;
            font-weight: 800;
            letter-spacing: 0.02em;
            line-height: 1.1;
            text-transform: uppercase;
        }

        .brand-sub {
            margin: 0.02in 0 0;
            font-size: 6pt;
            color: #444;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .section-label {
            margin: 0 0 0.03in;
            font-size: 6pt;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #333;
        }

        .deliver-section {
            border: 1px dashed #666;
            padding: 0.07in;
            background: #fafafa;
        }

        .recipient-name {
            margin: 0;
            font-size: 11pt;
            font-weight: 800;
            line-height: 1.15;
            text-transform: uppercase;
        }

        .recipient-address {
            margin: 0.04in 0 0;
            font-size: 7.5pt;
            line-height: 1.3;
            color: #222;
        }

        .pin-row {
            display: flex;
            align-items: center;
            gap: 0.05in;
            margin-top: 0.05in;
            padding: 0.03in 0.05in;
            border: 1.5px solid #111;
            width: fit-content;
            max-width: 100%;
        }

        .pin-label {
            font-size: 6.5pt;
            font-weight: 800;
            letter-spacing: 0.08em;
        }

        .pin-value {
            font-size: 12pt;
            font-weight: 900;
            letter-spacing: 0.06em;
        }

        .recipient-phone {
            margin: 0.04in 0 0;
            font-size: 7.5pt;
            font-weight: 700;
        }

        .order-section {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            border-top: 1px solid #111;
            padding-top: 0.05in;
        }

        .order-meta {
            display: flex;
            justify-content: space-between;
            gap: 0.06in;
            margin-bottom: 0.04in;
        }

        .meta-label {
            margin: 0;
            font-size: 5.5pt;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #555;
        }

        .meta-value {
            margin: 0.015in 0 0;
            font-size: 7pt;
            font-weight: 700;
        }

        .meta-right {
            text-align: right;
        }

        .mono {
            font-family: "Courier New", Courier, monospace;
        }

        .order-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.04in;
            margin-bottom: 0.04in;
            padding: 0.04in;
            border: 1px solid #ccc;
            background: #f8f8f8;
        }

        .summary-line {
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 0.01in;
        }

        .summary-label {
            font-size: 5.5pt;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #555;
        }

        .summary-value {
            font-size: 8pt;
            font-weight: 700;
        }

        .summary-value.strong {
            font-size: 9pt;
        }

        .items-block {
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .items-heading {
            margin: 0 0 0.03in;
            font-size: 6pt;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #222;
        }

        .items-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .item-row {
            display: grid;
            grid-template-columns: 0.22in 1fr auto;
            gap: 0.03in;
            align-items: start;
            padding: 0.025in 0;
            border-bottom: 0.5px solid #ddd;
            font-size: 6.5pt;
            line-height: 1.2;
        }

        .item-row:last-child {
            border-bottom: 0;
        }

        .item-qty {
            font-weight: 800;
        }

        .item-name {
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .item-price {
            font-weight: 700;
            white-space: nowrap;
        }

        .sender-section {
            margin-top: auto;
            padding-top: 0.05in;
            border-top: 1px dashed #888;
        }

        .sender-line {
            margin: 0;
            font-size: 6pt;
            line-height: 1.25;
            color: #333;
        }

        @media screen {
            body {
                padding: 12px;
                width: auto;
                background: #ececec;
            }

            .sticker {
                margin: 0 auto 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
            }
        }
    `;
}

export function buildStickerPrintHtml(orders, { autoPrint = false } = {}) {
    const list = Array.isArray(orders) ? orders.filter(Boolean) : [];
    if (list.length === 0) return '';

    const stickers = list.map((order) => buildStickerMarkup(order)).join('\n');
    const autoPrintScript = autoPrint
        ? `<script>
        window.addEventListener('load', function () {
            setTimeout(function () {
                window.focus();
                window.print();
            }, 250);
        });
        window.addEventListener('afterprint', function () {
            window.close();
        });
    </script>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shipping Labels (${list.length})</title>
    <style>${stickerStyles()}</style>
</head>
<body>
    ${stickers}
    ${autoPrintScript}
</body>
</html>`;
}

const PRINT_FRAME_ID = 'wellness-shipping-label-print-frame';

function removePrintFrame() {
    const existing = document.getElementById(PRINT_FRAME_ID);
    if (existing?.parentNode) {
        existing.parentNode.removeChild(existing);
    }
}

/**
 * Print 3×5 in shipping stickers via a hidden iframe (no pop-up window).
 * @param {object[]} orders
 * @returns {boolean} whether print was triggered
 */
export function printOrderStickers(orders) {
    const list = Array.isArray(orders) ? orders.filter(Boolean) : [];
    if (list.length === 0) return false;

    removePrintFrame();

    const html = buildStickerPrintHtml(list);
    const iframe = document.createElement('iframe');
    iframe.id = PRINT_FRAME_ID;
    iframe.setAttribute('title', 'Shipping label print preview');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = [
        'position:fixed',
        'left:-10000px',
        'top:0',
        'width:3in',
        'height:5in',
        'border:0',
        'margin:0',
        'padding:0',
        'opacity:0',
        'pointer-events:none',
    ].join(';');

    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
        removePrintFrame();
        throw new Error('Could not prepare print view. Please try again.');
    }

    const cleanup = () => {
        removePrintFrame();
    };

    let printStarted = false;
    const startPrint = () => {
        if (printStarted) return;
        printStarted = true;

        window.requestAnimationFrame(() => {
            window.setTimeout(() => {
                try {
                    frameWindow.focus();
                    frameWindow.print();
                } catch {
                    cleanup();
                    throw new Error('Could not open print dialog. Please try again.');
                }

                frameWindow.addEventListener('afterprint', cleanup, { once: true });
                window.setTimeout(cleanup, 60_000);
            }, 200);
        });
    };

    iframe.addEventListener('load', startPrint, { once: true });

    iframe.srcdoc = html;

    return true;
}
