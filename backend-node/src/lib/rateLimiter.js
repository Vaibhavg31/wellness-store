import { getPool } from './db.js';

/** MySQL-backed rate limiter — same `rate_limits` table/logic as backend/lib/RateLimiter.php. */
export async function checkRateLimit(key, max = 5, windowSeconds = 900) {
    const pool = getPool();
    const now = Math.floor(Date.now() / 1000);

    const [rows] = await pool.query(
        'SELECT count, UNIX_TIMESTAMP(reset_at) AS reset_ts FROM rate_limits WHERE rate_key = ? LIMIT 1',
        [key],
    );
    const row = rows[0];

    if (!row || now > Number(row.reset_ts)) {
        const resetAt = new Date((now + windowSeconds) * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await pool.query(
            'INSERT INTO rate_limits (rate_key, count, reset_at) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE count = 1, reset_at = VALUES(reset_at)',
            [key, resetAt],
        );
        return true;
    }

    if (Number(row.count) >= max) return false;

    await pool.query('UPDATE rate_limits SET count = count + 1 WHERE rate_key = ?', [key]);
    return true;
}

export async function retryAfterSeconds(key) {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT UNIX_TIMESTAMP(reset_at) AS reset_ts FROM rate_limits WHERE rate_key = ? LIMIT 1',
            [key],
        );
        const row = rows[0];
        if (!row) return null;
        const remaining = Number(row.reset_ts) - Math.floor(Date.now() / 1000);
        return remaining > 0 ? remaining : null;
    } catch {
        return null;
    }
}
