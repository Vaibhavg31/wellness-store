/**
 * Applies the client's v1 feedback to a running store through its own admin API: the new homepage order, the top
 * ribbon, concerns, Trending now and so on. Safe to run again (it only sets values). Works the same on the local
 * test server and on the live site.
 *
 *   node scripts/seed-client-v1.mjs <base-url> <admin-email> <admin-password>
 *   e.g. node scripts/seed-client-v1.mjs http://127.0.0.1:8010 owner@example.com secret
 */
const [base = 'http://127.0.0.1:8010', email, password] = process.argv.slice(2);
if (!email || !password) {
    console.error('Usage: node scripts/seed-client-v1.mjs <base-url> <admin-email> <admin-password>');
    process.exit(1);
}

const call = async (method, path, body, token) => {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error || ''}`);
    return data;
};

const { token } = await call('POST', '/api/auth/login', { email, password });
if (!token) throw new Error('Admin sign-in failed');

const current = await call('GET', '/api/settings');

// Homepage order: banner, running feature ribbon, trending, the whole range by category, Watch & Shop, trust, reviews.
const ON = ['bannerSlider', 'brandMarquee', 'trending', 'categoryShelves', 'watchShop', 'whyChoose', 'reviews', 'newsletter', 'promoBanner'];
const OFF = ['hero', 'categories', 'dayRitual', 'bundles', 'routineBuilder', 'packExplorer', 'herbAtlas', 'doshaQuiz', 'banners', 'videoBanner', 'instagram'];
const sections = Object.fromEntries([...ON.map((k) => [k, true]), ...OFF.map((k) => [k, false])]);

const extras = {
    ...current.extras,
    nav: { ...current.extras.nav, mode: 'ribbon' },
};

await call('PUT', '/api/settings', {
    theme: { ...current.theme, backgroundColor: '#F4EBDD' },
    sections,
    extras,
}, token);

console.log('Client v1 settings applied to', base);
