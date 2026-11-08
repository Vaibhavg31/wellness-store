# Chikit Partner API and Webhooks

This guide is for the developers at a partner business who connect their system to the Chikit shop. With it, you can:

- **Read the catalogue**: products, pack sizes, prices and stock.
- **Place orders**, and cancel them before they ship.
- **Follow your orders**, either by asking the API or by receiving a webhook the moment something changes.

API version: `2026-11-01`. Every response carries it in the `Chikit-Api-Version` header.

---

## 1. Getting access

The shop creates your access in **Admin → API & webhooks** and sends you:

| You get | What it is |
|---|---|
| **API key** | `ck_live_…` (`ck_test_…` on a test shop). It is shown once, so store it as a secret on your server. |
| **Base URL** | `https://chikit.co.in/api/v1` |
| **Webhook signing secret** | `whsec_…`, only if you asked for webhooks. You will also need to give the shop your webhook address. |

The shop also decides:

- **What your key may do**:
  - `products:read`: read the catalogue.
  - `orders:read`: read your own orders.
  - `orders:write`: place and cancel your own orders.
- **Which payment types you may send**: `prepaid`, `cod`, or both.
- **Optionally, which server IP addresses may call the API.**

**Keep the key on your server.** Never put it in a mobile app or web page: it is not built for browsers and has no CORS. If it leaks, ask the shop for a new one. The old one stops working immediately.

## 2. Making a request

Send the key as a bearer token on every request. The `X-API-Key: <key>` header also works.

```
Authorization: Bearer ck_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

**Limits:** 120 requests per minute per key. Above that you get `429` with `Retry-After: 60`.

**Request id:** every response has an `X-Request-Id` header. Quote it when you contact the shop about a problem.

### Errors

Errors are JSON, with a sentence for people and a code for programs:

```json
{ "error": "Only 3 of \"Biotin Gummies — 1 Month Supply\" are in stock.", "code": "out_of_stock", "requestId": "req_5d1c…" }
```

| HTTP status | Codes you may see | Meaning |
|---|---|---|
| 400 | `invalid_request`, `external_ref_required`, `variant_required`, `product_not_found`, `variant_not_found`, `unknown_sku`, `invalid_address`, `cod_unavailable` | Something in the request needs fixing. The message says what. |
| 401 | `missing_api_key`, `invalid_api_key` | No key, or a wrong or replaced key. |
| 403 | `api_key_disabled`, `insufficient_scope`, `ip_not_allowed`, `payment_not_allowed` | The key is not allowed to do this. |
| 404 | `not_found`, `order_not_found`, `product_not_found` | Not found, or not yours. |
| 409 | `out_of_stock`, `not_cancellable` | The shop's current state prevents this. |
| 429 | `rate_limited` | Slow down. |
| 500 | `server_error` | Our fault. Retrying is safe (see idempotency, below). |

## 3. Catalogue

### `GET /products` (needs `products:read`)

Returns every published product.

```json
{ "data": [ {
  "id": "ws-biotin-001",
  "title": "Biotin Hair, Skin & Nails Gummies",
  "category": "hair-skin",
  "description": "…",
  "url": "https://chikit.co.in/product/ws-biotin-001",
  "images": ["https://chikit.co.in/catalog/products/biotin-1.webp"],
  "price": 599, "originalPrice": 799, "currency": "INR",
  "stock": 240, "inStock": true, "codAvailable": true,
  "hasVariants": true,
  "variants": [
    { "id": "variant-1789374327265-572be6", "sku": "WS-BIO-1M", "label": "1 Month Supply", "netQuantity": "60 gummies",
      "price": 599, "originalPrice": 799, "stock": 122, "inStock": true, "isDefault": true, "image": null }
  ],
  "updatedAt": "2026-11-02T10:15:00.000Z"
} ] }
```

### `GET /products/{id}`

Returns one product in the same shape.

**Prices.** You always pay the shop's list price for the product or pack size, as shown here. The API ignores any price you send. Coupons, offers and Club prices are for the shop's own website and do not apply to API orders.

## 4. Orders

### `POST /orders/quote` (needs `orders:write`)

Takes the same body as placing an order and returns what it would cost. Nothing is reserved.

```json
{ "currency": "INR", "items": [ { "productId": "…", "variantId": "…", "title": "…", "quantity": 2, "unitPrice": 599, "lineTotal": 1198 } ],
  "subtotal": 1198, "deliveryFee": 49, "total": 1247, "payment": "prepaid" }
```

**Delivery fee.** The shop's own rule applies: a flat fee below the free-delivery amount, free above it.

### `POST /orders` (needs `orders:write`)

```json
{
  "externalRef": "PARTNER-10023",
  "payment": "prepaid",
  "customer": { "name": "Asha Rao", "email": "asha@example.com", "phone": "9876543210" },
  "shipping": {
    "name": "Asha Rao", "phone": "9876543210",
    "address": "12 MG Road, Flat 4B", "landmark": "Near City Mall",
    "city": "Pune", "state": "Maharashtra", "pincode": "411001"
  },
  "items": [
    { "sku": "WS-BIO-1M", "quantity": 2 },
    { "productId": "ws-aloevera-juice-001", "variantId": "variant-…", "quantity": 1 }
  ],
  "note": "Gift wrap please"
}
```

| Field | Required | Rules |
|---|---|---|
| `externalRef` | yes | Your own order number: up to 100 letters, numbers and `. _ : # / -`. Must be unique per partner. |
| `payment` | no (defaults to `prepaid`) | `prepaid`: you have already collected the money, so the order is marked paid. `cod`: the shop's courier collects cash on delivery. Must be allowed for your key, and the shop's cash-on-delivery switch must be on. |
| `customer.name` | yes, here or as `shipping.name` | |
| `customer.email` | no | If you give it, the shop emails the customer about the order like any other order. Leave it out if you send your own messages. |
| `shipping.phone` | yes | 10-digit Indian mobile number. `customer.phone` is used if this is empty. |
| `shipping.address`, `city`, `state`, `pincode` | yes | 6-digit PIN code. `landmark` is optional. |
| `items` | yes | 1–50 lines. |
| `items[].sku` or `items[].productId` | yes, one of them | A product sold in pack sizes needs `variantId` with `productId`, or simply the pack's `sku`. |
| `items[].quantity` | yes | A whole number from 1 to 100. |
| `note` | no | Up to 500 characters, for the shop's staff only. |

**Responses:**

- **`201 Created`**: the order. Stock is taken immediately.
- **`200 OK`** with the header `Idempotent-Replayed: true`: you already sent this `externalRef`, so you get the existing order back.

**Idempotency.** An `externalRef` can only ever make one order, even if the same request arrives several times at once. After a timeout or a `5xx`, send exactly the same request again. You will never create a duplicate.

#### The order object

This shape is returned by every order endpoint and sent in webhooks:

```json
{
  "id": "order-1794109506885-c7c6a5",
  "externalRef": "PARTNER-10023",
  "source": "api",
  "partner": { "id": "partner-…", "name": "Acme Marketplace" },
  "status": "placed",
  "statusHistory": [ { "status": "placed", "at": "2026-11-08T09:12:01.000Z", "by": "partner", "note": "Placed by Acme Marketplace through the API (their order PARTNER-10023)" } ],
  "currency": "INR",
  "payment": { "method": "prepaid", "status": "paid", "paidAt": "2026-11-08T09:12:01.000Z" },
  "subtotal": 1198, "discountAmount": 0, "deliveryFee": 49, "total": 1247, "couponCode": null,
  "customer": { "name": "Asha Rao", "email": "asha@example.com", "phone": "9876543210" },
  "shipping": { "name": "Asha Rao", "phone": "9876543210", "address": "12 MG Road, Flat 4B", "landmark": "Near City Mall", "city": "Pune", "state": "Maharashtra", "pincode": "411001" },
  "items": [ { "productId": "ws-biotin-001", "variantId": "variant-…", "title": "Biotin … — 1 Month Supply", "variantLabel": "1 Month Supply", "quantity": 2, "unitPrice": 599, "lineTotal": 1198, "image": "…" } ],
  "tracking": { "number": null, "carrier": null, "estimatedDelivery": null },
  "cancellation": null,
  "return": null,
  "refundStatus": null,
  "createdAt": "2026-11-08T09:12:01.000Z",
  "updatedAt": "2026-11-08T09:12:01.000Z"
}
```

**`status`** moves through:

`placed` → `confirmed` → `out_for_delivery` → `delivered`

It can also become `cancelled`, or `returned` after a return is received. Older orders may show `packed` or `shipped`.

**`payment.method`** is one of `prepaid`, `cod`, `online` or `pending`.

### `GET /orders` (needs `orders:read`)

Returns your orders, newest first:

```json
{ "data": [ /* orders */ ], "limit": 50, "offset": 0, "hasMore": true }
```

| Query parameter | What it does |
|---|---|
| `status` | Only orders with this status. |
| `updatedSince` | ISO time. Only orders changed at or after it. Useful for polling if you don't use webhooks. |
| `externalRef` | Your order number. Returns at most one order. |
| `limit` | 1–100. Default 50. |
| `offset` | For paging. |

### `GET /orders/{id}`

Returns one of your orders, by the shop's order `id`. Orders that are not yours return `404`.

### `POST /orders/{id}/cancel` (needs `orders:write`)

```json
{ "reason": "changed_mind", "note": "Customer called" }
```

- **When:** only while the order is `placed` or `confirmed`. After it ships you get `409 not_cancellable`; contact the shop instead.
- **Stock:** goes back on the shelf.
- **Repeats:** cancelling twice is harmless.
- **`reason`** (optional) is one of: `ordered_by_mistake`, `changed_mind`, `wrong_product`, `wrong_address`, `better_price`, `delivery_slow`, `payment_issue`, `other`.

**Refunds.** For a `prepaid` order, the refund to your customer is between you and them, because you collected the payment.

### `GET /me`

Returns your key's name, permissions and allowed payment types. Use it to check your set-up.

## 5. Webhooks

The shop can send a `POST` to your HTTPS address whenever one of your orders changes, so you don't need to poll.

### Events

| Event | When |
|---|---|
| `order.created` | An order was placed (also for orders you placed yourself). |
| `order.status_changed` | The status moved. `data.previous.status` holds the old one. |
| `order.cancelled` | The order was cancelled. Also sent as `order.status_changed`. |
| `order.delivered` | The order was delivered. Also sent as `order.status_changed`. |
| `order.paid` | A payment was received. |
| `order.shipment_updated` | The tracking number, courier or expected delivery changed. |
| `order.return_updated` | A return was requested, approved, declined or received. |
| `order.refunded` | The order was marked refunded. |
| `ping` | A test sent from the shop's admin. |

### Message

```
POST /your/webhook/path
Content-Type: application/json
User-Agent: Chikit-Webhooks/1.0
X-Chikit-Event: order.status_changed
X-Chikit-Event-Id: evt_3f9a…
X-Chikit-Delivery: whd_…
X-Chikit-Timestamp: 1794109600
X-Chikit-Signature: t=1794109600,v1=5b8e…

{ "id": "evt_3f9a…", "type": "order.status_changed", "apiVersion": "2026-11-01", "createdAt": "2026-11-08T09:20:00.000Z",
  "data": { "order": { /* the order object */ }, "previous": { "status": "placed" } } }
```

### Check the signature

Check the signature on every message before you trust it:

1. Read `t` and `v1` from `X-Chikit-Signature`.
2. Compute HMAC-SHA256, keyed with your `whsec_…` secret, over `t + "." + rawBody`. Use the raw bytes exactly as received, before any JSON parsing.
3. Compare your result with `v1` using a constant-time comparison.
4. Reject messages whose `t` is more than 5 minutes old, to stop replays.

Node.js:

```js
import crypto from 'node:crypto';

function isFromChikit(rawBody, header, secret) {
    const t = /t=(\d+)/.exec(header)?.[1];
    const v1 = /v1=([a-f0-9]{64})/.exec(header)?.[1];
    if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}
```

Python:

```python
import hmac, hashlib, time, re

def is_from_chikit(raw_body: bytes, header: str, secret: str) -> bool:
    t = re.search(r"t=(\d+)", header); v1 = re.search(r"v1=([a-f0-9]{64})", header)
    if not t or not v1 or abs(time.time() - int(t.group(1))) > 300:
        return False
    expected = hmac.new(secret.encode(), f"{t.group(1)}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1.group(1))
```

### Answering and retries

- **Answer within 10 seconds** with any `2xx` status. Do the slow work after you have answered.
- **Redirects are not followed.** Any answer other than `2xx`, a redirect or a timeout counts as a failure.
- **Retry schedule.** A failed message is sent again after 1 min, 5 min, 30 min, 2 h, 6 h, 12 h and 24 h: 8 tries over about two days. After that the shop can still resend it by hand.
- **Expect repeats.** You may get the same event more than once: after a retry, or when the shop resends it. A repeat always has the same `X-Chikit-Event-Id`, so store the ids you have processed and skip repeats.
- **Order is not guaranteed.** Events can arrive out of order. Use `data.order.updatedAt` and `data.order.status` as the truth, or fetch `GET /orders/{id}` when in doubt.

## 6. Quick test

```bash
curl https://chikit.co.in/api/v1/me -H "Authorization: Bearer $CHIKIT_KEY"

curl -X POST https://chikit.co.in/api/v1/orders/quote -H "Authorization: Bearer $CHIKIT_KEY" -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"WS-BIO-1M","quantity":1}],"payment":"prepaid"}'
```

The shop can press **Send test** next to your webhook in its admin. You should receive a `ping` within a second.
