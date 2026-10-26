import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

/**
 * Draws a pack's label to a canvas and returns it as a texture, so every product gets a crisp label from its own name
 * (no image files). The label wraps the whole pack: the printed front sits in the middle of the canvas and the back
 * carries a quiet tagline. The Chikit logo is drawn untouched (single plum colour, on the cream label).
 */

const W = 2048;
const H = 700;
const CREAM = '#FFFDF9';
const INK = '#241720';
const MUTED = '#6B5D68';

let logoPromise;
const loadLogo = () => {
    logoPromise ??= new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = '/brand/chikit-logo-480.webp';
    });
    return logoPromise;
};

function fit(ctx, text, maxWidth, size, weight, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 4; } while (ctx.measureText(text).width > maxWidth && s > 28);
}

function wrap(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
}

export async function makeLabelTexture(pack, anisotropy = 4) {
    const [logo] = await Promise.all([loadLogo(), document.fonts?.ready]);
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const display = 'Lora, Georgia, serif';
    const sans = 'Poppins, system-ui, sans-serif';

    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // back of the pack: a small repeated tagline
    ctx.fillStyle = MUTED;
    ctx.font = `500 34px ${sans}`;
    ctx.fillText('AYURVEDA & WELLNESS  ·  LAB TESTED  ·  FSSAI', 0, H * 0.52);
    ctx.fillText('AYURVEDA & WELLNESS  ·  LAB TESTED  ·  FSSAI', W, H * 0.52);

    // the front, centred on the canvas, about 40% of the way round
    const cx = W / 2;
    const frontW = W * 0.34;
    if (logo) {
        const lw = frontW * 0.62;
        const lh = (logo.height / logo.width) * lw;
        ctx.drawImage(logo, cx - lw / 2, H * 0.07, lw, lh);
    }
    ctx.fillStyle = INK;
    ctx.font = `600 96px ${display}`;
    const nameLines = wrap(ctx, pack.name, frontW).slice(0, 2);
    const nameSize = nameLines.length > 1 ? 80 : 96;
    ctx.font = `600 ${nameSize}px ${display}`;
    const nameTop = H * 0.44;
    nameLines.forEach((line, i) => ctx.fillText(line, cx, nameTop + i * (nameSize + 6)));
    const afterName = nameTop + (nameLines.length - 1) * (nameSize + 6);

    ctx.fillStyle = pack.accent;
    fit(ctx, pack.sub, frontW, 54, 600, sans);
    ctx.fillText(pack.sub, cx, afterName + 78);

    ctx.fillStyle = MUTED;
    fit(ctx, pack.note, frontW, 38, 400, sans);
    ctx.fillText(pack.note, cx, afterName + 140);

    // colour band at the foot of the label
    ctx.fillStyle = pack.accent;
    ctx.fillRect(0, H - 70, W, 70);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 30px ${sans}`;
    ctx.fillText('NO PRESERVATIVES  ·  100% VEGETARIAN', cx, H - 26);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.anisotropy = anisotropy;
    texture.needsUpdate = true;
    return texture;
}
