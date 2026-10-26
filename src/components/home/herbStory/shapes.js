/**
 * Point clouds for the herb story, generated from simple maths (no model files): seed dust, a tulsi leaf, an amla
 * fruit, an aloe plant, a neem sprig and a Chikit pack. Every shape has exactly `count` points so the shader can morph
 * point i of one shape into point i of the next. Each point is [x, y, z, shade]: shade (0..1) is a fake light term
 * so flat additive points still read as a 3D form. Shapes are about 2.4 units tall, centred on the origin.
 */

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const normalize = ([x, y, z]) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const LIGHT = normalize([-0.45, 0.6, 0.65]);
const lambert = (n) => 0.3 + 0.7 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);

/** Fills `count` points by asking `parts` (weighted samplers) in proportion to their weight. */
function build(count, seed, parts) {
    const r = rng(seed);
    const out = new Float32Array(count * 4);
    const total = parts.reduce((s, p) => s + p.weight, 0);
    let i = 0;
    parts.forEach((part, pi) => {
        const n = pi === parts.length - 1 ? count - i : Math.round((part.weight / total) * count);
        for (let k = 0; k < n && i < count; k += 1, i += 1) out.set(part.sample(r), i * 4);
    });
    // shuffle so neighbouring indices are spread over the shape: makes the morph read as a swirl, not a slide
    for (let j = count - 1; j > 0; j -= 1) {
        const k = Math.floor(r() * (j + 1));
        for (let c = 0; c < 4; c += 1) { const t = out[j * 4 + c]; out[j * 4 + c] = out[k * 4 + c]; out[k * 4 + c] = t; }
    }
    return out;
}

const jitter = (r, a) => (r() - 0.5) * 2 * a;
function rotZ([x, y, z], a) { const c = Math.cos(a); const s = Math.sin(a); return [x * c - y * s, x * s + y * c, z]; }
function rotY([x, y, z], a) { const c = Math.cos(a); const s = Math.sin(a); return [x * c + z * s, y, -x * s + z * c]; }
function rotX([x, y, z], a) { const c = Math.cos(a); const s = Math.sin(a); return [x, y * c - z * s, y * s + z * c]; }

/* ---------- 0: seed dust, a slow three-armed swirl ---------- */
export function dust(count) {
    return build(count, 11, [{
        weight: 1,
        sample: (r) => {
            const arm = Math.floor(r() * 3);
            const rad = Math.pow(r(), 0.7) * 2.3;
            const a = rad * 2.1 + (arm * Math.PI * 2) / 3 + jitter(r, 0.35);
            const p = rotX([Math.cos(a) * rad, jitter(r, 0.12) * (1.2 - rad / 2.3), Math.sin(a) * rad], 0.55);
            return [...p, 0.35 + 0.65 * (1 - rad / 2.3)];
        },
    }]);
}

/* ---------- 1: tulsi leaf (ovate, softly serrated, curled, with veins and a stalk) ---------- */
const tulsiHalfWidth = (t) => 0.62 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.9) * (1 + 0.035 * Math.abs(Math.sin(t * Math.PI * 16)));
function tulsiPoint(t, s) {
    const x = s * tulsiHalfWidth(t);
    const y = -1.05 + 2.25 * t;
    const z = -0.45 * x * x + 0.18 * Math.sin(t * Math.PI) - 0.1;
    const n = normalize([0.9 * x, -0.15, 1]);
    return [...rotZ([x, y, z], -0.32), lambert(rotZ(n, -0.32))];
}
export function tulsi(count) {
    return build(count, 21, [
        { weight: 52, sample: (r) => tulsiPoint(Math.sqrt(r()) * 0.98 + 0.01, r() * 2 - 1) },
        { weight: 14, sample: (r) => tulsiPoint(r(), r() < 0.5 ? -1 : 1) },
        { weight: 9, sample: (r) => tulsiPoint(r() * 0.98, jitter(r, 0.02)) },
        { weight: 20, sample: (r) => {
            const t0 = (1 + Math.floor(r() * 6)) * 0.13; const u = r();
            return tulsiPoint(Math.min(0.97, t0 + u * 0.16), (r() < 0.5 ? -1 : 1) * u * 0.92);
        } },
        { weight: 5, sample: (r) => { const u = r(); return [...rotZ([-0.06 * u * u, -1.05 - 0.38 * u, -0.1 + 0.05 * u], -0.32), 0.6]; } },
    ]);
}

/* ---------- 2: amla, a six-lobed fruit with seams and a tiny stalk ---------- */
export function amla(count) {
    const R = 0.92;
    const surface = (theta, phi) => {
        const lobe = 1 + 0.045 * Math.cos(6 * phi);
        const x = R * lobe * Math.sin(theta) * Math.cos(phi);
        const z = R * lobe * Math.sin(theta) * Math.sin(phi);
        const y = R * 0.88 * Math.cos(theta);
        return [x, y - 0.05, z, lambert(normalize([x, y / 0.8, z]))];
    };
    return build(count, 31, [
        { weight: 78, sample: (r) => surface(Math.acos(1 - 2 * r()), r() * Math.PI * 2) },
        { weight: 17, sample: (r) => surface(Math.acos(1 - 2 * r()), (Math.floor(r() * 6) * Math.PI) / 3 + Math.PI / 6 + jitter(r, 0.02)) },
        { weight: 5, sample: (r) => { const u = r(); return [0.05 * Math.sin(u * 2), 0.76 + u * 0.32, jitter(r, 0.015), 0.85]; } },
    ]);
}

/* ---------- 3: aloe vera, a rosette of thick arching leaves with toothed edges ---------- */
export function aloe(count) {
    // inner leaves stand nearly upright, outer ones lean out further; each blade arches outward along its length
    const leaves = Array.from({ length: 10 }, (_, i) => {
        const outer = i / 9;
        return { theta: i * 2.4 + 0.3, lean: 0.12 + outer * 0.5, bend: 0.75 + outer * 0.35, length: 2.15 - outer * 0.6 };
    });
    const leafPoint = (leaf, t, s, edge) => {
        const phi = leaf.lean + leaf.bend * t; // angle from vertical
        const out = ((Math.cos(leaf.lean) - Math.cos(phi)) / leaf.bend) * leaf.length;
        const up = ((Math.sin(phi) - Math.sin(leaf.lean)) / leaf.bend) * leaf.length;
        const w = 0.16 * Math.pow(1 - t, 0.7) + 0.008;
        const tooth = edge ? 0.03 * Math.max(0, Math.sin(t * Math.PI * 24)) : 0;
        const channel = Math.abs(s) * w * 0.55; // the blade is a shallow V, thick in the middle
        const local = [s * (w + tooth), up + channel * Math.sin(phi), out - channel * Math.cos(phi)];
        const p = rotY(local, leaf.theta);
        const n = normalize(rotY([0, Math.sin(phi), Math.cos(phi)], leaf.theta));
        return [p[0], p[1] - 1.1, p[2], lambert(n)];
    };
    return build(count, 41, [
        { weight: 76, sample: (r) => leafPoint(leaves[Math.floor(r() * leaves.length)], Math.pow(r(), 0.8), r() * 2 - 1, false) },
        { weight: 24, sample: (r) => leafPoint(leaves[Math.floor(r() * leaves.length)], r(), r() < 0.5 ? -1 : 1, true) },
    ]);
}

/* ---------- 4: neem sprig, a curved stem with alternate, sickle-shaped serrated leaflets ---------- */
export function neem(count) {
    const stem = (t) => [0.16 * Math.sin(t * 2.6) - 0.05, -1.0 + 1.95 * t, 0.15 * Math.sin(t * 3.2)];
    const leaflets = Array.from({ length: 11 }, (_, j) => {
        const terminal = j === 10;
        return { t: terminal ? 1 : 0.08 + j * 0.088, side: terminal ? 0 : j % 2 ? 1 : -1, len: terminal ? 0.42 : 0.6 - j * 0.022, twist: (j % 3) * 0.25 - 0.25 };
    });
    const leafletPoint = (lf, u, s, edge) => {
        const base = stem(lf.t);
        const ang = lf.side === 0 ? Math.PI / 2 : lf.side > 0 ? 0.55 : Math.PI - 0.55;
        const w = 0.085 * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 + (edge ? 0.18 * Math.abs(Math.sin(u * Math.PI * 9)) : 0));
        const curve = 0.12 * u * u;
        const local = rotX([u * lf.len, s * w + curve * (lf.side || 1), 0.06 * Math.sin(u * Math.PI)], lf.twist);
        const p = rotZ(local, ang);
        return [base[0] + p[0], base[1] + p[1], base[2] + p[2], lambert(normalize(rotZ(rotX([0, 0, 1], lf.twist), ang)))];
    };
    return build(count, 51, [
        { weight: 66, sample: (r) => leafletPoint(leaflets[Math.floor(r() * leaflets.length)], r(), r() * 2 - 1, false) },
        { weight: 22, sample: (r) => leafletPoint(leaflets[Math.floor(r() * leaflets.length)], r(), r() < 0.5 ? -1 : 1, true) },
        { weight: 12, sample: (r) => { const p = stem(r()); return [p[0] + jitter(r, 0.012), p[1], p[2] + jitter(r, 0.012), 0.7]; } },
    ]);
}

/* ---------- 5: the Chikit pack, a lathed bottle with a ribbed cap and a bright label band ---------- */
function bottleRadius(y) {
    if (y < -0.92) return 0.56 * Math.sqrt(Math.max(0, 1 - ((y + 0.92) / 0.14) ** 2)) * 0.9 + 0.05;
    if (y < 0.42) return 0.56;
    if (y < 0.74) { const t = (y - 0.42) / 0.32; return 0.56 - 0.34 * (t * t * (3 - 2 * t)); }
    if (y < 0.92) return 0.21;
    return 0.25;
}
export function bottle(count) {
    const around = (y, r, extra = 0) => {
        const phi = r() * Math.PI * 2;
        const rad = bottleRadius(y);
        const n = normalize([Math.cos(phi), y > 0.42 && y < 0.74 ? 0.6 : 0, Math.sin(phi)]);
        return [rad * Math.cos(phi), y, rad * Math.sin(phi), Math.min(1, lambert(n) + extra)];
    };
    return build(count, 61, [
        { weight: 55, sample: (r) => around(-1.06 + r() * 2.0, r) },
        { weight: 25, sample: (r) => around(-0.55 + r() * 0.8, r, 0.25) },
        { weight: 12, sample: (r) => { const y = 0.92 + r() * 0.3; const phi = (Math.floor(r() * 28) / 28) * Math.PI * 2; return [0.255 * Math.cos(phi), y, 0.255 * Math.sin(phi), lambert(normalize([Math.cos(phi), 0, Math.sin(phi)]))]; } },
        { weight: 8, sample: (r) => { const a = r() * Math.PI * 2; const rr = Math.sqrt(r()) * 0.25; return [rr * Math.cos(a), 1.22, rr * Math.sin(a), 0.95]; } },
    ]);
}

export const SHAPES = [dust, tulsi, amla, aloe, neem, bottle];
