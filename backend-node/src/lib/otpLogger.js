import { getPool } from './db.js';

/** MySQL-backed OTP audit log — same `otp_logs` table as backend/lib/OtpLogger.php. */
export async function logOtp(action, entry = {}) {
    let pool;
    try {
        pool = getPool();
    } catch {
        return;
    }

    const response = entry.response !== undefined ? JSON.stringify(entry.response) : null;

    try {
        await pool.query(
            `INSERT INTO otp_logs
             (logged_at, action, phone, user_id, status, skip_verify, otp_mode,
              http_code, msg91_code, request_id, server_ip, detail, response)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                new Date().toISOString().slice(0, 23).replace('T', ' '),
                action,
                entry.phone ?? null,
                entry.userId ?? null,
                entry.status ?? null,
                entry.skipVerify !== undefined ? (entry.skipVerify ? 1 : 0) : null,
                entry.otpMode ?? null,
                entry.httpCode !== undefined ? Number(entry.httpCode) : null,
                entry.msg91Code ?? null,
                entry.requestId ?? null,
                entry.serverIp ?? null,
                entry.detail ?? null,
                response,
            ],
        );

        const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM otp_logs');
        if (count > 200) {
            await pool.query('DELETE FROM otp_logs ORDER BY id ASC LIMIT ?', [count - 200]);
        }
    } catch {
        // Non-critical
    }

    const phone = entry.phone ? maskPhone(String(entry.phone)) : '-';
    const status = String(entry.status ?? 'unknown');
    const detail = String(entry.detail ?? '');
    console.log(`[OTP] ${action} | phone=${phone} | status=${status}${detail ? ` | ${detail}` : ''}`);
}

export async function recentOtpLogs(limit = 50) {
    try {
        const pool = getPool();
        const cap = Math.max(1, Math.min(limit, 200));
        const [rows] = await pool.query('SELECT * FROM otp_logs ORDER BY id DESC LIMIT ?', [cap]);
        return rows.map((r) => ({
            at: r.logged_at,
            action: r.action,
            phone: r.phone,
            userId: r.user_id,
            status: r.status,
            skipVerify: r.skip_verify !== null ? Boolean(r.skip_verify) : null,
            otpMode: r.otp_mode,
            httpCode: r.http_code !== null ? Number(r.http_code) : null,
            msg91Code: r.msg91_code,
            requestId: r.request_id,
            serverIp: r.server_ip,
            detail: r.detail,
            response: r.response !== null ? JSON.parse(r.response) : null,
        }));
    } catch {
        return [];
    }
}

export function maskPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '****';
    return '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

let cachedOutboundIp;
export async function serverOutboundIp() {
    if (cachedOutboundIp !== undefined) return cachedOutboundIp || null;
    for (const endpoint of ['https://api4.ipify.org', 'https://api.ipify.org?format=text']) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(endpoint, { signal: controller.signal });
            clearTimeout(timer);
            const ip = (await res.text()).trim();
            if (/^[0-9a-fA-F:.]+$/.test(ip)) {
                cachedOutboundIp = ip;
                return ip;
            }
        } catch {
            // try next endpoint
        }
    }
    cachedOutboundIp = '';
    return null;
}
