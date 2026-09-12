const SCRIPT_URLS = [
    'https://verify.msg91.com/otp-provider.js',
    'https://verify.phone91.com/otp-provider.js',
];

const WIDGET_INIT_MS = 12_000;

export const MSG91_CAPTCHA_ID = 'krivea-msg91-captcha';

export const DEV_SKIP_PHONE_VERIFY = import.meta.env.VITE_SKIP_PHONE_VERIFY === 'true';

let scriptPromise = null;
let widgetInitPromise = null;

function loadMsg91Script() {
    if (typeof window !== 'undefined' && typeof window.initSendOTP === 'function') {
        return Promise.resolve();
    }
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        let i = 0;

        const attempt = () => {
            if (i >= SCRIPT_URLS.length) {
                reject(new Error('Could not load MSG91 OTP widget. Check your network.'));
                return;
            }

            const script = document.createElement('script');
            script.src = SCRIPT_URLS[i];
            script.async = true;
            script.onload = () => {
                if (typeof window.initSendOTP === 'function') {
                    resolve();
                } else {
                    i += 1;
                    attempt();
                }
            };
            script.onerror = () => {
                i += 1;
                attempt();
            };
            document.head.appendChild(script);
        };

        attempt();
    });

    return scriptPromise;
}

export function normalizeIndianPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return `91${digits.slice(-10)}`;
    return digits;
}

/** Extract JWT access token from MSG91 widget success payloads. */
export function extractMsg91AccessToken(data) {
    if (!data) return null;
    if (typeof data === 'string' && data.length > 20) return data;

    const candidates = [
        data.accessToken,
        data.token,
        data.access_token,
        data.jwt,
        data?.data?.accessToken,
        data?.data?.token,
        data?.data?.access_token,
    ];
    for (const value of candidates) {
        if (typeof value === 'string' && value.length > 20) return value;
    }

    if (data.type === 'success' && typeof data.message === 'string' && data.message.length > 20) {
        return data.message;
    }
    return null;
}

/** Extract reqId from MSG91 widget send/retry responses (needed for widget session). */
export function extractMsg91ReqId(data) {
    if (!data || typeof data !== 'object') return null;
    const candidates = [
        data.request_id,
        data.requestId,
        data.reqId,
        data?.data?.request_id,
        data?.data?.requestId,
        data?.data?.reqId,
    ];
    for (const value of candidates) {
        if (typeof value === 'string' && value.length > 4) return value;
    }
    return null;
}

function getMsg91Config() {
    const widgetId = import.meta.env.VITE_MSG91_WIDGET_ID;
    const tokenAuth = import.meta.env.VITE_MSG91_TOKEN_AUTH;
    if (!widgetId || !tokenAuth) {
        throw new Error('MSG91 is not configured. Add VITE_MSG91_WIDGET_ID and VITE_MSG91_TOKEN_AUTH to config.json');
    }
    return { widgetId, tokenAuth };
}

/** True when MSG91 captcha step is done (or captcha is disabled in widget settings). */
export function isMsg91CaptchaVerified() {
    if (typeof window === 'undefined') return false;
    if (typeof window.isCaptchaVerified !== 'function') return true;
    try {
        return Boolean(window.isCaptchaVerified());
    } catch {
        return false;
    }
}

/**
 * Initialize MSG91 widget with exposed methods + inline captcha for custom UI.
 * @see https://msg91.com/help/sendotp/how-to-integrate-the-new-login-with-otp-widget
 */
export async function ensureMsg91Widget(captchaRenderId = MSG91_CAPTCHA_ID) {
    if (typeof window !== 'undefined' && window.__kriveaMsg91Ready) {
        return;
    }
    if (widgetInitPromise) return widgetInitPromise;

    widgetInitPromise = (async () => {
        const { widgetId, tokenAuth } = getMsg91Config();
        await loadMsg91Script();

        if (!document.getElementById(captchaRenderId)) {
            throw new Error('MSG91 captcha container not found. Refresh and try again.');
        }

        await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('MSG91 widget did not initialize in time.'));
            }, WIDGET_INIT_MS);

            const configuration = {
                widgetId,
                tokenAuth,
                exposeMethods: true,
                captchaRenderId,
                success: () => {},
                failure: () => {},
            };

            const finish = () => {
                clearTimeout(timeoutId);
                if (typeof window.sendOtp === 'function' && typeof window.verifyOtp === 'function') {
                    window.__kriveaMsg91Ready = true;
                    resolve();
                } else {
                    reject(new Error('MSG91 exposed methods (sendOtp / verifyOtp) are unavailable.'));
                }
            };

            try {
                window.initSendOTP(configuration);
                setTimeout(finish, 400);
            } catch (err) {
                clearTimeout(timeoutId);
                reject(err instanceof Error ? err : new Error('MSG91 init failed'));
            }
        });
    })();

    try {
        await widgetInitPromise;
    } catch (err) {
        widgetInitPromise = null;
        throw err;
    }
}

/** Send OTP to phone (country code without +, e.g. 919876543210). */
export async function sendMsg91Otp(phone) {
    const normalized = normalizeIndianPhone(phone);
    if (normalized.length < 12) {
        throw new Error('Enter a valid 10-digit mobile number');
    }

    await ensureMsg91Widget();

    if (!isMsg91CaptchaVerified()) {
        throw new Error('Please complete the security check (captcha) above before sending OTP.');
    }

    return new Promise((resolve, reject) => {
        window.sendOtp(
            normalized,
            (data) => {
                const reqId = extractMsg91ReqId(data);
                if (reqId) storeWidgetReqId(reqId);
                resolve(data);
            },
            (error) => {
                const message = typeof error === 'string'
                    ? error
                    : error?.message || 'Failed to send OTP';
                reject(new Error(message));
            },
        );
    });
}

/** Verify OTP entered by user; resolves with access token for server validation. */
export async function verifyMsg91Otp(otp) {
    const code = String(otp || '').replace(/\D/g, '');
    if (code.length < 4) {
        throw new Error('Enter the OTP sent to your phone');
    }

    await ensureMsg91Widget();

    const reqId = getStoredWidgetReqId();

    return new Promise((resolve, reject) => {
        const onSuccess = (data) => {
            const accessToken = extractMsg91AccessToken(data);
            if (!accessToken) {
                reject(new Error('OTP verified but no access token returned. Please try again.'));
                return;
            }
            storeWidgetAccessToken(accessToken);
            resolve({ ...data, accessToken });
        };

        const onFailure = (error) => {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Invalid or expired OTP';

            if (/already verif/i.test(message)) {
                const stored = getStoredWidgetAccessToken();
                if (stored) {
                    resolve({ accessToken: stored, alreadyVerified: true });
                    return;
                }
            }

            reject(new Error(message));
        };

        // MSG91 docs: verifyOtp(otp, success, failure, reqId?)
        if (reqId) {
            window.verifyOtp(code, onSuccess, onFailure, reqId);
        } else {
            window.verifyOtp(code, onSuccess, onFailure);
        }
    });
}

const WIDGET_TOKEN_KEY = 'krivea-msg91-access-token';
const WIDGET_REQ_ID_KEY = 'krivea-msg91-req-id';

export function storeWidgetReqId(reqId) {
    if (typeof window === 'undefined' || !reqId) return;
    try {
        sessionStorage.setItem(WIDGET_REQ_ID_KEY, reqId);
    } catch {
        /* ignore */
    }
}

export function getStoredWidgetReqId() {
    if (typeof window === 'undefined') return null;
    try {
        return sessionStorage.getItem(WIDGET_REQ_ID_KEY) || null;
    } catch {
        return null;
    }
}

export function clearStoredWidgetReqId() {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(WIDGET_REQ_ID_KEY);
    } catch {
        /* ignore */
    }
}

export function storeWidgetAccessToken(token) {
    if (typeof window === 'undefined' || !token) return;
    try {
        sessionStorage.setItem(WIDGET_TOKEN_KEY, token);
    } catch {
        /* ignore */
    }
}

export function getStoredWidgetAccessToken() {
    if (typeof window === 'undefined') return null;
    try {
        return sessionStorage.getItem(WIDGET_TOKEN_KEY) || null;
    } catch {
        return null;
    }
}

export function clearStoredWidgetAccessToken() {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(WIDGET_TOKEN_KEY);
        sessionStorage.removeItem(WIDGET_REQ_ID_KEY);
    } catch {
        /* ignore */
    }
}

/** Resend OTP (channel null = widget default). */
export async function retryMsg91Otp(channel = null) {
    await ensureMsg91Widget();

    if (!isMsg91CaptchaVerified()) {
        throw new Error('Please complete the security check (captcha) before resending.');
    }

    return new Promise((resolve, reject) => {
        const reqId = getStoredWidgetReqId();
        const onSuccess = (data) => {
            const newReqId = extractMsg91ReqId(data);
            if (newReqId) storeWidgetReqId(newReqId);
            resolve(data);
        };
        const onFailure = (error) => {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Could not resend OTP';
            reject(new Error(message));
        };

        // MSG91 docs: retryOtp(channel, success, failure, reqId?)
        if (reqId) {
            window.retryOtp(channel, onSuccess, onFailure, reqId);
        } else {
            window.retryOtp(channel, onSuccess, onFailure);
        }
    });
}

/** Reset widget so it can re-init (e.g. after OTP panel remount). */
export function resetMsg91Widget() {
    widgetInitPromise = null;
    if (typeof window !== 'undefined') {
        window.__kriveaMsg91Ready = false;
    }
}
