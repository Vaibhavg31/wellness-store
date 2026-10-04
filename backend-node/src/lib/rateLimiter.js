import { getPool } from './db.js';

/**
 * MySQL-backed rate limiter (`rate_limits` table).
 *
 * All time comparisons use the database's own clock (NOW) so the result never depends on the Node process's
 * timezone or the MySQL session timezone — an earlier version mixed a UTC string from Node with
 * UNIX_TIMESTAMP() and silently never limited anything on servers not running in UTC.
 */
export async function checkRateLimit(key, max = 5, windowSeconds = 900) {
    const pool = getPool();

    const [rows] = await pool.query(
        'SELECT `count`, (reset_at > NOW(6)) AS active FROM rate_limits WHERE rate_key = ? LIMIT 1',
        [key],
    );
    const row = rows[0];

    if (!row || !Number(row.active)) {
        await pool.query(
            'INSERT INTO rate_limits (rate_key, `count`, reset_at) VALUES (?, 1, DATE_ADD(NOW(6), INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE `count` = 1, reset_at = VALUES(reset_at)',
            [key, Math.max(1, Math.floor(windowSeconds))],
        );
        return true;
    }

    if (Number(row.count) >= max) return false;

    await pool.query('UPDATE rate_limits SET `count` = `count` + 1 WHERE rate_key = ?', [key]);
    return true;
}

export async function retryAfterSeconds(key) {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT TIMESTAMPDIFF(SECOND, NOW(6), reset_at) AS remaining FROM rate_limits WHERE rate_key = ? LIMIT 1',
            [key],
        );
        const remaining = Number(rows[0]?.remaining);
        return remaining > 0 ? remaining : null;
    } catch {
        return null;
    }
}
