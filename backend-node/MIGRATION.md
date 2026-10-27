# Node backend migration

**Status: this is now the active dev backend.** `npm run dev` (root
`package.json`) starts this Node/Express server on port 8000 — the same port
and the same `wellness_store` MySQL database `backend/` (PHP) used, so
`vite.config.js`'s `/api` and `/uploads` proxy needed zero changes.

The PHP backend (`backend/` + `start.php`) is untouched on disk and still
fully runnable — `npm run dev:php` starts the old PHP-backed dev setup
instead, if you ever need to compare or roll back. Nothing about PHP was
deleted or modified.

## Why this exists

Full backend rewrite from PHP to Node, requested so the whole project runs on
one runtime. Scope: all ~90 endpoints across 12 route groups (auth, products,
categories, banners, reviews, feedback, settings, uploads, media, coupons,
bundles, orders, newsletter, users), including Razorpay payments, MSG91 OTP,
Brevo transactional email, and Google sign-in.

## Conventions (mirrors the PHP backend 1:1 on purpose)

- **Routing**: `src/routes/*.js`, one file per PHP `Routes/*Routes.php`, same
  handler names. Mounted in `src/app.js` in the same order as `Router.php`.
- **Repositories**: `src/repositories/*.js`, one per PHP `Repository/*.php`.
  Same `tableName` / `rowToArray` / `arrayToRow` shape as `MysqlRepository.php`,
  via a `BaseRepository` class in `src/repositories/base.js`.
- **Auth**: `src/lib/auth.js` issues/verifies JWTs with the **same secret and
  HS256 algorithm** as the PHP `Auth.php` (`JWT_SECRET` from `config.json`) —
  a token issued by one backend verifies fine on the other, which matters
  during any future side-by-side testing.
- **Response shape**: every endpoint returns the exact same JSON shape as its
  PHP counterpart (checked against the PHP source field-by-field, not just
  "looks similar") — the frontend should be able to point at either backend
  with zero changes.
- **Config**: `src/lib/config.js` reads the same root `config.json`
  (`environment` + matching block), same as `ConfigLoader.php`.
- **DB**: `src/lib/db.js` is a `mysql2/promise` pool against the same
  `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS`. No schema changes — this backend
  reads/writes the identical tables the PHP backend uses.

## Status

See the progress notes at the bottom of this file for what's ported and
verified vs. still pending. Keep it updated as you go — this is the single
source of truth for "how far did the migration get."

## Running it

It starts automatically with the root `npm run dev` (or `npm run dev:prod-like`
/ `npm run dev:otp`) — no separate step needed day to day.

To run it standalone (e.g. while comparing against PHP):
```
cd backend-node
npm install
npm run start     # listens on :8000 by default (NODE_PORT or PORT to override)
```

To go back to the PHP backend instead: `npm run dev:php` (root package.json)
runs the original PHP-backed dev setup unchanged.

## Progress

**All ~90 endpoints from `backend/lib/Router.php` are ported and mounted in
`src/app.js`.** Every route group below has been diffed field-by-field
against the live PHP backend (both pointed at the same database) for its
read endpoints, and the checkout path (place order → stock decrement →
admin cancel → stock restore) was exercised end-to-end with a disposable
test account against the real `wellness_store` database and matched exactly.

- [x] Infra: config loader, DB pool, JWT auth, response helpers, CORS, rate
      limiter, HTTP client, app/services/OTP config
- [x] Auth (register, login, Google OAuth, forgot/reset password, email
      verification, admin login, phone OTP send/verify/resend, OTP logs)
- [x] Products (public/admin CRUD, variants, trending, batched child-table
      queries)
- [x] Categories, Banners, Reviews, Feedback, Newsletter, Media library
- [x] Settings (the full CMS content repository + its ~10 child tables)
- [x] Coupons + CouponService (discount math, eligibility, audience
      targeting, atomic usage reservation)
- [x] Bundles (live-computed pricing from current product prices)
- [x] Users (saved addresses, admin list/filter/export, guest-customer
      synthesis from orders)
- [x] Orders — the highest-stakes route group: checkout, Razorpay order
      creation + signature verification + webhook reconciliation, coupon
      redemption/release, stock decrement/restore, status pipeline with
      history, admin direct-order creation, CSV/PDF export
- [x] Uploads (image processing via sharp instead of PHP GD, video uploads,
      review photos) + Media library recording

## Known, deliberate deviations from the PHP source

- **Timestamps are UTC-deterministic, not host-timezone-dependent.** The PHP
  backend has a latent bug: `backend/php.ini` has `date.timezone=Europe/Berlin`
  (an unrelated leftover default), so its *read* path interprets naive
  stored datetimes as Berlin time while its *write* path
  (`toDbDatetime()`/`gmdate()`) always stores them as UTC — a round-trip
  mismatch. This Node backend's `src/lib/db.js` forces `dateStrings: true`
  and every repository's `toIso()`/`toDbDatetime()` treats naive values as
  UTC on both read and write, consistently, regardless of the host
  machine's clock. This means **Node and PHP will report different wall-clock
  times for the same row** until `backend/php.ini`'s `date.timezone` is
  fixed to `UTC` — that's the PHP bug, not a Node one.
- **Email HTML templates use the current Chikit brand plum (`#602460`)**
  instead of the old template's forest green (`#0F5132`) that `backend/`
  (PHP) never got updated to during the earlier rebrand.
- **PDF exports (`ExportHelper.php` equivalent) are built with `pdfkit`**
  (programmatic table drawing) instead of porting dompdf + HTML/CSS — same
  output shape (bordered table, landscape, paginated, CSV sibling), not
  pixel-identical. Also fixes a stale leftover: the PHP version's PDF
  footer literally says "Krivéa Studio" (the brand before the
  wellness/Chikit rebrands) — this version uses the live brand name from
  site settings.
- **`ProductRepository`'s defensive "has this migration run yet?" checks**
  (`variantsTableExists()`, `variantImageColumnExists()`) are not ported —
  this database already has those migrations applied, and carrying the
  fallback forward would just be dead code for this environment.
- **Multer's file-size-limit rejections** surface as a generic 400 from the
  app-level error handler rather than the specific "File too large (max
  5MB)" / "max 20MB" message PHP returns — the limit itself (and the
  friendly message for every other upload failure path) is enforced
  identically.

## Not done

- Only wired into **local dev** (`npm run dev` and friends). Nothing about
  a production deployment (process manager, reverse proxy, env vars on a
  real server) has been set up — that's a separate task whenever this is
  ready to actually ship.
- No automated test suite — verification so far is the manual diffing and
  the one real checkout-path exercise described above. Before any real
  cutover, at minimum the coupon edge cases (audience targeting, usage caps,
  free-delivery threshold interaction) and the Razorpay webhook path
  deserve dedicated tests.
