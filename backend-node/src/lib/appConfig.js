import { shouldSkipOtpVerify, usesProductionRateLimits } from './otpConfig.js';
// The FULL isEnabled() check (service toggle AND Brevo credentials configured) —
// matches PHP's AppConfig.php, which calls EmailService::isEnabled(), not the
// bare ServicesConfig::isEmailEnabled() toggle.
import { isEmailEnabled as isEmailFullyEnabled } from '../services/emailService.js';

/** Mirrors backend/lib/AppConfig.php. */
export function appEnv() {
    return String(process.env.APP_ENV || 'development').toLowerCase().trim();
}

export function isProduction() {
    return appEnv() === 'production';
}

export function isDevelopment() {
    return !isProduction();
}

export function skipEmailVerify() {
    return String(process.env.SKIP_EMAIL_VERIFY || 'false').toLowerCase() === 'true';
}

export function skipPhoneVerify() {
    return String(process.env.SKIP_PHONE_VERIFY || 'false').toLowerCase() === 'true';
}

export function skipPhoneVerifyFrontend() {
    return String(process.env.VITE_SKIP_PHONE_VERIFY || 'false').toLowerCase() === 'true';
}

export async function isProductionLikeDev() {
    if (isProduction()) return false;
    return (
        !skipEmailVerify()
        && !skipPhoneVerify()
        && !skipPhoneVerifyFrontend()
        && (await isEmailFullyEnabled())
        && !(await shouldSkipOtpVerify())
    );
}

export async function healthProfile() {
    const productionLike = await isProductionLikeDev();
    return {
        appEnv: appEnv(),
        productionLikeDev: productionLike,
        emailVerification: skipEmailVerify() ? 'skipped' : 'required',
        phoneOtpAtCheckout: (await shouldSkipOtpVerify()) ? 'skipped' : 'required',
        recommendation: productionLike
            ? 'Dev matches production auth & checkout — safe to test sign-up, email links, and OTP.'
            : await productionLikeHint(),
    };
}

async function productionLikeHint() {
    const fixes = [];
    if (skipEmailVerify()) fixes.push('set SKIP_EMAIL_VERIFY=false');
    if (skipPhoneVerify()) fixes.push('set SKIP_PHONE_VERIFY=false');
    if (skipPhoneVerifyFrontend()) fixes.push('set VITE_SKIP_PHONE_VERIFY=false (not "fase")');
    if (!(await isEmailFullyEnabled())) fixes.push('configure BREVO_API_KEY + BREVO_SENDER_EMAIL');
    if ((await shouldSkipOtpVerify()) && !skipPhoneVerify()) fixes.push('set MSG91_OTP_MODE=production or enable OTP in store settings');
    return fixes.length === 0 ? 'Adjust config.json for production-like testing.' : `For production-like dev: ${fixes.join('; ')}.`;
}
