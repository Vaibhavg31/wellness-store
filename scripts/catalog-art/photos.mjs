/**
 * Builds the photographic site imagery from the client's brand photography in public/brand/photos (made by
 * photos-source.mjs): homepage slides, the hero and About pictures, the first Instagram squares and the Watch & Shop reels.
 * The styled product scenes (packs on the stone podium) come from build.mjs instead.
 *
 *   node scripts/catalog-art/photos.mjs          # needs sharp and ffmpeg (FFMPEG_PATH if it is not on the PATH)
 *
 * They are the client's own pictures; real shoots uploaded in the admin replace any of them.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, '../../public');
const photos = path.join(pub, 'brand/photos');
const cat = path.join(pub, 'catalog');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const P = (n) => path.join(photos, `${n}.webp`);
const out = (rel) => { const f = path.join(cat, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };
const webp = (img, rel, q = 84) => img.webp({ quality: q }).toFile(out(rel)).then(() => console.log('✓', rel));

/** A crop of `name` with the given aspect (w/h), centred on (cx, cy) as fractions of the photo (zoom > 1 comes closer), resized to w x h. */
async function crop(name, w, h, cx = 0.5, cy = 0.5, zoom = 1) {
    const m = await sharp(P(name)).metadata();
    let cw = m.width; let ch = Math.round(cw * h / w);
    if (ch > m.height) { ch = m.height; cw = Math.round(ch * w / h); }
    cw = Math.round(cw / zoom); ch = Math.round(ch / zoom);
    const left = Math.max(0, Math.min(m.width - cw, Math.round(m.width * cx - cw / 2)));
    const top = Math.max(0, Math.min(m.height - ch, Math.round(m.height * cy - ch / 2)));
    return sharp(P(name)).extract({ left, top, width: cw, height: ch }).resize(w, h);
}

// Slide 1: the woman with her tea (wide for desktop, tall for phones).
await webp(await crop('sky', 1920, 720, 0.5, 0.4), 'banners/slide-1.webp', 82);
await webp(await crop('tea', 900, 1125, 0.5, 0.5), 'banners/slide-1-mobile.webp', 82);

// Slide 3: three photographs side by side (desktop); the herb gatherer alone on phones.
{
    const panels = await Promise.all(['mortar', 'gather', 'tea'].map(async (n, i) => ({ input: await (await crop(n, 640, 720, n === 'tea' ? 0.55 : 0.5, 0.5)).toBuffer(), left: i * 640, top: 0 })));
    await webp(sharp({ create: { width: 1920, height: 720, channels: 3, background: '#F7EFE3' } }).composite(panels), 'banners/slide-3.webp', 84);
    await webp(await crop('gather', 900, 1125, 0.5, 0.5), 'banners/slide-3-mobile.webp', 84);
}

// Home hero, About page, first three Instagram squares.
await webp(await crop('tea', 1080, 1200, 0.5, 0.5), 'home/hero.webp', 84);
await webp(await crop('gather', 800, 1000, 0.5, 0.5), 'home/about-story.webp', 84);
await webp(await crop('gather', 800, 800, 0.42, 0.45), 'instagram/post-1.webp', 84);
await webp(await crop('mortar', 800, 800, 0.62, 0.55), 'instagram/post-2.webp', 84);
await webp(await crop('tea', 800, 800, 0.58, 0.4), 'instagram/post-3.webp', 84);

// Watch & Shop: four tall posters, each turned into a slow looping video.
// name, centre x, centre y, zoom. Six reels from four photographs: the second set are close-ups of the same scenes.
const REELS = [['gather', 0.45, 0.5, 1], ['mortar', 0.62, 0.5, 1], ['tea', 0.56, 0.5, 1], ['sky', 0.62, 0.5, 1], ['mortar', 0.45, 0.66, 1.7], ['gather', 0.66, 0.66, 1.7]];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chikit-reels-'));
for (const [i, [name, cx, cy, zoom]] of REELS.entries()) {
    const n = i + 1;
    const poster = path.join(tmp, `reel-${n}.png`);
    await (await crop(name, 1080, 1920, cx, cy, zoom)).png().toFile(poster);
    const mp4 = out(`reels/reel-${n}.mp4`);
    // z breathes between 1.00 and 1.10 over 6 seconds and ends where it began, so the loop has no jump.
    const vf = "scale=1620:2880,zoompan=z='1.05-0.05*cos(2*PI*on/150)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=540x960:fps=25,format=yuv420p";
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-loop', '1', '-i', poster, '-vf', vf, '-t', '6', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4]);
    await sharp(poster).resize(540, 960).webp({ quality: 82 }).toFile(out(`reels/reel-${n}.webp`));
    console.log(`✓ reels/reel-${n} (${(fs.statSync(mp4).size / 1024).toFixed(0)} KB)`);
}
fs.rmSync(tmp, { recursive: true, force: true });
// The earlier drawn reels beyond these are gone with the drawn art.
for (let n = REELS.length + 1; n <= 10; n += 1) for (const ext of ['mp4', 'webp']) fs.rmSync(path.join(cat, `reels/reel-${n}.${ext}`), { force: true });
