import { SettingsRepository } from '../repositories/settingsRepository.js';

/** Store-wide service toggles from the settings row (admin Settings page). Mirrors ServicesConfig.php. */
async function serviceFlag(key) {
    try {
        const settings = await new SettingsRepository().get();
        const services = settings.services || {};
        return services[key] !== false;
    } catch {
        return true;
    }
}

async function paymentFlag(key) {
    try {
        const settings = await new SettingsRepository().get();
        const payments = settings.payments || {};
        return payments[key] !== false;
    } catch {
        return true;
    }
}

/** The Google OAuth web client id from the server config (GOOGLE_CLIENT_ID; the old VITE_ name still works). Public, not a secret. */
export function googleClientId() {
    const id = String(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
    return id.endsWith('.apps.googleusercontent.com') ? id : '';
}

export const isEmailEnabled = () => serviceFlag('emailEnabled');
export const isOtpEnabled = () => serviceFlag('otpEnabled');
export const isGoogleSignInEnabled = () => serviceFlag('googleSignInEnabled');
export const isCodEnabled = () => paymentFlag('codEnabled');
export const isOnlinePaymentEnabled = () => paymentFlag('onlinePaymentEnabled');
