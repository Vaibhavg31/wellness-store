// Renders pages of a PDF to PNG through pdf.js in headless Chrome (npm i --no-save pdfjs-dist@4.10.38 puppeteer-core).
// Usage: node pdfrender.mjs <pdf path> <out dir> [scale] [pages e.g. 1-5]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const [pdfPath, outDir, scaleArg = '1.5', range = ''] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const types = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = url === '/doc.pdf' ? pdfPath : url === '/' ? null : path.join(here, url);
    if (url === '/') {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(`<!doctype html><html><body><script type="module">
import * as pdfjs from '/node_modules/pdfjs-dist/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
window.doc = await pdfjs.getDocument({ url: '/doc.pdf', disableStream: false }).promise;
window.render = async (n, scale) => {
  const page = await window.doc.getPage(n);
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  const text = (await page.getTextContent()).items.map((i) => i.str).join(' ');
  return { png: c.toDataURL('image/png'), w: c.width, h: c.height, text };
};
window.ready = true;
</script></body></html>`);
    }
    if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'content-length': fs.statSync(file).size });
    fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 600000 });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`);
await p.waitForFunction(() => window.ready === true, { timeout: 600000 });
const count = await p.evaluate(() => window.doc.numPages);
let [from, to] = range ? range.split('-').map(Number) : [1, count];
to = Math.min(to || from, count);
console.log('pages:', count);
for (let n = from; n <= to; n++) {
    const r = await p.evaluate((nn, s) => window.render(nn, s), n, Number(scaleArg));
    const out = path.join(outDir, `page-${String(n).padStart(2, '0')}.png`);
    fs.writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
    console.log(`page ${n}: ${r.w}x${r.h}  text: ${r.text.replace(/\s+/g, ' ').slice(0, 300)}`);
}
await b.close();
server.close();
