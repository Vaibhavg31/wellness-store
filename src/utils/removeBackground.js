/**
 * Client-side background removal for the admin "cutout image" tool.
 *
 * Runs entirely in the browser via @imgly/background-removal (WASM/ONNX,
 * MIT-licensed) — no server changes, no third-party API key. The first call
 * on a page downloads the segmentation model from imgly's CDN and caches it
 * (~15-40MB depending on quality), so the first click is noticeably slower
 * than every one after it; that one-time cost is surfaced to the caller via
 * the `progress` callback so the admin UI can show something better than a
 * frozen button.
 */
// The package's README shows a default import, but the actual ESM build
// this version ships (dist/index.mjs) only exports named bindings — a
// default import fails to resolve under Vite/Rollup's ESM analysis.
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

/**
 * @param {string} imageUrl - Absolute URL of the source photo (already
 *   resolved through imageUrl() by the caller).
 * @param {(label: string, ratio: number) => void} [onProgress]
 * @returns {Promise<Blob>} a transparent-background PNG blob
 */
export async function removeImageBackground(imageUrl, onProgress) {
    return imglyRemoveBackground(imageUrl, {
        // Quantized/small model (~40MB vs ~80MB default) — this is an admin
        // convenience tool, not a print-quality pipeline, so trading a
        // little edge precision for a noticeably shorter first-run download
        // is the right default here.
        model: 'isnet_quint8',
        output: { format: 'image/png', quality: 0.9 },
        progress: (key, current, total) => {
            if (!onProgress) return;
            const ratio = total > 0 ? current / total : 0;
            const label = key.startsWith('fetch:') ? 'Downloading model…' : 'Removing background…';
            onProgress(label, ratio);
        },
    });
}

/** Wraps a Blob as a File so it can go straight into the existing
 *  api.upload()/api.uploadReviewImages() FormData helpers. */
export function blobToFile(blob, filename = 'cutout.png') {
    return new File([blob], filename, { type: blob.type || 'image/png' });
}
