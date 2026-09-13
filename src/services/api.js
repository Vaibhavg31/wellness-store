const API_BASE = import.meta.env.VITE_API_URL || '';

/** Called on 401 when a token was sent — keeps UI in sync with expired sessions. */
let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

class ApiError extends Error {
    status;
    code;
    email;
    constructor(message, status, extra = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = extra.code;
        this.email = extra.email;
    }
}

/**
 * In-flight GET requests keyed by `${path}::${token}`, so simultaneous callers
 * (e.g. multiple components fetching /api/categories on the same page load)
 * share one network request instead of each firing their own.
 */
const inFlightGets = new Map();

async function doFetch(path, options, token) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
        throw new ApiError(
            'Cannot reach the API server. Stop the app and run: npm run dev',
            0,
        );
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        const message = body.error || res.statusText || 'Request failed';
        if (res.status === 401 && token && onUnauthorized) {
            onUnauthorized();
        }
        const isGenericGatewayError =
            (res.status === 502 || message === 'Bad Gateway')
            && (!body.error || body.error === 'Bad Gateway' || body.error === res.statusText);
        if (isGenericGatewayError) {
            throw new ApiError(
                'API server is not running. Stop the app (Ctrl+C) and run: npm run dev',
                502,
            );
        }
        throw new ApiError(message, res.status, body);
    }
    return res.json();
}

async function request(path, options = {}, token) {
    const isGet = !options.method || options.method === 'GET';
    if (!isGet) {
        return doFetch(path, options, token);
    }

    const key = `${path}::${token || ''}`;
    const pending = inFlightGets.get(key);
    if (pending) return pending;

    const promise = doFetch(path, options, token).finally(() => {
        inFlightGets.delete(key);
    });
    inFlightGets.set(key, promise);
    return promise;
}

async function download(path, token, filename) {
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, { headers });
    } catch {
        throw new ApiError(
            'Cannot reach the API server. Stop the app and run: npm run dev',
            0,
        );
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        if (res.status === 401 && token && onUnauthorized) {
            onUnauthorized();
        }
        throw new ApiError(body.error || res.statusText || 'Download failed', res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export const api = {
    get: (path, token) => request(path, {}, token),
    post: (path, body, token) => request(path, { method: 'POST', body: JSON.stringify(body) }, token),
    put: (path, body, token) => request(path, { method: 'PUT', body: JSON.stringify(body) }, token),
    delete: (path, token) => request(path, { method: 'DELETE' }, token),
    download,
    upload: async (files, token) => {
        const formData = new FormData();
        files.forEach((f) => formData.append('images', f));
        let res;
        try {
            res = await fetch(`${API_BASE}/api/upload/multiple`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
        } catch {
            throw new ApiError(
                'Cannot reach the API server. Stop the app and run: npm run dev',
                0,
            );
        }
        if (!res.ok) {
            const body = await res.json().catch(() => ({ error: res.statusText }));
            if (res.status === 401 && token && onUnauthorized) {
                onUnauthorized();
            }
            throw new ApiError(body.error || 'Upload failed', res.status);
        }
        const data = await res.json();
        return data.urls;
    },
    uploadVideo: async (file, token) => {
        const formData = new FormData();
        formData.append('video', file);
        let res;
        try {
            res = await fetch(`${API_BASE}/api/upload/video`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
        } catch {
            throw new ApiError(
                'Cannot reach the API server. Stop the app and run: npm run dev',
                0,
            );
        }
        if (!res.ok) {
            const body = await res.json().catch(() => ({ error: res.statusText }));
            if (res.status === 401 && token && onUnauthorized) {
                onUnauthorized();
            }
            throw new ApiError(body.error || 'Video upload failed', res.status);
        }
        const data = await res.json();
        return data.url;
    },
};

export function imageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http'))
        return path;
    return `${API_BASE}${path}`;
}

export { ApiError };
