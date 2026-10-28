import express from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { corsMiddleware } from './lib/cors.js';
import { sendError } from './lib/response.js';
import { uploadsDirPath } from './lib/db.js';
import { healthProfile } from './lib/appConfig.js';
import { isAuthEmailEnabled } from './services/emailService.js';
import { otpStatus } from './lib/otpConfig.js';
import { serverOutboundIp } from './lib/otpLogger.js';

import categoryRoutes from './routes/categoryRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import productRoutes from './routes/productRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import spinRoutes from './routes/spinRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import bundleRoutes from './routes/bundleRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

export function createApp() {
    const app = express();
    // The HTTPS proxy sits in front of this process on a private address. Trusting only private addresses means req.ip is
    // the visitor's real address, so per-visitor limits (spins, logins, offers) count each person on their own instead of
    // lumping everyone behind the proxy together, and a visitor on the open internet cannot fake it with a header.
    app.set('trust proxy', 'loopback, linklocal, uniquelocal');

    app.use(compression());
    app.use(corsMiddleware);

    // Raw body needed for Razorpay webhook signature verification — captured
    // before JSON parsing via express.json's verify hook, same bytes PHP's
    // file_get_contents('php://input') saw.
    app.use(express.json({
        limit: '2mb',
        verify: (req, _res, buf) => { req.rawBody = buf; },
    }));

    // Static uploads — mirrors start.php's /uploads/* handling (content-addressed filenames, cache forever).
    app.use('/uploads', (req, res, next) => {
        const filePath = path.join(uploadsDirPath(), decodeURIComponent(req.path));
        if (!filePath.startsWith(uploadsDirPath())) return res.status(404).end(); // path traversal guard, not present in the PHP version but free to add
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return res.status(404).end();
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.sendFile(filePath);
    });

    // Lightweight liveness probe for the container health check (no outbound calls, unlike /api/health).
    app.get('/healthz', (req, res) => res.type('text').send('ok'));

    // ── Health check ──────────────────────────────────────────────────────
    app.get('/api/health', async (req, res) => {
        const outboundIp = await serverOutboundIp();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            email: {
                provider: 'brevo',
                configured: await isAuthEmailEnabled(),
                verification: process.env.SKIP_EMAIL_VERIFY === 'true' ? 'skipped (SKIP_EMAIL_VERIFY)' : 'required',
                hint: (await isAuthEmailEnabled())
                    ? 'Brevo is ready — sign-up, forgot password, and order emails use the REST API.'
                    : 'Set BREVO_API_KEY and BREVO_SENDER_EMAIL in config.json.',
            },
            profile: await healthProfile(),
            otp: {
                ...(await otpStatus()),
                delivery: 'server (SendOTP API — checkout send/verify/resend; logs in MSG91 → SendOTP)',
                serverOutboundIp: outboundIp,
                whitelistHint: outboundIp
                    ? `Add ${outboundIp} in MSG91 → Authkey → IP Security (required for send, verify, and retry).`
                    : 'Could not detect outbound IP — check MSG91 Failed Logs for the IP to whitelist.',
            },
        });
    });

    app.use('/api', categoryRoutes);
    app.use('/api', settingsRoutes);
    app.use('/api', bannerRoutes);
    app.use('/api', reviewRoutes);
    app.use('/api', feedbackRoutes);
    app.use('/api', newsletterRoutes);
    app.use('/api', mediaRoutes);
    app.use('/api', productRoutes);
    app.use('/api', couponRoutes);
    app.use('/api', spinRoutes);
    app.use('/api', offerRoutes);
    app.use('/api', bundleRoutes);
    app.use('/api', authRoutes);
    app.use('/api', userRoutes);
    app.use('/api', orderRoutes);
    app.use('/api', uploadRoutes);

    // Production image: the same process serves the built storefront (Vite's dist/), so one container is the
    // whole site. Pre-rendered SEO pages (dist/<route>/index.html) win; anything else falls back to the SPA shell.
    // In local dev there's no dist/ next to the repo root's backend, so this stays off and Vite serves the UI.
    const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
    if (fs.existsSync(path.join(distDir, 'index.html'))) {
        const shell = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
        // Link previews (WhatsApp, Facebook, Google) read this HTML without running any script, and they need full web
        // addresses: a relative og:image shows no picture. So the page is sent with the full address filled in, plus a
        // canonical link to the main address (FRONTEND_URL, else the address the visitor used).
        const pageFor = (req) => {
            const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
            const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
            const visited = /^[a-z0-9.-]+(:\d+)?$/i.test(host) && /^https?$/.test(proto) ? `${proto}://${host}` : '';
            const site = (process.env.FRONTEND_URL || '').trim().replace(/\/$/, '') || visited;
            if (!site) return shell;
            const url = `${site}${req.path === '/' ? '/' : req.path.replace(/\/$/, '')}`;
            return shell
                .replaceAll('content="/og-image.png"', `content="${site}/og-image.png"`)
                .replace('<title data-seo-default>', `<link data-seo-default rel="canonical" href="${url}" />\n    <meta data-seo-default property="og:url" content="${url}" />\n    <title data-seo-default>`);
        };
        app.use(express.static(distDir, {
            index: false, // the page itself is sent below, with full addresses filled in
            setHeaders: (res, filePath) => {
                const file = filePath.split(path.sep).join('/');
                // Hashed build assets and the font files never change; the logo and catalog pictures change rarely, so a
                // returning phone reuses them for a day (and shows them instantly while it quietly refreshes for a week).
                // HTML must always be re-checked so a deploy shows up at once.
                if (file.includes('/assets/') || file.includes('/fonts/')) res.set('Cache-Control', 'public, max-age=31536000, immutable');
                else if (file.includes('/catalog/') || file.includes('/brand/')) res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
                else res.set('Cache-Control', 'no-cache');
            },
        }));
        // Page routes only: a missing file (anything with an extension, or under /assets) must 404, not return HTML.
        app.get(/^\/(?!api\/|uploads\/|assets\/)[^.]*$/, (req, res) => {
            res.set('Cache-Control', 'no-cache');
            res.type('html').send(pageFor(req));
        });
    }

    app.use((req, res) => {
        sendError(res, 'Not found', 404);
    });

    // Final error handler — catches express.json's body-parse errors etc.
    app.use((err, req, res, next) => {
        if (res.headersSent) return next(err);
        console.error(err);
        sendError(res, 'Invalid request', 400);
    });

    return app;
}
