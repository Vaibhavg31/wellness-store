import { useSiteContent } from '@/contexts/SiteContentContext';

const BUILD_RAZORPAY_KEY = String(import.meta.env.VITE_RAZORPAY_KEY_ID || '');
const BUILD_GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');

const usableRazorpayKey = (key) => /^rzp_(test|live)_/.test(key) && !/x{4,}/i.test(key);
const usableGoogleId = (id) => id.endsWith('.apps.googleusercontent.com');

/**
 * The public Razorpay key id and Google client id. They come from the server config with the store settings, so putting
 * new keys in config.json and restarting the server is enough (no rebuild); the build-time VITE_ values are only a fallback.
 */
export function useIntegrations() {
    const { content } = useSiteContent();
    const fromServer = content?.integrations || {};
    const razorpayKeyId = [fromServer.razorpay?.keyId, BUILD_RAZORPAY_KEY].find((k) => usableRazorpayKey(String(k || ''))) || '';
    const googleClientId = [fromServer.google?.clientId, BUILD_GOOGLE_CLIENT_ID].find((k) => usableGoogleId(String(k || ''))) || '';
    return {
        razorpayKeyId,
        razorpayReady: Boolean(razorpayKeyId),
        razorpayMode: fromServer.razorpay?.mode || (razorpayKeyId.startsWith('rzp_live_') ? 'live' : razorpayKeyId ? 'test' : null),
        googleClientId,
        googleReady: Boolean(googleClientId),
    };
}
