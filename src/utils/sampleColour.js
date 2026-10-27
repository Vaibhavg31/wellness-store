const cache = new Map();

/**
 * Dominant colour of a picture as [r, g, b], for tinting the light behind it. Vivid pixels decide the colour; whites and
 * greys barely count, so a product on a plain backdrop still gives the product's own colour. Resolves null when the
 * picture cannot be read (another origin without CORS, or a load error): callers fall back to the brand colour.
 */
export function sampleColour(src) {
    if (cache.has(src)) return cache.get(src);
    const result = new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 24; canvas.height = 24;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, 24, 24);
                const { data } = ctx.getImageData(0, 0, 24, 24);
                let r = 0; let g = 0; let b = 0; let weight = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 200) continue;
                    const max = Math.max(data[i], data[i + 1], data[i + 2]);
                    const min = Math.min(data[i], data[i + 1], data[i + 2]);
                    const sat = max === 0 ? 0 : (max - min) / max;
                    const w = sat * sat + 0.001;
                    r += data[i] * w; g += data[i + 1] * w; b += data[i + 2] * w; weight += w;
                }
                resolve(weight > 0.5 ? [Math.round(r / weight), Math.round(g / weight), Math.round(b / weight)] : null);
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
    cache.set(src, result);
    return result;
}
