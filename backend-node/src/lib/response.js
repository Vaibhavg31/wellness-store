/**
 * Response helpers mirroring backend/lib/Response.php's shape so ported
 * routes read the same way: sendError(res, 'message', 400) etc.
 */

export function sendJson(res, data, status = 200, cacheSeconds = 0) {
    if (cacheSeconds > 0) {
        res.set('Cache-Control', `public, max-age=${cacheSeconds}`);
    }
    res.status(status).json(data);
}

export function sendError(res, message, status = 400) {
    res.status(status).json({ error: message });
}

/** Stream a CSV file download — same column order/BOM-for-Excel behavior as Response::csv(). */
export function sendCsv(res, filename, headers, rows) {
    res.status(200);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);

    const escape = (val) => {
        const s = val === null || val === undefined ? '' : String(val);
        if (/[",\n\r]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const lines = [headers, ...rows].map((row) => row.map(escape).join(','));
    const bom = '﻿';
    res.send(bom + lines.join('\r\n'));
}

/**
 * Wraps an async Express route handler so a thrown error becomes a generic
 * 500 instead of crashing the process — mirrors every PHP route's own
 * try { ... } catch (\Exception) { Response::error(...); } pattern, without
 * needing that try/catch repeated in every handler.
 */
export function asyncRoute(handler, fallbackMessage = 'Something went wrong') {
    return async (req, res) => {
        try {
            await handler(req, res);
        } catch (err) {
            if (err?.statusCode) {
                sendError(res, err.message, err.statusCode);
                return;
            }
            console.error(err);
            sendError(res, fallbackMessage, 500);
        }
    };
}

/** Thrown by route/service code to produce a specific status+message via asyncRoute's catch. */
export class HttpError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
