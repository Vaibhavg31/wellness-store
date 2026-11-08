# Online payments (Razorpay) and Google sign-in

Both are fully built. They switch on as soon as their keys are in the server config. Nothing has to be rebuilt: the browser gets the public halves of the keys from the server.

## 1. Where the keys go

| Key | What it is | Where to find it |
|---|---|---|
| `RAZORPAY_KEY_ID` | Public key id, `rzp_test_…` or `rzp_live_…` | Razorpay Dashboard → Account & Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Secret shown once with the key id | Same place (regenerate it if lost) |
| `RAZORPAY_WEBHOOK_SECRET` | A secret you choose when adding the webhook (step 3) | You type it in Razorpay, then paste the same text here |
| `GOOGLE_CLIENT_ID` | `….apps.googleusercontent.com` | Google Cloud Console → APIs & Services → Credentials (step 4) |
| `PAYMENT_WINDOW_MINUTES` | Optional. How long an unpaid online order is held (default 30) | — |

- **On your computer:** put them in `config.json` under `"development"`, then restart `npm run dev`.
- **On the live site:** put them in `prod.env` (see [DEPLOY-AWS.md](DEPLOY-AWS.md)), upload it, then restart the app.

The old `VITE_RAZORPAY_KEY_ID` and `VITE_GOOGLE_CLIENT_ID` still work as a fallback, but they are no longer needed.

To check that the keys are working, open **Admin → Settings → Connections**. It shows each one as Connected or Not connected, and whether Razorpay is in test or live mode.

## 2. Razorpay test mode first

Use the **test** keys (`rzp_test_…`) first. In test mode no real money moves:

- **UPI:** `success@razorpay` succeeds and `failure@razorpay` fails.
- **Cards:** use the test card numbers from https://razorpay.com/docs/payments/payments/test-card-details/

Try these on your computer:

1. Pay successfully. You should see "Payment successful", the order shows as Confirmed, and the bag is emptied.
2. Make a payment fail, then close the payment window. The order is saved and you can choose **Try again**, **Pay on delivery instead** or **Cancel order**.
3. Leave an order unpaid. It shows **Pay now** under My Orders, and it is cancelled by itself after 30 minutes.
4. Cancel a paid order. It is refunded through Razorpay; you can see the refund in the Razorpay Dashboard → Refunds.

## 3. Razorpay webhook (do this before going live)

The webhook confirms a payment even if the customer closes the page or loses connection right after paying.

1. Go to Razorpay Dashboard → Account & Settings → Webhooks → **Add new webhook**.
2. Webhook URL: `https://chikit.co.in/api/webhooks/razorpay`. The admin Settings page shows the exact address.
3. Secret: type a long random text and put the same text in `RAZORPAY_WEBHOOK_SECRET`.
4. Tick these events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.

Do this once in test mode and once in live mode; Razorpay keeps separate webhooks for each.

## 4. Google sign-in

1. Go to Google Cloud Console → APIs & Services → **OAuth consent screen**. Choose External, enter the app name "Chikit", a support email and the logo, then publish it.
2. Go to **Credentials** → Create credentials → **OAuth client ID** → Web application.
3. Under **Authorised JavaScript origins**, add `https://chikit.co.in`, `https://www.chikit.co.in` (if used) and `http://localhost:5173` for local testing. No redirect URI is needed.
4. Copy the Client ID into `GOOGLE_CLIENT_ID`. The client secret is not used.

The "Continue with Google" button then shows on the sign-in page and on the checkout sign-in step. You can turn it off with **Admin → Settings → Sign in with Google**.

## How it behaves (for reference)

**Payments**
- **When an online order is placed**, its stock is reserved and the order is held for 30 minutes while the customer pays.
- **If a payment fails or the window is closed**, the order is not cancelled. The customer can try again (inside Razorpay or from the order page), switch to Cash on Delivery, or cancel.
- **Before cancelling any unpaid order, Chikit asks Razorpay first.** A UPI payment that finishes late still confirms the order.
- **After 30 minutes unpaid**, the order is cancelled and its stock and coupon are released. The customer gets a "payment not completed" email.
- **Money is refunded automatically through Razorpay when:**
  - it arrives after an order was cancelled or switched to cash;
  - it is a second payment for an order that is already paid;
  - a paid order is cancelled, by the customer or by the shop;
  - a returned parcel is marked as received.
- **If Razorpay refuses a refund**, the order shows "Refund failed" in the admin, with a **Refund through Razorpay** button to try again.
- **An unpaid online order cannot be confirmed or shipped from the admin**, only cancelled. The order's details include a **Check with Razorpay** button.

**Google sign-in**
- Only Google accounts with a verified email can sign in.
- If the email already has an account, it signs into that account; the customer's own name in My Account is kept.
- A Google sign-in stays signed in for 7 days.
- Admin emails signing in with Google go to the admin panel, as before.
