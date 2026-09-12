# Wellness Store (template)

A wellness / nutrition D2C e-commerce template (Kapiva / OZiva style) with **React (JavaScript)** frontend and **PHP** backend. Adapted from the Krivea Jewels commerce template — schema and branding are wellness-specific; see `backend/schema.sql` and `backend/seed.sql`.

> **Status:** database schema, seed data, and config are wellness-ready. The PHP repository layer and React UI copy still reference some jewelry-specific fields/branding from the original template and will be adapted in follow-up work.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, JavaScript (JSX), Vite, Tailwind CSS v4 |
| **Backend** | PHP 8.1+, JSON file storage (MySQL-ready repository layer) |
| **Auth** | JWT, Google OAuth, Email verification (Brevo), Phone OTP (MSG91) |

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+ (only for building the frontend)
- PHP 8.1+
- Composer

### Setup

```bash
npm install
cd backend && composer install && cd ..
npm run dev:all
```

All configuration — database, secrets, API keys, feature flags — lives in
one file: **`config.json`** at the repo root. It's committed with working
local-dev values already filled in, so the command above works immediately;
open `config.json` and edit values in place for your own setup or to deploy.
See the comments at the top of that file for how PHP and Vite both read it,
and what needs a dev-server restart vs. what applies immediately.

- Storefront: http://localhost:5173
- PHP API: http://localhost:8000
- Admin panel: http://localhost:5173/wellness-studio

## Testing on Your Phone (same Wi-Fi)

The dev server binds to all network interfaces (`vite.config.js` → `server.host: true`), so a phone on the **same Wi-Fi network** as this PC can load the site directly — no deploy needed.

1. Start the app as usual: `npm run dev:all`
2. Find this PC's local IP (Windows): `ipconfig` → look for "IPv4 Address" under your Wi-Fi adapter (e.g. `192.168.1.3`)
3. On your phone's browser, go to: `http://<that-IP>:5173` (e.g. `http://192.168.1.3:5173`)
4. **Windows Firewall**: the first time, Windows may prompt "Allow this app through the firewall?" for Node.js — click **Allow** (Private networks). If you don't see a prompt and the phone can't connect, open PowerShell **as Administrator** and run:
   ```powershell
   New-NetFirewallRule -DisplayName "Vite Dev Server (5173)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
   ```
5. The PHP API itself doesn't need to be exposed — the phone only talks to the Vite dev server (port 5173), which proxies `/api` and `/uploads` requests to the PHP backend on this same PC (`127.0.0.1:8000`).

If it still doesn't load: confirm the phone is on the same Wi-Fi (not mobile data), and that the PC's Wi-Fi network profile is set to **Private**, not Public (Public profiles block inbound connections by default).

### Default Admin Login

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` in `config.json`.  
Generate a bcrypt hash: `php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT) . PHP_EOL;"`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | React dev server |
| `npm run dev:server` | PHP API (port 8000) |
| `npm run dev:all` | Both together |
| `npm run build` | Build frontend → `dist/` folder |

## Project Structure

```
backend/               # PHP API (upload to server)
├── lib/               # PHP classes
│   └── Repository/    # Data repository layer (JSON now, DB-ready)
├── public/            # Web entry point (index.php)
├── data/              # JSON database files
└── uploads/           # Product images

src/                   # React source (JavaScript .jsx / .js)
├── components/
├── pages/
├── contexts/
└── services/

dist/                  # Built frontend (after npm run build)
```

## Shared Hosting Deployment

### 1. Build frontend on your computer

```bash
npm install
# Set VITE_API_URL=https://api.kriveajewels.in in config.json first
# (leave it empty instead if the API is served from the same domain)
npm run build
```

Upload everything inside `dist/` to your main domain `public_html/`.

### 2. Upload PHP backend

Upload `backend/` to your server. Point the API document root to `backend/public/`.

Make `backend/data/` and `backend/uploads/` writable. Run:

```bash
cd backend && composer install --no-dev
```

### 3. Configuration

Everything lives in `config.json` at the repo root — deploy it as part of
the repo, then edit these values for production directly on the server:

```
APP_ENV=production
JWT_SECRET=your-random-secret        # generate a NEW one, don't reuse dev's
ADMIN_USERNAME=krivea_admin
ADMIN_PASSWORD_HASH=<bcrypt hash>
ADMIN_DEV_PASSWORD=                  # leave blank in production
GOOGLE_CLIENT_ID=your-google-client-id
FRONTEND_URL=https://kriveajewels.in
VITE_API_URL=https://api.kriveajewels.in   # or leave empty if same-domain
DB_HOST / DB_NAME / DB_USER / DB_PASS      # your production database
RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET      # live keys, not test keys
SKIP_EMAIL_VERIFY=false
SKIP_PHONE_VERIFY=false
VITE_SKIP_PHONE_VERIFY=false
```

See the comments inside `config.json` for what every variable does.

### 4. React SPA routing (Apache)

Add to `public_html/.htaccess` if pages show 404 on refresh:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

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

Audit log: `backend/data/otp-logs.json` (last 200 events). Dev endpoint: `GET /api/auth/otp-logs` (customer JWT).
