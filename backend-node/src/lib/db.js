import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let pool = null;
let uploadsDir = '';

/** Sets uploads dir only — pool connects lazily on first getPool() call. */
export function initDatabase(baseDir) {
    uploadsDir = path.join(baseDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
}

export function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.DB_PORT || 3306),
            database: process.env.DB_NAME || 'wellness_store',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            charset: 'utf8mb4',
            waitForConnections: true,
            connectionLimit: 10,
            decimalNumbers: true, // DECIMAL columns as JS numbers, not strings — matches PHP PDO's numeric casting behavior at the repository layer
            // Return DATETIME columns as raw strings instead of auto-converted JS
            // Date objects. mysql2's default Date conversion uses this PROCESS's
            // system timezone, which would make every timestamp in API responses
            // silently depend on the host machine's clock settings — never
            // correct here, since the stored values are naive (no tz info) and
            // every write path (toDbDatetime()) always stores them as UTC.
            // Repositories' toIso() parses the raw string as UTC explicitly, so
            // reads and writes agree deterministically regardless of host TZ.
            // (The PHP backend does NOT do this correctly — its read path uses
            // PHP's date.timezone ini setting, currently misconfigured to
            // Europe/Berlin — so PHP and Node timestamps will differ by that
            // offset until someone fixes backend/php.ini. See MIGRATION.md.)
            dateStrings: true,
        });
    }
    return pool;
}

export function uploadsDirPath() {
    return uploadsDir;
}

/** Same shape as Database::generateId() in PHP: prefix-<ms-epoch>-<6 hex chars>. */
export function generateId(prefix) {
    const ms = Date.now();
    const rand = crypto.randomBytes(4).toString('hex').slice(0, 6);
    return `${prefix}-${ms}-${rand}`;
}
