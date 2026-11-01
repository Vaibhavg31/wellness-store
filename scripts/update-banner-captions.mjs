/**
 * Sets the homepage slide wording to match the brand photographs now used as slides 1 and 3 (the first words were written for
 * the earlier product drawings). Only a slide that still carries its original starter wording is changed, so a caption the
 * shop owner has written is never overwritten. Safe to run again.
 *
 * Usage: node scripts/update-banner-captions.mjs <base-url> <admin-email> <admin-password>
 */
const [base, email, password] = process.argv.slice(2);
if (!base || !email || !password) {
    console.error('Usage: node scripts/update-banner-captions.mjs <base-url> <admin-email> <admin-password>');
    process.exit(1);
}
async function call(method, path, body, token) {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${data.error ?? ''}`);
    return data;
}

const CHANGES = [
    { id: 'banner-1', was: 'Immunity Season Sale', next: { title: 'Thoughtfully crafted for a healthier, happier you', subtitle: 'Rooted in Ayurveda', ctaLabel: 'Shop now', ctaHref: '/shop' } },
    { id: 'banner-art-3', was: 'Hair & Skin Glow Rituals', next: { title: 'Gathered, ground and made with care', subtitle: 'The story behind every bottle', ctaLabel: 'Our story', ctaHref: '/about' } },
];

const login = await call('POST', '/api/auth/login', { email, password });
if (login.role !== 'admin') throw new Error('That login is not an admin');
const banners = await call('GET', '/api/banners/admin/all', null, login.token);
for (const c of CHANGES) {
    const banner = banners.find((b) => b.id === c.id);
    if (!banner) { console.log(`  not found: ${c.id}`); continue; }
    if (banner.title !== c.was) { console.log(`  kept (already edited): ${banner.title}`); continue; }
    await call('PUT', `/api/banners/${c.id}`, c.next, login.token);
    console.log(`  updated: ${c.was} → ${c.next.title}`);
}
