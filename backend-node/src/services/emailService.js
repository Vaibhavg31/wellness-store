import * as brevo from './brevoService.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';

/**
 * Facade over brevoService, mirrors backend/lib/EmailService.php — this is
 * what auth routes call. Templates here use the Chikit brand plum (#602460)
 * instead of the old template's forest green, which backend/ (PHP) never
 * got updated to.
 */
const BRAND_PLUM = '#602460';

export const isEmailEnabled = () => brevo.isBrevoEnabled();
export const isAuthEmailEnabled = () => brevo.isBrevoEnabled();
export const sendTransactionalEmail = (to, subject, htmlContent, toName, options) =>
    brevo.sendTransactionalEmail(to, subject, htmlContent, toName, options);
export const handleOrderEvent = (order, event) => brevo.handleOrderEvent(order, event);

async function brandName() {
    const envName = String(process.env.BREVO_SENDER_NAME || '').trim();
    if (envName) return envName;
    try {
        const settings = await new SettingsRepository().get();
        return settings.brandName || 'Chikit';
    } catch {
        return 'Chikit';
    }
}

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendEmailVerification(to, name, verifyUrl) {
    const brand = await brandName();
    const year = new Date().getFullYear();
    const safeName = esc(name);
    const safeUrl = esc(verifyUrl);

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
<tr><td>
<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#2c241c;">${brand}</p>
<p style="margin:0 0 24px;font-size:14px;color:#8b7355;">Confirm your email to sign in</p>
<p style="margin:0 0 12px;font-size:16px;color:#2c241c;">Hi ${safeName},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3f35;">
Thanks for creating your account. Click the button below to verify your email address and complete sign-in.
</p>
<p style="margin:28px 0;text-align:center;">
<a href="${safeUrl}" style="display:inline-block;padding:14px 32px;background:${BRAND_PLUM};color:#faf7f2;text-decoration:none;border-radius:999px;font-weight:600;">
Verify email &amp; sign in
</a>
</p>
<p style="margin:0 0 8px;font-size:13px;color:#8b7355;">This secure link expires in 24 hours.</p>
<p style="margin:0;font-size:12px;color:#b0a08d;">If you did not create an account, you can ignore this email.<br>© ${year} ${brand}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    return sendTransactionalEmail(to, `Verify your email & sign in — ${brand}`, html, name, { tags: ['email-verification', 'auth'] });
}

export async function sendPasswordReset(to, name, resetUrl) {
    const brand = await brandName();
    const year = new Date().getFullYear();
    const safeName = esc(name);
    const safeUrl = esc(resetUrl);

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
<tr><td>
<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#2c241c;">${brand}</p>
<p style="margin:0 0 24px;font-size:14px;color:#8b7355;">Reset your password</p>
<p style="margin:0 0 12px;font-size:16px;color:#2c241c;">Hi ${safeName},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a3f35;">
We received a request to reset your password. Click the button below to choose a new one.
</p>
<p style="margin:28px 0;text-align:center;">
<a href="${safeUrl}" style="display:inline-block;padding:14px 32px;background:${BRAND_PLUM};color:#faf7f2;text-decoration:none;border-radius:999px;font-weight:600;">
Reset password
</a>
</p>
<p style="margin:0 0 8px;font-size:13px;color:#8b7355;">This link expires in 1 hour.</p>
<p style="margin:0;font-size:12px;color:#b0a08d;">If you did not request this, ignore this email — your password stays the same.<br>© ${year} ${brand}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    return sendTransactionalEmail(to, `Reset your password — ${brand}`, html, name, { tags: ['password-reset', 'auth'] });
}
