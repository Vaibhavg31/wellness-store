import { httpRequest } from '../lib/httpClient.js';
import { logOtp, maskPhone } from '../lib/otpLogger.js';

/** MSG91 OTP — server-side send/verify + widget token validation. Mirrors backend/lib/Msg91Service.php. */
const OTP_SEND_BASE = 'https://control.msg91.com/api/v5/otp';
const OTP_VERIFY_BASE = 'https://control.msg91.com/api/v5/otp/verify';
const OTP_RETRY_BASE = 'https://control.msg91.com/api/v5/otp/retry';

const ERROR_HINTS = {
    418: 'MSG91 IP security is on and this server IP is not whitelisted. Open MSG91 Dashboard → Authkey → IP Security → add your server IP (see Failed Logs).',
    207: 'Invalid MSG91 auth key. Check MSG91_AUTH_KEY in config.json matches your dashboard Authkey.',
    202: 'Invalid mobile number format.',
    301: 'Insufficient MSG91 SMS balance. Top up your account.',
    311: 'Duplicate OTP request. Wait 10 seconds before resending.',
};

const authKey = () => String(process.env.MSG91_AUTH_KEY || process.env.MSG91_TOKEN_AUTH || '').trim();
const templateId = () => String(process.env.MSG91_OTP_TEMPLATE_ID || '').trim();

function normalizeMobile(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    return '91' + digits.slice(-10);
}

async function msgRequest(method, url, headers = [], body = null) {
    const result = await httpRequest(method, url, headers, body);
    if (!result.ok) return { ok: false, error: result.error || 'MSG91 network request failed', httpCode: result.httpCode };
    if (!result.body) return { ok: false, error: 'Empty response from MSG91', httpCode: result.httpCode };
    let data;
    try {
        data = JSON.parse(result.body);
    } catch {
        console.error(`[MSG91] Non-JSON response (HTTP ${result.httpCode}): ${String(result.body).slice(0, 500)}`);
        return { ok: false, error: `Unexpected response from MSG91 (HTTP ${result.httpCode})`, httpCode: result.httpCode };
    }
    return { ok: true, data, httpCode: result.httpCode };
}

function isSuccess(data, httpCode) {
    if (httpCode >= 400) return false;
    if (data.type === 'error') return false;
    const code = data.code ?? data.status ?? null;
    if (code !== null && !Number.isNaN(Number(code)) && Number(code) >= 400) return false;
    if (data.type === 'success') return true;
    const message = String(data.message || '').toLowerCase();
    if (message && (message.includes('fail') || message.includes('error') || message.includes('invalid'))) return false;
    return message.includes('success') || message.includes('sent') || message.includes('verified');
}

function errorMessage(data, httpCode, fallback) {
    const raw = String(data.message || data.error || data.errors || '');
    const code = data.code ?? data.status ?? httpCode;
    const numericCode = Number.isNaN(Number(code)) ? httpCode : Number(code);

    if (numericCode === 418 || httpCode === 418 || raw.toLowerCase().includes('418') || raw.toLowerCase().includes('whitelist')) {
        return ERROR_HINTS[418];
    }
    if (ERROR_HINTS[numericCode]) {
        return raw ? `${raw} (${ERROR_HINTS[numericCode]})` : ERROR_HINTS[numericCode];
    }
    if (raw) return raw;
    if (httpCode >= 400) return `${fallback} (HTTP ${httpCode})`;
    return fallback;
}

function requestIdOf(data) {
    const id = data.request_id ?? data.requestId ?? null;
    return typeof id === 'string' && id !== '' ? id : null;
}

const authHeaders = () => [`authkey: ${authKey()}`, 'Accept: application/json'];

export async function sendPhoneOtp(phone) {
    const mobile = normalizeMobile(phone);
    if (!authKey()) return { ok: false, error: 'MSG91 auth key is not configured in config.json' };
    if (!mobile) return { ok: false, error: 'Invalid mobile number' };
    if (!templateId()) return { ok: false, error: 'MSG91_OTP_TEMPLATE_ID is missing in config.json' };

    const query = new URLSearchParams({
        template_id: templateId(),
        mobile,
        otp_length: '6',
        otp_expiry: '10',
        realTimeResponse: '1',
    }).toString();

    const headers = [...authHeaders(), 'Content-Type: application/json'];
    const url = `${OTP_SEND_BASE}?${query}`;

    await logOtp('msg91_send_request', { phone, status: 'pending', detail: `template=${templateId().slice(0, 8)}… mobile=${maskPhone(mobile)}` });

    const result = await msgRequest('POST', url, headers, '{}');
    const httpCode = result.httpCode || 0;
    const data = result.data || {};

    if (!result.ok) {
        await logOtp('msg91_send_failed', { phone, status: 'network_error', httpCode, detail: result.error || 'network error' });
        return { ok: false, error: result.error || 'MSG91 request failed', httpCode };
    }

    const requestId = requestIdOf(data);
    const msg91Code = data.code ?? data.status ?? null;

    if (isSuccess(data, httpCode)) {
        await logOtp('msg91_send_ok', { phone, status: 'sent', httpCode, requestId, detail: `request_id=${requestId ?? 'n/a'}` });
        return { ok: true, requestId, httpCode };
    }

    const message = errorMessage(data, httpCode, 'Failed to send OTP');
    console.error(`[MSG91] sendPhoneOtp HTTP ${httpCode}: ${message} | ${JSON.stringify(data)}`);
    await logOtp('msg91_send_failed', { phone, status: 'msg91_error', httpCode, msg91Code, requestId, detail: message, response: data });

    return { ok: false, error: message, httpCode, msg91Code, requestId };
}

export async function verifyPhoneOtp(phone, otp) {
    const mobile = normalizeMobile(phone);
    const code = (otp || '').replace(/\D/g, '');
    if (!authKey()) return { ok: false, error: 'MSG91 auth key is not configured' };
    if (!mobile || code.length < 4) return { ok: false, error: 'Invalid mobile or OTP' };

    const query = new URLSearchParams({ mobile, otp: code }).toString();
    await logOtp('msg91_verify_request', { phone, status: 'pending', detail: `mobile=${maskPhone(mobile)}` });

    const result = await msgRequest('GET', `${OTP_VERIFY_BASE}?${query}`, authHeaders());
    const httpCode = result.httpCode || 0;
    const data = result.data || {};

    if (!result.ok) {
        await logOtp('msg91_verify_failed', { phone, status: 'network_error', httpCode, detail: result.error || 'network error' });
        return { ok: false, error: result.error || 'MSG91 verify request failed', httpCode };
    }

    if (isSuccess(data, httpCode)) {
        await logOtp('msg91_verify_ok', { phone, status: 'verified', httpCode });
        return { ok: true, httpCode };
    }

    const message = errorMessage(data, httpCode, 'Invalid or expired OTP');
    console.error(`[MSG91] verifyPhoneOtp HTTP ${httpCode}: ${message} | ${JSON.stringify(data)}`);
    const msg91Code = data.code ?? data.status ?? null;
    await logOtp('msg91_verify_failed', { phone, status: 'msg91_error', httpCode, msg91Code, detail: message, response: data });

    return { ok: false, error: message, httpCode, msg91Code };
}

export async function retryPhoneOtp(phone, retryType = 'text') {
    const mobile = normalizeMobile(phone);
    if (!authKey()) return { ok: false, error: 'MSG91 auth key is not configured' };
    if (!mobile) return { ok: false, error: 'Invalid mobile number' };

    const type = String(retryType).toLowerCase() === 'voice' ? 'voice' : 'text';
    const query = new URLSearchParams({ mobile, retrytype: type }).toString();
    await logOtp('msg91_retry_request', { phone, status: 'pending', detail: `retrytype=${type}` });

    const result = await msgRequest('GET', `${OTP_RETRY_BASE}?${query}`, authHeaders());
    const httpCode = result.httpCode || 0;
    const data = result.data || {};

    if (!result.ok) {
        await logOtp('msg91_retry_failed', { phone, status: 'network_error', httpCode, detail: result.error || 'network error' });
        return { ok: false, error: result.error || 'MSG91 retry request failed', httpCode };
    }

    if (isSuccess(data, httpCode)) {
        await logOtp('msg91_retry_ok', { phone, status: 'resent', httpCode });
        return { ok: true, httpCode };
    }

    const message = errorMessage(data, httpCode, 'Could not resend OTP');
    console.error(`[MSG91] retryPhoneOtp HTTP ${httpCode}: ${message} | ${JSON.stringify(data)}`);
    const msg91Code = data.code ?? data.status ?? null;
    await logOtp('msg91_retry_failed', { phone, status: 'msg91_error', httpCode, msg91Code, detail: message, response: data });

    return { ok: false, error: message, httpCode, msg91Code };
}

export async function verifyAccessToken(accessToken) {
    if (!authKey()) return { ok: false, error: 'MSG91 auth key is not configured' };
    const token = (accessToken || '').trim();
    if (!token) return { ok: false, error: 'Access token is missing' };

    await logOtp('msg91_verify_token_request', { status: 'pending', detail: `token=${token.slice(0, 12)}… len=${token.length}` });

    const widgetId = String(process.env.MSG91_WIDGET_ID || process.env.VITE_MSG91_WIDGET_ID || '').trim();

    const formFields = { authkey: authKey(), 'access-token': token };
    if (widgetId) formFields.widgetId = widgetId;
    const formBody = new URLSearchParams(formFields).toString();

    const jsonFields = { 'access-token': token };
    if (widgetId) jsonFields.widgetId = widgetId;

    const attempts = [
        { label: 'form_body', headers: ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'], body: formBody },
        { label: 'json_body', headers: [`authkey: ${authKey()}`, 'Content-Type: application/json', 'Accept: application/json'], body: JSON.stringify(jsonFields) },
    ];

    let lastError = 'Access token verification failed';
    let lastHttpCode = 0;
    let lastMsg91Code = null;

    for (const attempt of attempts) {
        const result = await msgRequest('POST', 'https://control.msg91.com/api/v5/widget/verifyAccessToken', attempt.headers, attempt.body);
        const httpCode = result.httpCode || 0;
        lastHttpCode = httpCode;
        const data = result.data || {};

        if (!result.ok) {
            lastError = result.error || 'MSG91 token verify request failed';
            continue;
        }

        if (isSuccess(data, httpCode)) {
            const identifier = typeof data.identifier === 'string' ? data.identifier : (typeof data.mobile === 'string' ? data.mobile : null);
            await logOtp('msg91_verify_token_ok', { status: 'verified', httpCode, detail: `${attempt.label}${identifier ? ` identifier=${maskPhone(identifier)}` : ''}` });
            return { ok: true, httpCode, identifier };
        }

        lastError = errorMessage(data, httpCode, 'Access token verification failed');
        lastMsg91Code = data.code ?? data.status ?? null;

        if (!lastError.toLowerCase().includes('access-token field is required')) break;
    }

    console.error(`[MSG91] verifyAccessToken HTTP ${lastHttpCode}: ${lastError}`);
    await logOtp('msg91_verify_token_failed', { status: 'msg91_error', httpCode: lastHttpCode, msg91Code: lastMsg91Code, detail: lastError });

    return { ok: false, error: lastError, httpCode: lastHttpCode, msg91Code: lastMsg91Code };
}
