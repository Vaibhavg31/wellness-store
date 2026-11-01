/**
 * Cuts the client's brand photography out of the brand book (CHIKIT Branding file.pdf, rendered to PNGs first) and saves
 * web-sized copies in public/brand/photos. These photographs are the client's own brand imagery; the site uses them
 * for banners, the About page, the Watch & Shop reels and as the backdrop of the styled product shots.
 *
 *   node scripts/catalog-art/photos-source.mjs <folder with page-01.png, page-06.png, page-09.png>
 *
 * Pages are rendered with scripts/catalog-art/pdf-pages.mjs (pdf.js). Run photos.mjs afterwards to build the banners.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [src] = process.argv.slice(2);
if (!src) { console.error('Usage: node photos-source.mjs <folder with page-01.png page-06.png page-09.png>'); process.exit(1); }
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/brand/photos');
fs.mkdirSync(out, { recursive: true });
const page = async (n) => { const f = path.join(src, `page-0${n}.png`); const m = await sharp(f).metadata(); return { f, w: m.width, h: m.height }; };
const save = (img, name, w, q = 84) => img.resize({ width: w }).webp({ quality: q }).toFile(path.join(out, name));

// Page 6: three photographs in phone frames (display coordinates are from a 2000 px wide view of the page).
{
    const p = await page(6); const k = p.w / 2000; const inset = 22;
    const frames = { gather: [43, 146, 628, 827], mortar: [708, 146, 1292, 827], tea: [1373, 146, 1958, 827] };
    for (const [name, [x1, y1, x2, y2]] of Object.entries(frames)) {
        const box = { left: Math.round(x1 * k) + inset, top: Math.round(y1 * k) + inset, width: Math.round((x2 - x1) * k) - 2 * inset, height: Math.round((y2 - y1) * k) - 2 * inset };
        await save(sharp(p.f).extract(box), `${name}.webp`, 1100);
        console.log('photo', name);
    }
}
// Page 9: the sky photograph. The brand's own logo is printed over the clouds on the left; it is filled in from the sky
// around it (smooth diffusion plus fine grain), so the photograph can carry the site's own text instead.
{
    const p = await page(9); const k = p.w / 2000;
    const box = { left: Math.round(10 * k) + 25, top: Math.round(47 * k) + 25, width: Math.round(1130 * k) - 50, height: Math.round(752 * k) - 50 };
    const { data, info } = await sharp(p.f).extract(box).resize({ width: 2048 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width; const H = info.height; const C = 3;
    // The printed logo sits in this box of the 2048 px wide photo. Only the logo's own pixels (plum, or edged with plum) are
    // replaced: found by colour, grown by a few pixels for the soft edge, then filled from the sky around them.
    const bx0 = 88; const bx1 = 852; const by0 = 236; const by1 = 470; const bw = bx1 - bx0; const bh = by1 - by0;
    const at = (x, y, c) => data[(y * W + x) * C + c];
    const isLogo = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const r = at(bx0 + x, by0 + y, 0); const g = at(bx0 + x, by0 + y, 1); const b = at(bx0 + x, by0 + y, 2);
        const plum = r - g > 7 && b - g > 7; // sky is blue (red lowest), clouds are white; plum has red and blue above green
        if (plum || r + g + b < 330) isLogo[y * bw + x] = 1;
    }
    const GROW = 6; const mask = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (isLogo[y * bw + x]) {
        for (let dy = -GROW; dy <= GROW; dy++) for (let dx = -GROW; dx <= GROW; dx++) {
            const nx = x + dx; const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < bw && ny < bh && dx * dx + dy * dy <= GROW * GROW) mask[ny * bw + nx] = 1;
        }
    }
    const list = []; for (let i = 0; i < mask.length; i++) if (mask[i]) list.push(i);
    const buf = new Float32Array(W * H * C); for (let i = 0; i < buf.length; i++) buf[i] = data[i];
    const inMask = (x, y) => x >= bx0 && y >= by0 && x < bx1 && y < by1 && mask[(y - by0) * bw + (x - bx0)] === 1;
    // start each logo pixel from the nearest sky pixel to its left, then relax towards the average of its neighbours
    for (const i of list) {
        const x = bx0 + (i % bw); const y = by0 + Math.floor(i / bw);
        let sx = x; while (sx > 0 && inMask(sx, y)) sx--;
        for (let c = 0; c < C; c++) buf[(y * W + x) * C + c] = buf[(y * W + sx) * C + c];
    }
    for (let it = 0; it < 4000; it++) {
        for (const i of list) {
            const x = bx0 + (i % bw); const y = by0 + Math.floor(i / bw);
            for (let c = 0; c < C; c++) {
                buf[(y * W + x) * C + c] = (buf[(y * W + x - 1) * C + c] + buf[(y * W + x + 1) * C + c] + buf[((y - 1) * W + x) * C + c] + buf[((y + 1) * W + x) * C + c]) / 4;
            }
        }
    }
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
    for (const i of list) {
        const x = bx0 + (i % bw); const y = by0 + Math.floor(i / bw);
        const n = rnd() * 4;
        for (let c = 0; c < C; c++) data[(y * W + x) * C + c] = Math.max(0, Math.min(255, buf[(y * W + x) * C + c] + n));
    }
    await sharp(data, { raw: { width: W, height: H, channels: C } }).webp({ quality: 86 }).toFile(path.join(out, 'sky.webp'));
    console.log('photo sky (logo filled in)');
}
// Page 1: the stone podium (bottom strip) and the sunlit arch wall (top strip); the printed logo sits between them.
{
    const p = await page(1);
    const podiumH = Math.round(0.37 * p.h);
    await save(sharp(p.f).extract({ left: 0, top: p.h - podiumH, width: p.w, height: podiumH }), 'podium.webp', 2800, 82);
    const wallH = Math.round(0.335 * p.h);
    await save(sharp(p.f).extract({ left: Math.round(p.w * 0.5), top: 0, width: Math.round(p.w * 0.5), height: wallH }), 'arch.webp', 2200, 82);
    console.log('photo podium, arch');
}
