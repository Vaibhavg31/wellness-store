import express from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
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
import bundleRoutes from './routes/bundleRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

export function createApp() {
    const app = express();

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
    app.use('/api', bundleRoutes);
    app.use('/api', authRoutes);
    app.use('/api', userRoutes);
    app.use('/api', orderRoutes);
    app.use('/api', uploadRoutes);

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
