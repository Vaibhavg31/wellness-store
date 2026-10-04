import { isOtpEnabled } from './servicesConfig.js';

/** Mirrors backend/lib/OtpConfig.php. */
export function otpMode() {
    if ((process.env.APP_ENV || '') === 'production') return 'production';
    const mode = String(process.env.MSG91_OTP_MODE || 'live').toLowerCase().trim();
    if (['production', 'prod', 'live'].includes(mode)) return 'live';
    if (['skip', 'mock', 'dev'].includes(mode)) return 'skip';
    return 'live';
}

export function isLiveOtpMode() {
    if ((process.env.APP_ENV || '') === 'production') return true;
    return otpMode() === 'live';
}

export async function shouldSkipOtpVerify() {
    if (!(await isOtpEnabled())) return true;
    if ((process.env.APP_ENV || '') === 'production') return false;
    if ((process.env.SKIP_PHONE_VERIFY || 'false') === 'true') return true;
    if (isLiveOtpMode()) return false;
    return otpMode() === 'skip';
}

export function usesProductionRateLimits() {
    if ((process.env.APP_ENV || '') === 'production') return true;
    const mode = String(process.env.MSG91_OTP_MODE || 'live').toLowerCase().trim();
    return ['production', 'prod'].includes(mode);
}

export function maxOtpSendAttempts() {
    if ((process.env.APP_ENV || '') === 'production' || usesProductionRateLimits()) return 8;
    return 15;
}

export function includeOtpDebugHints() {
    return (process.env.APP_ENV || '') === 'development' && !usesProductionRateLimits();
}

export async function otpStatus() {
    return {
        mode: isLiveOtpMode() ? 'live' : 'skip',
        productionTest: usesProductionRateLimits() && (process.env.APP_ENV || '') === 'development',
        productionLimits: usesProductionRateLimits(),
        skipVerify: await shouldSkipOtpVerify(),
        otpEnabled: await isOtpEnabled(),
        maxSendAttempts: maxOtpSendAttempts(),
        msg91Configured: String(process.env.MSG91_AUTH_KEY || '').trim() !== '' && String(process.env.MSG91_OTP_TEMPLATE_ID || '').trim() !== '',
    };
}
