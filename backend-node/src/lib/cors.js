/** Mirrors backend/lib/Cors.php's allowed-origins list exactly. */
export function corsMiddleware(req, res, next) {
    const allowed = ['http://localhost:5173', 'http://localhost:4173', process.env.FRONTEND_URL].filter(Boolean);
    const origin = req.headers.origin || '';

    if (allowed.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Access-Control-Allow-Credentials', 'true');
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
}
