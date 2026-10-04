/**
 * Thin wrapper around global fetch (Node 18+) returning the same shape as
 * backend/lib/HttpClient.php's request() — lets ported services stay close
 * to their PHP source instead of being rewritten around fetch's own API.
 */
export async function httpRequest(method, url, headers = [], body = null, timeoutMs = 20000) {
    const headerObj = {};
    for (const h of headers) {
        const idx = h.indexOf(':');
        if (idx === -1) continue;
        headerObj[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: method.toUpperCase(),
            headers: headerObj,
            body: method.toUpperCase() === 'GET' ? undefined : (body ?? undefined),
            signal: controller.signal,
        });
        const text = await res.text();
        return { ok: true, body: text, httpCode: res.status };
    } catch (err) {
        return { ok: false, body: false, httpCode: 0, error: err?.message || 'HTTP request failed' };
    } finally {
        clearTimeout(timer);
    }
}
