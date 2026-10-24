/**
 * Renders the dummy catalogue artwork (product packshots, category tiles, banners, hero, Instagram tiles) to
 * public/catalog/*.webp. Run from the project root:
 *
 *   npm i --no-save puppeteer-core sharp
 *   node scripts/catalog-art/build.mjs            # everything
 *   node scripts/catalog-art/build.mjs aloe-1 hero # only these scene ids
 *
 * Needs Google Chrome / Edge (set CHROME_PATH if it is somewhere unusual).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../../public');
const outRoot = path.join(publicDir, 'catalog');
const tmpDir = path.join(os.tmpdir(), 'chikit-art');
const PORT = 5217;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };

const chromePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    .find((p) => p && fs.existsSync(p));
if (!chromePath) throw new Error('Chrome not found. Set CHROME_PATH.');

const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = ['/index.html', '/scenes.js'].includes(p) ? path.join(here, p) : path.join(publicDir, p);
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
        return res.end(data);
    });
}).listen(PORT);

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu', '--hide-scrollbars'] });
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/?scene=aloe-1`);
    const all = await page.evaluate(() => window.__scenes);
    const wanted = process.argv.slice(2);
    const ids = wanted.length ? wanted : Object.keys(all);
    fs.mkdirSync(tmpDir, { recursive: true });
    for (const id of ids) {
        const def = all[id];
        if (!def) { console.warn(`unknown scene: ${id}`); continue; }
        await page.setViewport({ width: def.w, height: def.h, deviceScaleFactor: 1 });
        await page.goto(`http://localhost:${PORT}/?scene=${id}`);
        await page.evaluate(() => window.__ready);
        const png = await (await page.$('#scene')).screenshot({ type: 'png', omitBackground: Boolean(def.transparent) });
        const isTmp = def.out.startsWith('video/');
        const dest = isTmp ? path.join(tmpDir, path.basename(def.out)) : path.join(outRoot, def.out);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (dest.endsWith('.png')) fs.writeFileSync(dest, png);
        else await sharp(png).webp({ quality: def.quality, alphaQuality: 100 }).toFile(dest);
        console.log(`✓ ${id} → ${isTmp ? dest : path.relative(publicDir, dest)}`);
    }
} finally {
    await browser.close();
    server.close();
}
