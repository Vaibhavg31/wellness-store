# Chikit — Ayurveda and Wellness

A D2C Ayurveda/wellness e-commerce storefront with a **React (JavaScript)** frontend and a **Node.js (Express)** backend — see `backend-node/src/repositories/settingsRepository.js` for the CMS content shape and `backend-node/MIGRATION.md` for how this backend came to be (ported from an earlier PHP version, now fully replaced).

> **Status:** schema, backend, and UI are Chikit-branded end to end. MySQL is the database for both.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, JavaScript (JSX), Vite, Tailwind CSS v4 |
| **Backend** | Node.js (Express), MySQL via `mysql2` |
| **Auth** | JWT, Google OAuth, Email verification (Brevo), Phone OTP (MSG91) |

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- MySQL 5.7+/MariaDB 10.4+ (XAMPP works) — start it first. The database is created for you by the import file below.

### Setup

```bash
npm install
npm run db:setup     # creates the database and loads the starter shop (see below)
npm run dev
```

`npm run dev` installs and starts the Node API (`backend-node/`) alongside the Vite dev server automatically.

All configuration — database, secrets, API keys, feature flags — lives in
one file: **`config.json`** at the repo root. It's committed with working
local-dev values already filled in, so the command above works immediately;
open `config.json` and edit values in place for your own setup or to deploy.
See the comments at the top of that file for what each value does and what
needs a dev-server restart vs. what applies immediately.

- Storefront: http://localhost:5173
- API: http://localhost:8000
- Admin panel: http://localhost:5173/chikit-studio (the path is `ADMIN_PATH` in `config.json`)

### Database

Everything the shop needs is in **one file: [`database/chikit.sql`](database/chikit.sql)** — all 40 tables plus starter
content (7 categories, 10 products with full details, bundles, coupons `WELCOME10` / `WELCOMEBACK10`, banners, sample
reviews and every homepage/site setting). It contains **no customer data** (no users, orders, addresses, subscribers or
logs), so it is safe to share. Import it any one of these ways — they give the same result:

| Way | How |
|---|---|
| **npm** (easiest) | `npm run db:setup` — uses the connection in `config.json` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`) |
| **phpMyAdmin** | Open phpMyAdmin → **Import** → choose `database/chikit.sql` → **Go** (no need to create a database first) |
| **Terminal** | `mysql -u root -p < database/chikit.sql` |

It is safe to run again: tables are only created if missing and rows are only inserted if absent, so existing data is never
overwritten or deleted. The database is named `wellness_store` (matches `DB_NAME` in `config.json`; `npm run db:setup`
will create whatever name you put there instead).

**Troubleshooting** — *"Could not connect to MySQL … not running"*: start MySQL (XAMPP Control Panel → MySQL → Start).
*"Access denied"*: fix `DB_USER` / `DB_PASS` in `config.json`.

**Updating the file after you change the shop** — the file is a snapshot. To refresh it from your own database, dump the
tables again with `mysqldump` (leave out the private tables listed above), or re-export through phpMyAdmin → Export.
Schema changes also go in `backend/migrations/` (numbered, safe to re-run) and `backend/schema.sql`.

## Testing on Your Phone (same Wi-Fi)

The dev server binds to all network interfaces (`vite.config.js` → `server.host: true`), so a phone on the **same Wi-Fi network** as this PC can load the site directly — no deploy needed.

1. Start the app as usual: `npm run dev`
2. Find this PC's local IP (Windows): `ipconfig` → look for "IPv4 Address" under your Wi-Fi adapter (e.g. `192.168.1.3`)
3. On your phone's browser, go to: `http://<that-IP>:5173` (e.g. `http://192.168.1.3:5173`)
4. **Windows Firewall**: the first time, Windows may prompt "Allow this app through the firewall?" for Node.js — click **Allow** (Private networks). If you don't see a prompt and the phone can't connect, open PowerShell **as Administrator** and run:
   ```powershell
   New-NetFirewallRule -DisplayName "Vite Dev Server (5173)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
   ```
5. The API itself doesn't need to be exposed — the phone only talks to the Vite dev server (port 5173), which proxies `/api` and `/uploads` requests to the Node backend on this same PC (`127.0.0.1:8000`).

If it still doesn't load: confirm the phone is on the same Wi-Fi (not mobile data), and that the PC's Wi-Fi network profile is set to **Private**, not Public (Public profiles block inbound connections by default).

### Default Admin Login

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` in `config.json`.
Generate a bcrypt hash:
```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "yourpassword"
```
(run from `backend-node/`, where `bcryptjs` is installed)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | React dev server only |
| `npm run dev:server` | Node API only (port 8000) |
| `npm run dev` | Both together |
| `npm run dev:prod-like` / `npm run dev:otp` | Both, with real email verification + real OTP (no dev skips) |
| `npm run build` | Build frontend → `dist/` folder |

## Project Structure

```
backend-node/          # Node/Express API
├── src/
│   ├── routes/         # One file per feature area (products, orders, auth, ...)
│   ├── repositories/    # DB access layer (mysql2) — one per table/feature
│   ├── services/        # Razorpay, MSG91, Brevo, coupon logic
│   └── lib/              # Auth, config, response helpers, shared utilities
├── MIGRATION.md         # How this backend was ported from the original PHP version
└── uploads/              # Product/review/banner images

database/               # chikit.sql — the one-file import: full structure + starter shop content
backend/                # schema.sql (structure reference) and numbered migrations/
                         # (no application code; MySQL is shared infrastructure)

src/                    # React source (JavaScript .jsx / .js)
├── styles/
│   ├── tokens.css      # THE design tokens: colours, type scale, radius, shadows, motion
│   ├── fonts.css       # Self-hosted Lora + Poppins (latin subsets in public/fonts)
│   ├── base.css        # Element defaults, focus ring, reveal + reduced-motion rules
│   └── admin.css       # Admin panel chrome (uses the same tokens)
├── components/
│   ├── ui/             # Design-system primitives (Button, Input, Badge, Modal, Drawer, Logo, ...)
│   ├── layout/         # Header, Footer, announcement bar, search, account menu, WhatsApp button
│   ├── home/ shop/ product/ cart/ checkout/ orders/ auth/ account/   # Feature components
│   └── admin/          # Admin-only components
├── layouts/            # MainLayout (storefront shell)
├── pages/              # Route pages (storefront, auth, admin/)
├── contexts/ hooks/ services/ utils/ data/ constants/       # State, data layer, helpers
public/brand/           # Official Chikit logo (webp renditions of the supplied artwork)
CHIKIT/                 # Original brand source files (.ai/.eps/.pdf/.cdr/.png)

dist/                   # Built frontend (after npm run build)
```

## Design system

All colours, fonts, spacing, radii, shadows and motion live in `src/styles/tokens.css`.
Components use the generated Tailwind utilities (`bg-primary`, `text-ink`, `rounded-lg`,
`shadow-md`, ...) and never hardcode a value. The brand anchor is **#602460**, sampled from the
official logo. Gold (`accent`) is a fill colour only: pair it with `ink` text, never white.
Use the logo only through `components/ui/Logo.jsx`, always on a light surface.

## Deployment

### 1. Build frontend on your computer

```bash
npm install
# Set VITE_API_URL=https://api.yourdomain.com in config.json first
# (leave it empty instead if the API is served from the same domain)
npm run build
```

Upload everything inside `dist/` to your static host / CDN / main domain.

### 2. Deploy the Node backend

`backend-node/` needs a Node-capable host (a VPS, Render, Railway, Fly.io,
etc. — not classic PHP shared hosting). On the server:

```bash
cd backend-node
npm install --omit=dev
NODE_ENV=production node src/server.js
```

Put it behind a process manager (pm2, systemd) and a reverse proxy
(nginx/Caddy) that forwards `/api` and `/uploads` to it, the same way Vite's
dev proxy does locally. Make `backend-node/uploads/` writable.

### 3. Configuration

Everything lives in `config.json` at the repo root — deploy it as part of
the repo, then edit these values for production directly on the server:

```
APP_ENV=production
JWT_SECRET=your-random-secret        # generate a NEW one, don't reuse dev's
ADMIN_USERNAME=wellness_admin
ADMIN_PASSWORD_HASH=<bcrypt hash>
ADMIN_DEV_PASSWORD=                  # leave blank in production
GOOGLE_CLIENT_ID=your-google-client-id
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://api.yourdomain.com    # or leave empty if same-domain
DB_HOST / DB_NAME / DB_USER / DB_PASS      # your production database
RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET      # live keys, not test keys
SKIP_EMAIL_VERIFY=false
SKIP_PHONE_VERIFY=false
VITE_SKIP_PHONE_VERIFY=false
```

See the comments inside `config.json` for what every variable does.

### 4. React SPA routing

If pages 404 on refresh, configure your host/reverse proxy to fall back to
`index.html` for any path that isn't a real file (a standard SPA rewrite
rule — the exact syntax depends on your host).

## Admin Panel

Access at `/wellness-studio` (not linked on the public site).

## Phone OTP (checkout)

Checkout verifies the customer's mobile with **MSG91 SendOTP server API** (`/api/auth/send-phone-otp`, `confirm-phone-otp`, `resend-phone-otp`). No browser widget or captcha.

### Quick check

```bash
npm run dev:otp    # production-like OTP (real SMS, production rate limits)
curl -s http://localhost:8000/api/health | jq '.otp'
```

Look at `otp.serverOutboundIp` and whitelist that IP in **MSG91 Dashboard → Authkey → IP Security**. Error **418** means verify/retry (or send) is blocked until the IP is added.

### Dev modes

| Goal | `config.json` |
|------|--------|
| Real OTP (like production) | `SKIP_PHONE_VERIFY=false`, `VITE_SKIP_PHONE_VERIFY=false`, `MSG91_OTP_MODE=production` |
| Skip OTP locally | `SKIP_PHONE_VERIFY=true`, `VITE_SKIP_PHONE_VERIFY=true`, or `MSG91_OTP_MODE=skip` |

Audit log: `otp_logs` table (last 200 events). Dev endpoint: `GET /api/auth/otp-logs` (customer JWT).
