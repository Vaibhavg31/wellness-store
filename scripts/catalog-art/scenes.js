/* Scene library for the dummy catalogue artwork. Every pack is an original Chikit-branded design drawn with SVG + CSS. */

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
const sheen = (x, y, w, h, o = 0.42) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="#fff" opacity="${o}" style="filter:blur(.8px)"/>`;

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
    const sh = shadow ? `<div class="shadow" style="left:${x}px;bottom:${bottom - w * 0.05}px;width:${w * 1.12}px;height:${w * 0.13}px"></div>` : '';
    return { html: sh + html, h: H };
}

/* ---------- props ---------- */
const abs = (style, inner) => `<div class="abs" style="${style}">${inner}</div>`;

function leaf(x, y, w, rot, color = '#4F8A3A', blur = 0, flip = false) {
    const g = gid();
    return abs(`left:${x}px;top:${y}px;width:${w}px;height:${w * 0.6}px;transform:rotate(${rot}deg)${flip ? ' scaleY(-1)' : ''};${blur ? `filter:blur(${blur}px);` : ''}`,
        `<svg viewBox="0 0 100 60" width="100%" height="100%"><defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="${darken(color, 0.25)}"/><stop offset=".6" stop-color="${color}"/><stop offset="1" stop-color="${lighten(color, 0.2)}"/></linearGradient></defs>
        <path d="M2,30 C20,0 72,0 98,30 C72,60 20,60 2,30 Z" fill="url(#${g})"/><path d="M2,30 L94,30" stroke="${lighten(color, 0.35)}" stroke-width="1.2" opacity=".7"/>
        <path d="M22,30 L40,16 M38,30 L58,13 M56,30 L76,16 M22,30 L40,44 M38,30 L58,47 M56,30 L76,44" stroke="${lighten(color, 0.3)}" stroke-width=".8" opacity=".5" fill="none"/></svg>`);
}
function sprig(x, y, size, rot, color, n = 5, blur = 0) {
    let out = '';
    for (let i = 0; i < n; i++) out += leaf(x + Math.cos((rot + i * 28 - 56) * Math.PI / 180) * size * 0.5, y + Math.sin((rot + i * 28 - 56) * Math.PI / 180) * size * 0.5, size * (0.7 + (i % 3) * 0.12), rot + i * 28 - 56, color, blur);
    return out;
}
function citrus(x, y, d, c1 = '#F6A83B', c2 = '#FFE3A6') {
    return abs(`left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle,${c2} 0 12%,transparent 12.5%),repeating-conic-gradient(from 8deg,${c1} 0 24deg,${c2} 24deg 28deg);box-shadow:0 0 0 ${d * 0.07}px ${darken(c1, 0.12)}, 0 ${d * 0.1}px ${d * 0.18}px rgba(60,30,0,.28);`, '');
}
function ball(x, y, d, color, shadow = true) {
    return abs(`left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle at 32% 28%,${lighten(color, 0.55)} 0,${lighten(color, 0.12)} 22%,${color} 55%,${darken(color, 0.28)} 100%);${shadow ? `box-shadow:0 ${d * 0.18}px ${d * 0.25}px rgba(40,20,20,.25);` : ''}`, '');
}
function gummies(cx, cy, n, colors, size = 46, spread = 150, seed = 3) {
    let out = ''; let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2; const r = rnd() * spread;
        const d = size * (0.8 + rnd() * 0.4);
        out += `<div class="abs" style="left:${cx + Math.cos(a) * r * 1.5}px;top:${cy + Math.sin(a) * r * 0.45}px;width:${d}px;height:${d * 0.92}px;border-radius:46% 46% 42% 42% / 52% 52% 40% 40%;transform:rotate(${rnd() * 360}deg);background:radial-gradient(circle at 32% 26%,${lighten(colors[i % colors.length], 0.6)} 0,${colors[i % colors.length]} 45%,${darken(colors[i % colors.length], 0.22)} 100%);box-shadow:0 ${d * 0.14}px ${d * 0.2}px rgba(40,20,20,.28)"></div>`;
    }
    return out;
}
function capsules(cx, cy, n, c1, c2, size = 62, spread = 150, seed = 5) {
    let out = ''; let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2; const r = rnd() * spread;
        out += `<div class="abs" style="left:${cx + Math.cos(a) * r * 1.5}px;top:${cy + Math.sin(a) * r * 0.45}px;width:${size}px;height:${size * 0.4}px;border-radius:99px;transform:rotate(${rnd() * 180}deg);background:linear-gradient(90deg,${c1} 0 50%,${c2} 50% 100%);box-shadow:inset 0 ${size * 0.06}px ${size * 0.08}px rgba(255,255,255,.55),inset 0 -${size * 0.06}px ${size * 0.08}px rgba(0,0,0,.2),0 ${size * 0.08}px ${size * 0.12}px rgba(40,20,20,.28)"></div>`;
    }
    return out;
}
function tablets(cx, cy, n, color, size = 40, spread = 150, seed = 7) {
    let out = ''; let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2; const r = rnd() * spread;
        out += ball(cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 0.45, size * (0.85 + rnd() * 0.3), color);
    }
    return out;
}
function scoop(x, y, w, rot = -18) {
    return abs(`left:${x}px;top:${y}px;width:${w}px;height:${w * 0.62}px;transform:rotate(${rot}deg)`,
        `<svg viewBox="0 0 100 62" width="100%" height="100%"><defs><linearGradient id="sc" x1="0" x2="1"><stop offset="0" stop-color="#E8E0D4"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFC4B4"/></linearGradient></defs>
        <path d="M0,18 Q0,2 16,2 L60,2 Q74,2 74,18 L74,26 Q74,52 40,56 Q0,52 0,26 Z" fill="url(#sc)" stroke="rgba(0,0,0,.12)"/><path d="M66,12 L100,8 L100,16 L68,24 Z" fill="url(#sc)" stroke="rgba(0,0,0,.12)"/>
        <ellipse cx="36" cy="14" rx="30" ry="7" fill="#7A4B2A"/></svg>`);
}

/* ---------- scene chrome ---------- */
function studio(w, h, [c1, c2], { arch = true, floor = 0.15, floorColor } = {}) {
    const fl = floorColor || darken(c2, 0.06);
    let s = `<div class="abs" style="inset:0;background:radial-gradient(110% 80% at 50% 28%,${lighten(c1, 0.35)} 0,${c1} 46%,${c2} 100%)"></div>`;
    if (arch) s += `<div class="arch" style="left:${w * 0.2}px;width:${w * 0.6}px;bottom:${h * floor}px;height:${h * 0.66}px;background:linear-gradient(180deg,${lighten(c1, 0.55)},${lighten(c2, 0.35)});opacity:.75"></div>`;
    s += `<div class="abs" style="left:0;right:0;bottom:0;height:${h * floor}px;background:linear-gradient(180deg,${mix(fl, '#fff', 0.1)},${darken(fl, 0.07)});box-shadow:0 -2px 10px rgba(60,30,50,.08)"></div>`;
    s += `<div class="abs" style="left:0;right:0;bottom:${h * floor - 1}px;height:2px;background:rgba(255,255,255,.55)"></div>`;
    return s;
}
const scene = (w, h, body) => `<div class="scene" id="scene" style="width:${w}px;height:${h}px">${body}</div>`;

/* ---------- product scenes (900x1125, key content inside the central square so 1:1 crops stay good) ---------- */
function propsFor(key, W, floorY) {
    const fy = floorY; // y (from top) of the floor line
    switch (key) {
        case 'aloe': return leaf(W * 0.08, fy - 150, 230, -28, '#5E9A32') + leaf(W * 0.7, fy - 130, 240, 205, '#76B040', 0) + ball(W * 0.74, fy + 22, 64, '#9CCB4E') + ball(W * 0.82, fy + 8, 46, '#B6D96A');
        case 'biotin': return gummies(W * 0.5, fy + 36, 22, ['#E85A82', '#F28AA6', '#F6B1C3'], 52, 190) + leaf(W * 0.06, fy - 110, 190, -20, '#6AA84F');
        case 'facewash': return sprig(W * 0.14, fy - 40, 170, -30, '#3E8E5A', 5) + sprig(W * 0.84, fy - 20, 150, 200, '#4E9C68', 4) + ball(W * 0.72, fy + 26, 46, '#CFE9DA');
        case 'fatburner': return capsules(W * 0.5, fy + 40, 14, '#5B8F3A', '#F4EBCF', 66, 190) + tablets(W * 0.2, fy + 24, 6, '#6B4A2B', 30, 70) + leaf(W * 0.8, fy - 100, 220, 210, '#5E8E3E');
        case 'hairoil': return leaf(W * 0.08, fy - 120, 220, -24, '#6C8F3E') + ball(W * 0.78, fy + 20, 60, '#2A1A12') + ball(W * 0.84, fy + 4, 44, '#3A2518') + leaf(W * 0.72, fy - 90, 200, 200, '#7DA04A');
        case 'immunity': return citrus(W * 0.07, fy + 8, 150) + citrus(W * 0.74, fy + 22, 120, '#F0932B') + leaf(W * 0.12, fy - 70, 200, -25, '#5E9A32') + ball(W * 0.62, fy + 40, 40, '#7FB34A');
        case 'multivitamin': return gummies(W * 0.5, fy + 36, 26, ['#F6A21E', '#F9C74F', '#F3722C', '#FFD97A'], 50, 200) + citrus(W * 0.08, fy + 18, 120, '#F6A83B') + leaf(W * 0.78, fy - 80, 190, 205, '#6AA84F');
        case 'protein': return scoop(W * 0.62, fy + 18, 190, -12) + leaf(W * 0.06, fy - 110, 220, -26, '#6B8F4E') + ball(W * 0.2, fy + 32, 44, '#6B3F20') + ball(W * 0.27, fy + 44, 34, '#7B4B2A');
        case 'greens': return leaf(W * 0.06, fy - 120, 240, -28, '#4F8A3A') + leaf(W * 0.74, fy - 110, 240, 208, '#68A445') + ball(W * 0.8, fy + 28, 52, '#7FB34A') + ball(W * 0.1, fy + 34, 42, '#5E9A32');
        case 'triphala': return tablets(W * 0.5, fy + 42, 18, '#6B3F1F', 40, 190) + ball(W * 0.08, fy + 14, 70, '#8A5A2B') + ball(W * 0.84, fy + 20, 64, '#9A6A32') + leaf(W * 0.72, fy - 70, 190, 205, '#6C8F3E');
        default: return '';
    }
}
const PACK_W = { bottle: 275, jar: 480, tub: 530, tube: 310, pouch: 410, oil: 285, carton: 0 };
const RATIO = { bottle: 2.5, jar: 1.18, tub: 1.18, tube: 2.2, pouch: 1.5, oil: 2.3, carton: 1.5 };

export function productFront(key) {
    const P = PRODUCTS[key]; const W = 900; const H = 1125;
    const floorH = H * 0.16; const floorY = H - floorH;
    let body = studio(W, H, P.bg, { floor: 0.16 });
    const w = PACK_W[P.kind];
    const pk = pack(P, w, W / 2 + (P.kind === 'oil' ? -125 : 0), floorH - 6);
    body += pk.html;
    if (P.kind === 'oil') {
        const carton = pack({ ...P, kind: 'carton' }, 225, W / 2 + 175, floorH - 6);
        body += carton.html;
    }
    body += propsFor(key, W, floorY);
    return scene(W, H, body);
}

export function productBenefits(key) {
    const P = PRODUCTS[key]; const W = 900; const H = 1125;
    const c1 = lighten(P.bg[0], 0.45); const c2 = P.bg[0];
    let body = `<div class="abs" style="inset:0;background:linear-gradient(160deg,${c1},${c2})"></div>`;
    body += `<div class="blob" style="left:${-W * 0.2}px;top:${H * 0.55}px;width:${W * 0.9}px;height:${W * 0.9}px;background:${P.bg[1]};opacity:.55"></div>`;
    body += `<div class="txt serif" style="left:60px;top:${H * 0.145}px;font-size:46px;line-height:1.1;color:#241720">${P.l1}<br><span style="color:${P.accent}">${P.l2}</span></div>`;
    const w = Math.min(PACK_W[P.kind] * 0.95, 380, 560 / RATIO[P.kind]);
    const fy = H * 0.205;
    body += leaf(20, H - fy - 170, 210, -26, '#5E9A32') + (P.kind === 'oil' ? pack({ ...P, kind: 'carton' }, 190, 330, fy).html : '');
    body += pack(P, w, 210, fy).html;
    let rows = '';
    P.benefits.forEach(([ic, text], i) => {
        rows += `<div class="abs" style="left:${W * 0.5}px;top:${H * 0.3 + i * 128}px;width:${W * 0.45}px;display:flex;align-items:center;gap:20px">
          <div style="flex:none;width:72px;height:72px;border-radius:50%;background:#fff;color:${P.accent};display:grid;place-items:center;box-shadow:0 6px 18px rgba(60,30,50,.12)"><div style="width:36px;height:36px">${ICON[ic]}</div></div>
          <div style="font-size:23px;font-weight:500;line-height:1.3;color:#241720">${text}</div></div>`;
    });
    body += rows;
    body += `<div class="abs" style="left:60px;right:60px;top:${H * 0.835}px;height:54px;border-radius:99px;background:#fff;display:flex;align-items:center;justify-content:center;gap:34px;font-size:19px;font-weight:600;color:${P.accent};box-shadow:0 6px 18px rgba(60,30,50,.1)"><span>100% Ayurvedic</span><span style="opacity:.4">|</span><span>FSSAI licensed</span><span style="opacity:.4">|</span><span>Lab tested</span></div>`;
    return scene(W, H, body);
}

/* ---------- category tiles (square) ---------- */
const CATS = {
    protein: { bg: ['#F3E8F4', '#DCC5DE'], items: [['greens', 290, 0.7, 0], ['protein', 400, 0.36, 0]], props: (W, fy) => scoop(W * 0.08, fy + 30, 140, -10) },
    immunity: { bg: ['#FDEBD2', '#F7CD92'], items: [['immunity', 240, 0.36, 0], ['immunity', 210, 0.7, 0]], props: (W, fy) => citrus(W * 0.06, fy + 10, 110) + citrus(W * 0.78, fy + 26, 90, '#F0932B') + leaf(W * 0.82, fy - 80, 150, 205, '#5E9A32') },
    'weight-management': { bg: ['#EFEBDD', '#DCD3BB'], items: [['fatburner', 450, 0.5, 0]], props: (W, fy) => capsules(W * 0.5, fy + 36, 10, '#5B8F3A', '#F4EBCF', 52, 150) + leaf(W * 0.05, fy - 80, 160, -25, '#5E8E3E') },
    vitamins: { bg: ['#FFF1C9', '#F9DD8D'], items: [['multivitamin', 340, 0.3, 0], ['biotin', 340, 0.7, 0]], props: (W, fy) => gummies(W * 0.5, fy + 34, 14, ['#F6A21E', '#E85A82', '#F9C74F'], 38, 150) },
    'personal-care': { bg: ['#E2F1E8', '#BFE0CD'], items: [['facewash', 200, 0.2, 0], ['hairoil', 215, 0.5, 0], ['facewash', 160, 0.82, 0]], props: (W, fy) => sprig(W * 0.06, fy - 20, 120, -30, '#3E8E5A', 4) },
    'digestive-health': { bg: ['#E9F3DC', '#CFE5B6'], items: [['aloe', 200, 0.27, 0], ['triphala', 360, 0.68, 0]], props: (W, fy) => leaf(W * 0.04, fy - 70, 160, -25, '#5E9A32') + ball(W * 0.84, fy + 28, 40, '#9CCB4E') },
    superfoods: { bg: ['#E3F0D3', '#BCD9A0'], items: [['greens', 450, 0.5, 0]], props: (W, fy) => leaf(W * 0.04, fy - 100, 200, -26, '#4F8A3A') + leaf(W * 0.74, fy - 90, 200, 208, '#68A445') + ball(W * 0.8, fy + 30, 44, '#7FB34A') },
};
export function categoryTile(slug) {
    const C = CATS[slug]; const W = 800; const H = 800;
    const floorH = H * 0.14; let body = studio(W, H, C.bg, { floor: 0.14, arch: true });
    C.items.forEach(([k, w, fx]) => { body += pack(PRODUCTS[k], w, W * fx, floorH - 4).html; });
    body += C.props(W, H - floorH);
    return scene(W, H, body);
}

/* ---------- lineups: hero, banners, promos ---------- */
function lineup(items, W, floorH, bottomOffset = 0) {
    let out = '';
    items.forEach(([k, w, x, dy = 0, rot = 0]) => { out += pack(PRODUCTS[k], w, x, floorH - 4 + dy + bottomOffset, { rot }).html; });
    return out;
}

export function hero() {
    const W = 1080; const H = 1200; const floorH = H * 0.15;
    let body = `<div class="abs" style="inset:0;background:radial-gradient(110% 80% at 50% 25%,#FFFFFF 0,#F6EBF6 45%,#E6D2E8 100%)"></div>`;
    body += `<div class="arch" style="left:${W * 0.14}px;width:${W * 0.72}px;bottom:${floorH}px;height:${H * 0.72}px;background:linear-gradient(180deg,#FFFFFF,#EBD9EC);opacity:.85"></div>`;
    body += `<div class="abs" style="left:0;right:0;bottom:0;height:${floorH}px;background:linear-gradient(180deg,#EBDDEA,#D9C3DA)"></div><div class="abs" style="left:0;right:0;bottom:${floorH - 1}px;height:2px;background:rgba(255,255,255,.7)"></div>`;
    body += leaf(W * 0.02, H * 0.5, 300, -30, '#6B9A4E') + leaf(W * 0.78, H * 0.46, 300, 210, '#79A85A') + leaf(W * 0.05, H * 0.62, 220, -10, '#4F8A3A', 1.5);
    body += lineup([['aloe', 195, W * 0.14, 0], ['hairoil', 215, W * 0.3, 0], ['greens', 285, W * 0.8, 0], ['protein', 350, W * 0.55, 0]], W, floorH);
    body += citrus(W * 0.05, H * 0.88, 110) + gummies(W * 0.38, H * 0.915, 10, ['#E85A82', '#F28AA6'], 40, 120) + ball(W * 0.93, H * 0.9, 50, '#7FB34A');
    return scene(W, H, body);
}

const BANNERS = [
    { bg: ['#E59A2E', '#B8691A'], glow: '#FFD488', wide: [['immunity', 190, 0.6], ['multivitamin', 300, 0.745], ['immunity', 165, 0.88]], mob: [['immunity', 215, 0.2], ['multivitamin', 300, 0.52], ['immunity', 175, 0.83]],
        props: (W, H, f, m) => leaf(W * (m ? 0.02 : 0.45), H * (m ? 0.2 : 0.3), m ? 230 : 250, -22, '#6AA84F') + leaf(W * (m ? 0.74 : 0.93), H * (m ? 0.16 : 0.2), m ? 220 : 230, 205, '#6AA84F') + citrus(W * (m ? 0.04 : 0.5), H - f - 20, m ? 120 : 130) + citrus(W * (m ? 0.86 : 0.96), H - f - 10, 90, '#F0932B') },
    { bg: ['#2F6B34', '#1C4524'], glow: '#7FBF6A', wide: [['protein', 360, 0.62], ['greens', 290, 0.765], ['aloe', 180, 0.9]], mob: [['protein', 330, 0.24], ['greens', 270, 0.58], ['aloe', 170, 0.85]],
        props: (W, H, f, m) => leaf(W * (m ? 0.02 : 0.46), H * (m ? 0.22 : 0.28), m ? 230 : 250, -22, '#7FBF6A') + leaf(W * (m ? 0.74 : 0.94), H * (m ? 0.14 : 0.18), m ? 220 : 230, 205, '#5E9A32') + (m ? '' : scoop(W * 0.5, H - f - 6, 150, -10)) },
    { bg: ['#B04A78', '#7A2A55'], glow: '#F3A8C6', wide: [['hairoil', 215, 0.6], ['facewash', 190, 0.72], ['biotin', 300, 0.86]], mob: [['hairoil', 200, 0.2], ['facewash', 175, 0.45], ['biotin', 300, 0.76]],
        props: (W, H, f, m) => leaf(W * (m ? 0.02 : 0.45), H * (m ? 0.22 : 0.3), m ? 230 : 250, -22, '#9BC47A') + leaf(W * (m ? 0.76 : 0.95), H * (m ? 0.14 : 0.2), m ? 220 : 220, 205, '#9BC47A') + gummies(W * (m ? 0.5 : 0.8), H - f + (m ? -10 : 24), 12, ['#F28AA6', '#F6B1C3'], 40, 120) },
];
export function bannerWide(n) {
    const B = BANNERS[n]; const W = 1920; const H = 720; const f = 90;
    let body = `<div class="abs" style="inset:0;background:radial-gradient(70% 110% at 78% 40%,${B.glow} 0,${B.bg[0]} 38%,${B.bg[1]} 100%)"></div>`;
    body += `<div class="blob" style="left:${W * 0.5}px;top:${-H * 0.2}px;width:${H * 1.5}px;height:${H * 1.5}px;border:2px solid rgba(255,255,255,.18)"></div><div class="blob" style="left:${W * 0.56}px;top:${H * 0.05}px;width:${H * 1.1}px;height:${H * 1.1}px;border:2px solid rgba(255,255,255,.14)"></div>`;
    body += `<div class="abs" style="left:0;right:0;bottom:0;height:${f}px;background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.28))"></div>`;
    body += B.props(W, H, f, false);
    body += lineup(B.wide.map(([k, w, fx]) => [k, w, W * fx, 0]), W, f);
    return scene(W, H, body);
}
export function bannerMobile(n) {
    const B = BANNERS[n]; const W = 900; const H = 1125; const f = 400;
    let body = `<div class="abs" style="inset:0;background:radial-gradient(90% 60% at 50% 34%,${B.glow} 0,${B.bg[0]} 42%,${B.bg[1]} 100%)"></div>`;
    body += `<div class="blob" style="left:${W * 0.1}px;top:${H * 0.02}px;width:${W * 0.8}px;height:${W * 0.8}px;border:2px solid rgba(255,255,255,.2)"></div>`;
    body += `<div class="abs" style="left:0;right:0;bottom:0;height:${f}px;background:linear-gradient(180deg,rgba(0,0,0,.14),rgba(0,0,0,.34))"></div><div class="abs" style="left:0;right:0;bottom:${f - 1}px;height:2px;background:rgba(255,255,255,.3)"></div>`;
    body += B.props(W, H, f, true);
    body += lineup(B.mob.map(([k, w, fx]) => [k, w, W * fx, 0]), W, f);
    return scene(W, H, body);
}

const PROMOS = [
    { bg: ['#E9F3DC', '#BCD9A0'], items: [['aloe', 185, 0.64], ['triphala', 300, 0.8]], props: (W, H, f) => leaf(W * 0.52, H * 0.3, 210, -20, '#5E9A32') + ball(W * 0.9, H - f + 8, 50, '#9CCB4E') },
    { bg: ['#F3E8F4', '#D6BAD9'], items: [['protein', 390, 0.64], ['greens', 310, 0.82]], props: (W, H, f) => leaf(W * 0.5, H * 0.3, 210, -20, '#6B8F4E') + scoop(W * 0.9, H - f + 4, 150, -12) },
];
export function promo(n) {
    const B = PROMOS[n]; const W = 1800; const H = 700; const f = 210;
    let body = studio(W, H, B.bg, { arch: false, floor: f / H });
    body += `<div class="arch" style="left:${W * 0.5}px;width:${W * 0.42}px;bottom:${f}px;height:${H * 0.62}px;background:linear-gradient(180deg,rgba(255,255,255,.8),rgba(255,255,255,.2))"></div>`;
    body += B.props(W, H, f);
    body += lineup(B.items.map(([k, w, fx]) => [k, w, W * fx, 0]), W, f);
    return scene(W, H, body);
}

/* ---------- Instagram squares ---------- */
export function insta(n) {
    const W = 800; const H = 800;
    const defs = [
        () => { const f = 110; return studio(W, H, ['#F3E8F4', '#DCC5DE'], { floor: f / H }) + pack(PRODUCTS.protein, 400, W * 0.5, f - 4).html + scoop(W * 0.68, H - f + 30, 190, -10) + leaf(W * 0.04, H * 0.5, 240, -28, '#6B8F4E'); },
        () => `<div class="abs" style="inset:0;background:radial-gradient(90% 90% at 50% 40%,#FFF3F6,#F6CCD8)"></div>` + gummies(W * 0.5, H * 0.74, 38, ['#E85A82', '#F28AA6', '#F6B1C3'], 64, 270, 11) + pack(PRODUCTS.biotin, 400, W * 0.5, H * 0.38).html + leaf(W * 0.02, H * 0.08, 220, 28, '#6AA84F'),
        () => `<div class="abs" style="inset:0;background:#FDF9F4"></div><div class="blob" style="left:-120px;top:-120px;width:420px;height:420px;background:#F1E4F2"></div><div class="blob" style="right:-140px;bottom:-140px;width:460px;height:460px;background:#FBF1E1"></div>` + leaf(W * 0.7, H * 0.08, 230, 25, '#79A85A') + leaf(W * 0.05, H * 0.74, 230, -30, '#79A85A') + `<div class="abs" style="left:0;right:0;top:${H * 0.28}px;text-align:center;padding:0 70px"><div class="serif" style="font-size:66px;line-height:1.15;color:#431A43">Rooted in<br>Ayurveda.</div><div style="margin-top:26px;font-size:24px;color:#6B5D68">Daily rituals, thoughtfully made.</div><img src="/brand/chikit-logo.webp" style="margin-top:46px;width:260px" alt=""></div>`,
        () => { const f = 110; return studio(W, H, ['#FDEBD2', '#F7CD92'], { floor: f / H, arch: false }) + pack(PRODUCTS.immunity, 250, W * 0.5, f - 4).html + citrus(W * 0.14, H - f + 4, 170) + citrus(W * 0.7, H - f + 22, 140, '#F0932B') + leaf(W * 0.66, H * 0.2, 220, 205, '#5E9A32'); },
        () => { const f = 110; return studio(W, H, ['#E2F1E8', '#BFE0CD'], { floor: f / H }) + pack(PRODUCTS.facewash, 280, W * 0.5, f - 4).html + sprig(W * 0.07, H * 0.66, 120, -30, '#3E8E5A', 4) + sprig(W * 0.93, H * 0.7, 110, 200, '#4E9C68', 4) + ball(W * 0.7, H - f + 26, 56, '#CFE9DA'); },
        () => { const f = 120; return studio(W, H, ['#FFF1C9', '#F5E3A8'], { floor: f / H }) + lineup([['multivitamin', 230, W * 0.17], ['aloe', 150, W * 0.38], ['protein', 270, W * 0.66], ['greens', 180, W * 0.9]], W, f) + gummies(W * 0.5, H - f + 30, 10, ['#F6A21E', '#F9C74F'], 34, 150); },
    ];
    return scene(W, H, defs[n]());
}

/* ---------- misc ---------- */
export function certified() {
    const W = 1050; const H = 700; const f = 90;
    let body = `<div class="abs" style="inset:0;background:radial-gradient(90% 90% at 50% 40%,#FFFFFF,#EBD9EC)"></div>`;
    body += `<div class="abs" style="left:0;right:0;bottom:0;height:${f}px;background:linear-gradient(180deg,#E8D6E9,#D6BCD8)"></div>`;
    body += lineup([['triphala', 225, W * 0.25], ['protein', 270, W * 0.5], ['aloe', 150, W * 0.74]], W, f);
    body += `<div class="abs" style="right:46px;top:46px;width:150px;height:150px;border-radius:50%;background:#602460;color:#fff;display:grid;place-items:center;text-align:center;box-shadow:0 10px 28px rgba(67,26,67,.3);border:5px solid #F1E4F2"><div><div style="width:34px;height:34px;margin:0 auto 4px">${ICON.shield}</div><div style="font-size:15px;font-weight:600;letter-spacing:.08em">LAB<br>TESTED</div></div></div>`;
    return scene(W, H, body + leaf(W * 0.02, H * 0.5, 200, -25, '#79A85A'));
}
export function about() {
    const W = 800; const H = 1000; const f = 140;
    let body = studio(W, H, ['#F6EBF6', '#E3CCE5'], { floor: f / H });
    body += lineup([['hairoil', 210, W * 0.22], ['protein', 330, W * 0.55], ['greens', 270, W * 0.84, 0]], W, f);
    body += leaf(W * 0.02, H * 0.4, 260, -28, '#6B9A4E') + leaf(W * 0.62, H * 0.18, 260, 205, '#79A85A') + citrus(W * 0.06, H - f + 8, 110);
    return scene(W, H, body);
}
export function videoFrame(n) {
    const W = 1280; const H = 720; const f = 80;
    const sets = [
        ['#F3E8F4', '#DCC5DE', [['protein', 330, 0.36], ['greens', 280, 0.62], ['aloe', 190, 0.8]]],
        ['#FDEBD2', '#F7CD92', [['immunity', 230, 0.34], ['multivitamin', 300, 0.58], ['immunity', 190, 0.78]]],
        ['#E2F1E8', '#BFE0CD', [['facewash', 190, 0.34], ['hairoil', 220, 0.56], ['biotin', 300, 0.78]]],
        ['#E9F3DC', '#CFE5B6', [['aloe', 220, 0.36], ['triphala', 300, 0.6], ['fatburner', 280, 0.82]]],
    ];
    const [a, b, items] = sets[n];
    let body = studio(W, H, [a, b], { floor: f / H });
    body += lineup(items.map(([k, w, fx]) => [k, w, W * fx, 0]), W, f);
    body += leaf(W * 0.03, H * 0.45, 220, -28, '#6B9A4E') + leaf(W * 0.9, H * 0.4, 220, 208, '#79A85A');
    return scene(W, H, body);
}

/** One pack on a transparent 600x800 canvas (soft contact shadow only): used for the floating hero orbit. */
export function cutout(key) {
    const P = PRODUCTS[key]; const W = 600; const H = 800;
    const w = Math.min(500, 690 / RATIO[P.kind]);
    return `<div class="scene" id="scene" style="width:${W}px;height:${H}px">${pack(P, w, W / 2, 60).html}</div>`;
}

/* ---------- registry (id -> builder, output path, size) ---------- */
export const SCENES = {};
const reg = (id, build, w, h, out, quality = 86, transparent = false) => { SCENES[id] = { build, w, h, out, quality, transparent }; };
Object.keys(PRODUCTS).forEach((k) => {
    reg(`${k}-1`, () => productFront(k), 900, 1125, `products/${k}-1.webp`);
    reg(`${k}-2`, () => productBenefits(k), 900, 1125, `products/${k}-2.webp`);
});
Object.keys(CATS).forEach((s) => reg(`cat-${s}`, () => categoryTile(s), 800, 800, `categories/${s}.webp`));
reg('hero', hero, 1080, 1200, 'home/hero.webp');
[0, 1, 2].forEach((n) => { reg(`banner-${n}`, () => bannerWide(n), 1920, 720, `banners/slide-${n + 1}.webp`, 84); reg(`banner-m-${n}`, () => bannerMobile(n), 900, 1125, `banners/slide-${n + 1}-mobile.webp`, 84); });
[0, 1].forEach((n) => reg(`promo-${n}`, () => promo(n), 1800, 700, `banners/promo-${n + 1}.webp`, 84));
for (let n = 0; n < 6; n++) reg(`insta-${n}`, () => insta(n), 800, 800, `instagram/post-${n + 1}.webp`);
reg('certified', certified, 1050, 700, 'home/certified.webp');
reg('about', about, 800, 1000, 'home/about-story.webp');
Object.keys(PRODUCTS).forEach((k) => reg(`cut-${k}`, () => cutout(k), 600, 800, `cutouts/${k}.webp`, 92, true));
for (let n = 0; n < 4; n++) reg(`vf-${n}`, () => videoFrame(n), 1280, 720, `video/frame-${n + 1}.png`);

const id = new URLSearchParams(location.search).get('scene') || 'aloe-1';
const def = SCENES[id];
if (def) document.body.insertAdjacentHTML('beforeend', def.build());
window.__ready = Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]);
if (def?.transparent) document.body.style.background = 'transparent';
window.__scenes = Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, { w: v.w, h: v.h, out: v.out, quality: v.quality, transparent: v.transparent }]));
