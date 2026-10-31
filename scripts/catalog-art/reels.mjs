/**
 * Turns the reel posters (rendered by build.mjs as reel-1..5) into short looping videos for "Watch & Shop":
 * a slow breathing zoom, 540x960, a few hundred KB each. Needs ffmpeg on the PATH (or FFMPEG_PATH).
 *
 *   node scripts/catalog-art/build.mjs reel-1 reel-2 reel-3 reel-4 reel-5
 *   node scripts/catalog-art/reels.mjs
 *
 * These are placeholders; real reels uploaded in the admin (Content → Homepage → Watch & Shop) replace them.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../public/catalog/reels');
const srcDir = path.join(os.tmpdir(), 'chikit-art');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
fs.mkdirSync(outDir, { recursive: true });

for (let n = 1; n <= 10; n += 1) {
    const png = path.join(srcDir, `reel-${n}.png`);
    if (!fs.existsSync(png)) { console.warn(`missing ${png}; run build.mjs first`); continue; }
    const mp4 = path.join(outDir, `reel-${n}.mp4`);
    // z breathes between 1.00 and 1.10 over 6 seconds and ends where it began, so the loop has no jump.
    const vf = "scale=1620:2880,zoompan=z='1.05-0.05*cos(2*PI*on/150)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=540x960:fps=25,format=yuv420p";
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-loop', '1', '-i', png, '-vf', vf, '-t', '6', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4]);
    await sharp(png).resize(540, 960).webp({ quality: 82 }).toFile(path.join(outDir, `reel-${n}.webp`));
    console.log(`✓ reel-${n}: ${(fs.statSync(mp4).size / 1024).toFixed(0)} KB`);
}
