/* Scene library for the placeholder product pictures. Every pack is an original Chikit-branded design drawn with SVG + CSS, shown
   as a calm packshot (clean paper) or on the client's stone podium photograph. Real product photography replaces all of it. */

/* ---------- colour helpers ---------- */
const h2r = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const r2h = (a) => `#${a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => { const A = h2r(a); const B = h2r(b); return r2h(A.map((v, i) => v + (B[i] - v) * t)); };
const lighten = (c, t) => mix(c, '#ffffff', t);
const darken = (c, t) => mix(c, '#000000', t);
let uid = 0;
const gid = () => `g${++uid}`;

/* ---------- icons (24px, stroke) ---------- */
const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
    leaf: ico('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>'),
    drop: ico('<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>'),
    shield: ico('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    heart: ico('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
    zap: ico('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
    sparkle: ico('<path d="M9.94 14.06 8 20l-1.94-5.94L0 12l6.06-2.06L8 4l1.94 5.94L16 12z" transform="translate(4 0)"/><path d="M20 3v4M22 5h-4"/>'),
    sun: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/>'),
    check: ico('<path d="M20 6 9 17l-5-5"/>'),
    flame: ico('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
    muscle: ico('<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>'),
    gut: ico('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>'),
};

/* ---------- products ---------- */
export const PRODUCTS = {
    aloe: { id: 'ws-aloevera-juice-001', kind: 'bottle', liquid: '#A8CF55', cap: '#2F6B34', accent: '#3F7D2E', tint: '#E7F2D8', bg: ['#E9F3DC', '#CFE5B6'], l1: 'Aloe Vera', l2: 'Digestive Juice', sub: 'Cold-pressed · with pulp', claim: 'No added sugar', net: '1 L', icon: 'leaf',
        benefits: [['gut', 'Supports healthy digestion'], ['drop', 'Soothes the gut, naturally'], ['leaf', '100% aloe, cold-pressed'], ['shield', 'Lab tested, FSSAI licensed']] },
    biotin: { id: 'ws-biotin-001', kind: 'jar', jar: '#FFF6F3', cap: '#C2456A', accent: '#C2456A', tint: '#FBE3EA', bg: ['#FCE9EE', '#F6CCD8'], l1: 'Biotin', l2: 'Hair, Skin & Nails', sub: 'Strawberry gummies · 60 ct', claim: 'Sugar-light', net: '60 gummies', icon: 'sparkle',
        benefits: [['sparkle', 'Supports hair, skin and nails'], ['heart', 'Tasty strawberry gummies'], ['leaf', 'Vegetarian, no gelatin'], ['shield', 'Third-party lab tested']] },
    facewash: { id: 'ws-facewash-001', kind: 'tube', tube: '#FFFDF8', cap: '#2E7D5B', accent: '#2E7D5B', tint: '#DDF0E6', bg: ['#E2F1E8', '#BFE0CD'], l1: 'Neem & Tea Tree', l2: 'Face Wash', sub: 'Sulphate-free · Gentle daily cleanse', claim: 'Soap-free', net: '100 ml', icon: 'drop',
        benefits: [['drop', 'Deep, gentle cleansing'], ['leaf', 'Neem + tea tree oil'], ['shield', 'Sulphate and paraben free'], ['sparkle', 'Clear, fresh-feeling skin']] },
    fatburner: { id: 'ws-fatburner-001', kind: 'jar', jar: '#F4F1E6', cap: '#3C5A2B', accent: '#4E7A32', tint: '#E4EED6', bg: ['#EFEBDD', '#DCD3BB'], l1: 'Green Coffee', l2: 'Weight Support', sub: 'Capsules with garcinia', claim: 'Plant-based', net: '60 capsules', icon: 'flame',
        benefits: [['flame', 'Supports healthy metabolism'], ['leaf', 'Green coffee bean extract'], ['zap', 'Steady daily energy'], ['shield', 'Vegetarian capsules']] },
    hairoil: { id: 'ws-hairoil-001', kind: 'oil', amber: '#B5651D', cap: '#241720', accent: '#8A5A1E', tint: '#F7E6CD', bg: ['#F8E9D2', '#EBCB9C'], l1: 'Onion Black Seed', l2: 'Hair Oil', sub: 'Cold-infused with Bhringraj', claim: 'No mineral oil', net: '200 ml', icon: 'drop',
        benefits: [['drop', 'Nourishes scalp and roots'], ['leaf', 'Onion, black seed, bhringraj'], ['heart', 'Reduces dryness and frizz'], ['shield', 'No mineral oil or silicone']] },
    immunity: { id: 'ws-immunity-001', kind: 'bottle', liquid: '#F2A03D', cap: '#B5651D', accent: '#C0651A', tint: '#FCE8CE', bg: ['#FDEBD2', '#F7CD92'], l1: 'Immunity', l2: 'Booster Juice', sub: 'Amla · Giloy · Tulsi', claim: 'Daily shield', net: '1 L', icon: 'shield',
        benefits: [['shield', 'Everyday immunity support'], ['leaf', 'Amla, giloy and tulsi'], ['sun', 'Rich in natural vitamin C'], ['check', 'No added sugar or colour']] },
    multivitamin: { id: 'ws-multivitamin-001', kind: 'jar', jar: '#FFF8E6', cap: '#E39B1B', accent: '#C27F0B', tint: '#FDEFC9', bg: ['#FFF1C9', '#F9DD8D'], l1: 'Daily Multi', l2: 'Vitamin Gummies', sub: 'Orange burst · 60 ct', claim: 'Vitamins A-Z', net: '60 gummies', icon: 'sun',
        benefits: [['sun', '25+ vitamins and minerals'], ['zap', 'Daily energy and focus'], ['heart', 'Delicious orange gummies'], ['shield', 'Vegetarian and gluten free']] },
    protein: { id: 'ws-protein-001', kind: 'tub', jar: '#FFF9F1', cap: '#431A43', accent: '#602460', tint: '#F1E4F2', bg: ['#F3E8F4', '#DCC5DE'], l1: 'Plant Protein', l2: 'Isolate', sub: 'Pea + brown rice · Cocoa', claim: '24 g protein', net: '1 kg', icon: 'muscle',
        benefits: [['muscle', '24 g plant protein per scoop'], ['leaf', 'Pea and brown rice blend'], ['check', 'Zero added sugar'], ['shield', 'Lab tested for purity']] },
    greens: { id: 'ws-superfood-greens-001', kind: 'pouch', pouch: '#5B8F3A', accent: '#3F7D2E', tint: '#E7F2D8', bg: ['#E3F0D3', '#BCD9A0'], l1: 'Daily Greens', l2: 'Superfood Blend', sub: 'Moringa · Spirulina · Wheatgrass', claim: '30 servings', net: '300 g', icon: 'leaf',
        benefits: [['leaf', '20+ greens and superfoods'], ['zap', 'Natural everyday energy'], ['gut', 'Gut-friendly fibre'], ['check', 'No artificial flavours']] },
    triphala: { id: 'ws-triphala-001', kind: 'jar', jar: '#9A5B31', cap: '#4A2A15', accent: '#8A4B22', tint: '#F4E1D0', bg: ['#F4E6D6', '#E2C4A4'], l1: 'Triphala', l2: 'Digestive Tablets', sub: 'Amalaki · Bibhitaki · Haritaki', claim: 'Classical formula', net: '90 tablets', icon: 'gut',
        benefits: [['gut', 'Supports regular digestion'], ['leaf', 'Classical three-fruit blend'], ['heart', 'Gentle, daily use'], ['shield', 'Ayurvedic, lab tested']] },
};

/* The first drawings were saturated; muted here so no pack looks like a candy-coloured sticker. */
const gray = (c) => { const [r, g, b] = h2r(c); const l = 0.3 * r + 0.59 * g + 0.11 * b; return r2h([l, l, l]); };
const muted = (c, t = 0.4) => mix(c, gray(c), t);
for (const P of Object.values(PRODUCTS)) for (const k of ['liquid', 'cap', 'jar', 'accent', 'tint', 'pouch', 'tube', 'amber']) if (P[k] && !/^#F[0-9A-F]{5}$/i.test(P[k])) P[k] = muted(P[k]);

/* ---------- pack drawing ---------- */
function labelHtml(P, opts = {}) {
    const { icon = true, band = true, bg = '#FFFDF8' } = opts;
    return `<div class="label" style="background:${bg};--a:${P.accent};--t:${P.tint}">
      <img src="/brand/chikit-logo.webp" alt="" />
      <div class="nm"><span class="l1">${P.l1}</span><span class="l2">${P.l2}</span><span class="sb">${P.sub}</span></div>
      ${icon ? `<div class="ic">${ICON[P.icon]}</div>` : '<div></div>'}
      ${band ? `<div class="bd"><span>${P.claim}</span><span>·</span><span>${P.net}</span></div>` : ''}
    </div>`;
}

function cyl(id, base, dark = 0.4) {
    return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${darken(base, dark)}"/><stop offset=".09" stop-color="${darken(base, 0.14)}"/>
      <stop offset=".26" stop-color="${lighten(base, 0.32)}"/><stop offset=".48" stop-color="${base}"/>
      <stop offset=".82" stop-color="${darken(base, 0.16)}"/><stop offset="1" stop-color="${darken(base, dark + 0.04)}"/></linearGradient>`;
}
const ridges = (id) => `<pattern id="${id}" width="3.4" height="10" patternUnits="userSpaceOnUse"><rect width="1.3" height="10" fill="rgba(0,0,0,.2)"/></pattern>`;
const sheen = (x, y, w, h, o = 0.42) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="#fff" opacity="${(o * 0.6).toFixed(2)}" style="filter:blur(.8px)"/>`;

/** Returns { html, h } for a pack of width w, horizontally centred on x with its base `bottom` px above the scene floor. */
export function pack(P, w, x, bottom, { shadow = true, rot = 0 } = {}) {
    const g = gid();
    const k = P.kind;
    let vbH; let svg; let lbl; let lblBox;
    if (k === 'bottle') {
        vbH = 250;
        svg = `<defs>${cyl(`${g}b`, P.liquid)}${cyl(`${g}c`, P.cap, 0.45)}${ridges(`${g}r`)}</defs>
          <path d="M33,22 L33,38 C33,54 0,58 0,88 L0,232 Q0,248 16,248 L84,248 Q100,248 100,232 L100,88 C100,58 67,54 67,38 L67,22 Z" fill="url(#${g}b)"/>
          <path d="M33,22 L33,38 C33,54 0,58 0,88 L0,232 Q0,248 16,248 L84,248 Q100,248 100,232 L100,88 C100,58 67,54 67,38 L67,22 Z" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.28)" stroke-width=".8"/>
          <ellipse cx="50" cy="63" rx="30" ry="5" fill="rgba(255,255,255,.25)"/>
          ${sheen(7, 82, 4.2, 150)}${sheen(88, 96, 2.2, 120, 0.18)}
          <rect x="29" y="0" width="42" height="21" rx="3.5" fill="url(#${g}c)"/><rect x="29" y="0" width="42" height="21" rx="3.5" fill="url(#${g}r)"/>
          <rect x="30" y="20" width="40" height="5" rx="1.5" fill="${darken(P.cap, 0.3)}"/>`;
        lblBox = [0, 96, 100, 118];
    } else if (k === 'jar') {
        vbH = 118;
        svg = `<defs>${cyl(`${g}b`, P.jar, 0.32)}${cyl(`${g}c`, P.cap, 0.45)}${ridges(`${g}r`)}</defs>
          <path d="M2,26 L98,26 L98,108 Q98,118 88,118 L12,118 Q2,118 2,108 Z" fill="url(#${g}b)"/>
          ${sheen(8, 34, 3.6, 76, 0.4)}
          <rect x="0" y="2" width="100" height="25" rx="5" fill="url(#${g}c)"/><rect x="0" y="2" width="100" height="25" rx="5" fill="url(#${g}r)"/>
          <rect x="2" y="25" width="96" height="3" fill="rgba(0,0,0,.28)"/>`;
        lblBox = [2, 36, 96, 70];
    } else if (k === 'tub') {
        vbH = 118;
        svg = `<defs>${cyl(`${g}b`, P.jar, 0.3)}${cyl(`${g}c`, P.cap, 0.5)}${ridges(`${g}r`)}</defs>
          <path d="M3,24 L97,24 L100,110 Q100,118 92,118 L8,118 Q0,118 0,110 Z" fill="url(#${g}b)"/>
          <rect x="0" y="0" width="100" height="26" rx="6" fill="url(#${g}c)"/><rect x="0" y="0" width="100" height="26" rx="6" fill="url(#${g}r)"/>
          <rect x="3" y="24" width="94" height="3.2" fill="rgba(0,0,0,.3)"/>`;
        lblBox = [1, 31, 98, 79];
    } else if (k === 'tube') {
        vbH = 270;
        svg = `<defs>${cyl(`${g}b`, P.tube, 0.2)}${cyl(`${g}c`, P.cap, 0.45)}
          <pattern id="${g}s" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1.2" fill="rgba(0,0,0,.18)"/></pattern></defs>
          <path d="M22,240 L8,216 L4,198 L4,22 L96,22 L96,198 L92,216 L78,240 Z" fill="url(#${g}b)"/>
          <rect x="4" y="4" width="92" height="20" fill="url(#${g}b)"/><rect x="4" y="4" width="92" height="20" fill="url(#${g}s)"/>
          <rect x="4" y="22" width="92" height="1.6" fill="rgba(0,0,0,.16)"/>
          <rect x="22" y="238" width="56" height="32" rx="5" fill="url(#${g}c)"/>
          ${sheen(9, 40, 3.4, 150, 0.45)}`;
        lblBox = [4, 34, 92, 170];
    } else if (k === 'pouch') {
        vbH = 150;
        svg = `<defs>${cyl(`${g}b`, P.pouch, 0.38)}<pattern id="${g}s" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1.1" fill="rgba(0,0,0,.14)"/></pattern></defs>
          <path d="M3,0 L97,0 L100,16 C104,70 103,118 99,134 Q97,148 84,150 L16,150 Q3,148 1,134 C-3,118 -4,70 0,16 Z" fill="url(#${g}b)"/>
          <rect x="3" y="0" width="94" height="9" fill="rgba(255,255,255,.18)"/><rect x="3" y="0" width="94" height="9" fill="url(#${g}s)"/>
          <rect x="1" y="14" width="98" height="1.6" fill="rgba(0,0,0,.22)"/><rect x="1" y="15.6" width="98" height="1" fill="rgba(255,255,255,.35)"/>
          <path d="M14,22 L22,22 L16,140 L9,138 Z" fill="rgba(255,255,255,.2)"/><path d="M84,24 L90,24 L94,132 L88,134 Z" fill="rgba(0,0,0,.1)"/>
          <path d="M30,20 L33,20 L26,146 L23,146 Z" fill="rgba(255,255,255,.1)"/>`;
        lblBox = [10, 34, 80, 90];
    } else if (k === 'oil') {
        vbH = 230;
        svg = `<defs>${cyl(`${g}b`, P.amber, 0.5)}${cyl(`${g}c`, '#2A2A2A', 0.5)}${ridges(`${g}r`)}</defs>
          <path d="M34,46 L34,56 C34,70 4,72 4,96 L4,214 Q4,228 18,228 L82,228 Q96,228 96,214 L96,96 C96,72 66,70 66,56 L66,46 Z" fill="url(#${g}b)"/>
          <path d="M34,46 L34,56 C34,70 4,72 4,96 L4,214 Q4,228 18,228 L82,228 Q96,228 96,214 L96,96 C96,72 66,70 66,56 L66,46 Z" fill="none" stroke="rgba(255,235,200,.3)" stroke-width=".8"/>
          ${sheen(10, 92, 4, 120, 0.38)}
          <rect x="46" y="14" width="8" height="18" fill="#1A1A1A"/>
          <path d="M28,2 L72,2 Q76,2 76,6 L76,10 Q76,14 72,14 L28,14 Q24,14 24,10 L24,6 Q24,2 28,2Z" fill="url(#${g}c)"/>
          <path d="M72,5 L94,5 L94,11 L72,11 Z" fill="#1E1E1E"/>
          <rect x="32" y="30" width="36" height="18" rx="2" fill="url(#${g}c)"/><rect x="32" y="30" width="36" height="18" rx="2" fill="url(#${g}r)"/>`;
        lblBox = [4, 104, 92, 100];
    } else if (k === 'carton') {
        vbH = 150;
        svg = `<defs><linearGradient id="${g}f" x1="0" x2="1"><stop offset="0" stop-color="#F2EBDD"/><stop offset=".3" stop-color="#FFFEFA"/><stop offset=".85" stop-color="#F4EEE2"/><stop offset="1" stop-color="#DDD3BF"/></linearGradient></defs>
          <rect x="0" y="0" width="100" height="150" rx="1.5" fill="url(#${g}f)"/><rect x="92" y="0" width="8" height="150" fill="rgba(60,30,10,.12)"/>`;
        lblBox = [0, 0, 92, 150];
    }
    lbl = labelHtml(P, { bg: k === 'tube' ? P.tube : k === 'carton' ? 'transparent' : '#FFFDF8', band: k !== 'oil' && k !== 'pouch' ? true : true });
    const H = k === 'tube' ? w * 2.2 : (w * vbH) / 100;
    const [lx, ly, lw, lh] = lblBox;
    const radius = k === 'pouch' ? 'border-radius:6%/3%;box-shadow:0 0 0 .6px rgba(0,0,0,.08);' : k === 'jar' || k === 'tub' ? 'border-radius:1.2% / 2.5%;' : '';
    const html = `<div class="pk" style="left:${x}px;bottom:${bottom}px;width:${w}px;height:${H}px;${rot ? `transform:translateX(-50%) rotate(${rot}deg);transform-origin:50% 100%;` : ''}">
      <svg viewBox="0 0 100 ${vbH}" preserveAspectRatio="none">${svg}</svg>
      <div class="lw" style="left:${lx}%;top:${(ly / vbH) * 100}%;width:${lw}%;height:${(lh / vbH) * 100}%;${radius}">${lbl}</div></div>`;
    const sh = shadow ? `<div class="shadow" style="left:${x}px;bottom:${bottom - w * 0.07}px;width:${w * 1.3}px;height:${w * 0.2}px"></div><div class="shadow tight" style="left:${x}px;bottom:${bottom - w * 0.02}px;width:${w * 0.96}px;height:${w * 0.06}px"></div>` : '';
    return { html: sh + html, h: H };
}

/* ---------- scene chrome ---------- */
const abs = (style, inner = '') => `<div class="abs" style="${style}">${inner}</div>`;
const scene = (w, h, body) => `<div class="scene" id="scene" style="width:${w}px;height:${h}px">${body}</div>`;

/**
 * The clean packshot: seamless warm-white paper lit softly from above, a barely visible table edge, no colour props.
 * Calm on purpose: the pack is the only thing in the picture.
 */
function studio(w, h, _colors, { floor = 0.15 } = {}) {
    const fy = h * floor;
    return abs('inset:0;background:radial-gradient(120% 90% at 46% 28%,#FFFDF9 0,#F8F2E9 55%,#EDE3D4 100%)')
        + abs(`left:0;right:0;bottom:0;height:${fy}px;background:linear-gradient(180deg,#F0E7DA,#E6DAC8)`)
        + abs(`left:0;right:0;bottom:${fy}px;height:${h * 0.07}px;background:linear-gradient(0deg,rgba(90,60,30,.05),rgba(90,60,30,0))`)
        + abs(`left:0;right:0;bottom:${fy - 1}px;height:1px;background:rgba(120,95,60,.18)`);
}

/**
 * The client's own photograph of a stone podium in warm light (public/brand/photos/podium.webp) as a stage. The photograph's
 * stone top sits at 40-53% of its height, so a pack's base goes at `base` (0.5 by default) of the scene height.
 */
const PODIUM = '/brand/photos/podium.webp';
function podiumStage(W, H, { x = '62%' } = {}) {
    return abs(`inset:0;background:#EBD9BF url(${PODIUM}) ${x} 50%/auto 100% no-repeat`)
        + abs('inset:0;background:linear-gradient(180deg,rgba(255,235,205,.10),rgba(120,70,20,.05))')
        + abs('inset:0;box-shadow:inset 0 0 160px rgba(90,50,20,.14)');
}

const PACK_W = { bottle: 275, jar: 480, tub: 530, tube: 310, pouch: 410, oil: 285, carton: 0 };
const RATIO = { bottle: 2.5, jar: 1.18, tub: 1.18, tube: 2.2, pouch: 1.5, oil: 2.3, carton: 1.5 };
/** Width that gives a pack the height `h`. */
const widthForHeight = (P, h) => Math.min(PACK_W[P.kind] * 1.4, h / RATIO[P.kind]);

/** A set of packs standing on a surface: [key, height, x as a fraction of the width] from left to right. */
function standing(items, W, bottom) {
    return items.map(([k, h, fx]) => {
        const P = PRODUCTS[k];
        let out = pack(P, widthForHeight(P, h), W * fx, bottom).html;
        if (P.kind === 'oil') out += pack({ ...P, kind: 'carton' }, widthForHeight(P, h) * 0.8, W * fx + widthForHeight(P, h) * 0.95, bottom).html;
        return out;
    }).join('');
}

/* ---------- product pictures (900x1125: key content stays inside the central square so 1:1 crops stay good) ---------- */
export function productFront(key) {
    const W = 900; const H = 1125; const floor = 0.16;
    const P = PRODUCTS[key];
    let body = studio(W, H, null, { floor });
    const w = PACK_W[P.kind];
    body += pack(P, w, W / 2 + (P.kind === 'oil' ? -125 : 0), H * floor - 6).html;
    if (P.kind === 'oil') body += pack({ ...P, kind: 'carton' }, 225, W / 2 + 175, H * floor - 6).html;
    return scene(W, H, body);
}

/** The second picture of each product: the pack on the stone podium. */
export function productStyled(key) {
    const W = 900; const H = 1125;
    const P = PRODUCTS[key];
    const h = P.kind === 'jar' || P.kind === 'tub' ? 330 : P.kind === 'pouch' ? 400 : 450;
    let body = podiumStage(W, H, { x: '54%' });
    body += standing([[key, h, 0.5]], W, H * 0.535);
    return scene(W, H, `<div class="warm" style="position:absolute;inset:0">${body}</div>`);
}

/* ---------- category tiles (square): calm packshots, no props ---------- */
const CATS = {
    protein: [['greens', 290, 0.7], ['protein', 400, 0.36]],
    immunity: [['immunity', 240, 0.36], ['immunity', 210, 0.7]],
    'weight-management': [['fatburner', 450, 0.5]],
    vitamins: [['multivitamin', 340, 0.3], ['biotin', 340, 0.7]],
    'personal-care': [['facewash', 200, 0.2], ['hairoil', 215, 0.5], ['facewash', 160, 0.82]],
    'digestive-health': [['aloe', 200, 0.27], ['triphala', 360, 0.68]],
    superfoods: [['greens', 450, 0.5]],
};
export function categoryTile(slug) {
    const W = 800; const H = 800; const floor = 0.14;
    let body = studio(W, H, null, { floor });
    CATS[slug].forEach(([k, w, fx]) => { body += pack(PRODUCTS[k], w, W * fx, H * floor - 4).html; });
    return scene(W, H, body);
}

/* ---------- banners, promos and tiles with packs on the stone podium ---------- */
function onPodium(W, H, items, { x = '62%', base = 0.455 } = {}) {
    // class 'warm': the packs take on the photograph's warm light, and their shadows darken the stone instead of covering it
    return scene(W, H, `<div class="warm" style="position:absolute;inset:0">${podiumStage(W, H, { x })}${standing(items, W, H * (1 - base))}</div>`);
}
export const bannerPodiumWide = () => onPodium(1920, 720, [['protein', 170, 0.6], ['greens', 215, 0.735], ['aloe', 255, 0.86]], { x: '70%' });
export const bannerPodiumMobile = () => onPodium(900, 1125, [['protein', 250, 0.24], ['greens', 330, 0.52], ['aloe', 400, 0.8]], { x: '60%' });
export const promo = (n) => (n === 0
    ? onPodium(1200, 750, [['aloe', 280, 0.58], ['triphala', 190, 0.8]], { x: '66%' })
    : onPodium(1200, 750, [['protein', 210, 0.58], ['hairoil', 280, 0.8]], { x: '40%' }));
export const certified = () => onPodium(1050, 700, [['triphala', 160, 0.3], ['protein', 200, 0.52], ['aloe', 260, 0.76]], { x: '58%' });
export function insta(n) {
    const W = 800; const H = 800;
    const defs = [
        null, null, null,
        () => onPodium(W, H, [['immunity', 360, 0.5]], { x: '56%' }),
        () => onPodium(W, H, [['facewash', 320, 0.36], ['hairoil', 350, 0.7]], { x: '48%' }),
        () => onPodium(W, H, [['multivitamin', 190, 0.22], ['aloe', 300, 0.45], ['protein', 210, 0.69], ['greens', 240, 0.9]], { x: '66%' }),
    ];
    return defs[n]();
}

/* ---------- ingredient medallions: fine plum line drawings on the brand beige, like the client's own icon sheet ---------- */
const PLUM = '#602460';
const ln = (d, extra = '') => `<path d="${d}" fill="none" stroke="${PLUM}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const fillish = (d) => `<path d="${d}" fill="${PLUM}" fill-opacity=".09" stroke="${PLUM}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
/** A leaf from (x,y) of length l and half-width w, pointing along `rot` degrees. */
const leafAt = (x, y, l, w, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})">${fillish(`M0,0 C${l * 0.25},${-w} ${l * 0.75},${-w} ${l},0 C${l * 0.75},${w} ${l * 0.25},${w} 0,0Z`)}${ln(`M${l * 0.08},0 L${l * 0.86},0`, 'stroke-width="1.6" opacity=".7"')}</g>`;
const sprig = (pairs = 3, l = 20, w = 7, spread = 48) => ln('M50,90 C50,66 50,40 50,12')
    + Array.from({ length: pairs * 2 }, (_, i) => { const y = 80 - i * (60 / (pairs * 2)); const right = i % 2 === 0; return leafAt(50, y, l * 1.25 - i * 0.8, w * 1.1, right ? -spread : -180 + spread); }).join('')
    + leafAt(50, 16, 17, 6, -90);
const fruit = (cx, cy, r) => fillish(`M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`) + ln(`M${cx - r * 0.5},${cy - r * 0.4} q${r * 0.2},${-r * 0.35} ${r * 0.55},${-r * 0.45}`, 'stroke-width="1.8" opacity=".6"');
const GLYPH = {
    fan: () => [-48, -24, 0, 24, 48].map((a, i) => `<g transform="rotate(${a} 50 90)">${fillish('M50,90 C42,62 43,34 50,12 C57,34 58,62 50,90Z')}${ln('M50,84 L50,24', 'stroke-width="1.5" opacity=".6"')}</g>`).join(''),
    cluster: () => fruit(36, 62, 17) + fruit(64, 58, 16) + fruit(50, 36, 12) + leafAt(50, 26, 22, 6, -75),
    root: () => fillish('M16,66 C13,52 25,47 32,52 L41,40 C43,29 56,29 58,40 L63,52 C72,46 86,51 86,63 C88,76 73,80 63,76 L36,78 C24,82 16,76 16,66Z') + ln('M30,60 L40,64 M56,56 L62,62', 'stroke-width="1.8" opacity=".6"'),
    capsule: () => `<g transform="rotate(-35 50 50)">${fillish('M26,38 h48 a14,14 0 0 1 0,28 h-48 a14,14 0 0 1 0,-28Z')}${ln('M50,38 L50,66')}</g>` + ln('M30,80 h40', 'stroke-width="1.6" opacity=".4"'),
    tablet: () => fillish('M50,18 a32,32 0 1,0 0.01,0Z') + ln('M22,50 L78,50') + ln('M34,34 q8,-8 18,-9', 'stroke-width="1.8" opacity=".5"'),
    drop: () => fillish('M50,14 C70,38 78,50 78,62 A28,28 0 0 1 22,62 C22,50 30,38 50,14Z') + ln('M36,62 q2,10 12,13', 'stroke-width="1.8" opacity=".6"'),
    bean: () => `<g transform="rotate(-30 36 52)">${fillish('M36,52 m-18,0 a18,12 0 1,0 36,0 a18,12 0 1,0 -36,0')}${ln('M20,52 C30,44 42,60 52,52', 'stroke-width="1.8"')}</g>` + `<g transform="rotate(28 64 50)">${fillish('M64,50 m-18,0 a18,12 0 1,0 36,0 a18,12 0 1,0 -36,0')}${ln('M48,50 C58,42 70,58 80,50', 'stroke-width="1.8"')}</g>` + `<g transform="rotate(4 52 72)">${fillish('M52,72 m-17,0 a17,11 0 1,0 34,0 a17,11 0 1,0 -34,0')}${ln('M36,72 C46,64 58,80 68,72', 'stroke-width="1.8"')}</g>`,
    citrus: () => fillish('M50,50 m-32,0 a32,32 0 1,0 64,0 a32,32 0 1,0 -64,0') + ln('M50,20 L50,80 M20,50 L80,50 M29,29 L71,71 M71,29 L29,71', 'stroke-width="1.6" opacity=".55"') + ln('M50,50 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', 'stroke-width="1.6" opacity=".55"'),
    sun: () => fillish('M50,50 m-16,0 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0') + Array.from({ length: 10 }, (_, i) => ln('M50,16 L50,26', `transform="rotate(${i * 36} 50 50)"`)).join(''),
    onion: () => fillish('M50,28 C70,36 82,52 78,68 C74,82 62,88 50,88 C38,88 26,82 22,68 C18,52 30,36 50,28Z') + ln('M50,28 C42,52 42,70 50,88 M50,28 C58,52 58,70 50,88', 'stroke-width="1.6" opacity=".55"') + leafAt(50, 28, 16, 4.5, -85),
    seeds: () => Array.from({ length: 22 }, (_, i) => `<path transform="translate(${20 + ((i * 37) % 62)} ${34 + ((i * 53) % 48)}) rotate(${(i * 71) % 180})" d="M0,-5 C4,-2 4,4 0,5 C-4,4 -4,-2 0,-5Z" fill="${PLUM}" fill-opacity=".14" stroke="${PLUM}" stroke-width="1.8"/>`).join(''),
    grain: () => ln('M50,90 L50,26') + Array.from({ length: 5 }, (_, i) => leafAt(50, 74 - i * 11, 17, 5, -180 + 58) + leafAt(50, 74 - i * 11, 17, 5, -58)).join('') + leafAt(50, 24, 14, 5, -90),
    pod: () => fillish('M10,56 C18,30 68,22 92,36 C88,64 34,80 10,56Z') + [[28, 52], [42, 50], [56, 47], [70, 44]].map(([x, y]) => ln(`M${x},${y} m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0`, 'stroke-width="1.8"')).join(''),
    cocoa: () => fillish('M50,12 C74,22 82,48 78,74 C72,88 28,88 22,74 C18,48 26,22 50,12Z') + ln('M50,14 L50,86 M36,22 C28,48 30,70 36,84 M64,22 C72,48 70,70 64,84', 'stroke-width="1.6" opacity=".55"'),
    swirl: () => ln('M50,50 m0,0 a6,6 0 1,1 6,6 a14,14 0 1,1 -14,-14 a22,22 0 1,1 22,22 a30,30 0 1,1 -30,-30'),
    grass: () => [-30, -20, -10, 0, 10, 20, 30].map((o, i) => ln(`M${50 + o * 0.45},90 C${50 + o * 0.8},60 ${50 + o * 1.5},38 ${50 + o * 1.9},${14 + Math.abs(o) * 0.5}`)).join(''),
    bud: () => leafAt(50, 88, 56, 12, -100) + leafAt(50, 88, 46, 10, -135) + leafAt(50, 88, 46, 10, -65) + leafAt(50, 70, 26, 7, -165),
    vine: () => ln('M26,90 C34,72 40,60 52,52 C64,44 72,34 76,18') + [[42, 66, -40], [60, 50, 20], [30, 78, -100], [70, 34, -20]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${fillish('M0,0 C-12,-3 -15,-19 -5,-22 C-2,-23 0,-20 0,-18 C0,-20 2,-23 5,-22 C15,-19 12,-3 0,0Z')}</g>`).join(''),
};
const ING = {
    'aloe-vera': 'fan', amla: 'cluster', bibhitaki: 'cluster', haritaki: 'cluster', ginger: 'root', biotin: 'capsule', 'vitamin-b12': 'capsule', zinc: 'tablet',
    'vitamin-e': 'drop', neem: 'sprigA', 'tea-tree': 'sprigB', 'green-coffee': 'bean', garcinia: 'citrus', 'vitamin-c': 'citrus', 'green-tea': 'bud', onion: 'onion',
    'black-seed': 'seeds', bhringraj: 'sprigC', giloy: 'vine', tulsi: 'sprigD', 'vitamin-d': 'sun', 'pea-protein': 'pod', 'brown-rice': 'grain', cocoa: 'cocoa',
    moringa: 'sprigE', spirulina: 'swirl', wheatgrass: 'grass',
};
// each plant gets its own leaf: neem long and narrow, tea tree needles, bhringraj wide-spreading, tulsi broad, moringa small and many
const SPRIG = { sprigA: () => sprig(4, 22, 4.2, 38), sprigB: () => sprig(6, 15, 2.2, 28), sprigC: () => sprig(3, 25, 6, 68), sprigD: () => sprig(3, 17, 11, 62), sprigE: () => sprig(7, 9, 5.5, 52) };
export function ingredient(id) {
    const W = 640; const H = 640;
    const kind = ING[id];
    const art = (GLYPH[kind] ?? SPRIG[kind])();
    const body = abs('inset:0;background:radial-gradient(90% 90% at 38% 30%,#FFF6EA 0,#FEE9D3 55%,#FBD9B6 100%)')
        + abs(`inset:${W * 0.15}px`, `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${art}</svg>`);
    return scene(W, H, body);
}

/* ---------- registry (id -> builder, output path, size) ---------- */
export const SCENES = {};
const reg = (id, build, w, h, out, quality = 86, transparent = false) => { SCENES[id] = { build, w, h, out, quality, transparent }; };
Object.keys(PRODUCTS).forEach((k) => {
    reg(`${k}-1`, () => productFront(k), 900, 1125, `products/${k}-1.webp`);
    reg(`${k}-2`, () => productStyled(k), 900, 1125, `products/${k}-2.webp`);
});
Object.keys(CATS).forEach((s) => reg(`cat-${s}`, () => categoryTile(s), 800, 800, `categories/${s}.webp`));
reg('banner-1', bannerPodiumWide, 1920, 720, 'banners/slide-2.webp', 84);
reg('banner-m-1', bannerPodiumMobile, 900, 1125, 'banners/slide-2-mobile.webp', 84);
[0, 1].forEach((n) => reg(`promo-${n}`, () => promo(n), 1200, 750, `banners/promo-${n + 1}.webp`, 84));
[3, 4, 5].forEach((n) => reg(`insta-${n}`, () => insta(n), 800, 800, `instagram/post-${n + 1}.webp`));
reg('certified', certified, 1050, 700, 'home/certified.webp');
Object.keys(ING).forEach((k) => reg(`ing-${k}`, () => ingredient(k), 640, 640, `ingredients/${k}.webp`, 88));

const id = new URLSearchParams(location.search).get('scene') || 'aloe-1';
const def = SCENES[id];
if (def) document.body.insertAdjacentHTML('beforeend', def.build());
window.__ready = Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]);
if (def?.transparent) document.body.style.background = 'transparent';
window.__scenes = Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, { w: v.w, h: v.h, out: v.out, quality: v.quality, transparent: v.transparent }]));
