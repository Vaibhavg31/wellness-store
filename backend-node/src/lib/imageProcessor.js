import sharp from 'sharp';
import fs from 'node:fs/promises';

/**
 * Resize and compress uploaded images for web delivery. Mirrors
 * backend/lib/ImageProcessor.php's behavior (auto-orient, downscale to
 * 1600px max side, recompress, png/jpg -> webp above 400k px) using sharp
 * instead of the PHP GD extension — sharp auto-applies EXIF orientation via
 * .rotate() with no arguments, so there's no separate orientation step.
 */
const MAX_DIMENSION = 1600;
const QUALITY = 85;

export async function processImage(filePath, ext) {
    ext = ext.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext;

    let image = sharp(filePath).rotate(); // auto-orient from EXIF, then strip it
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const maxSide = Math.max(width, height);

    if (maxSide > MAX_DIMENSION) {
        image = image.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });
    }

    let outExt = ext;
    if (['png', 'jpg', 'jpeg'].includes(ext) && width * height > 400000) outExt = 'webp';

    const buffer = await (outExt === 'webp' ? image.webp({ quality: QUALITY })
        : outExt === 'png' ? image.png({ compressionLevel: 6 })
        : image.jpeg({ quality: QUALITY })
    ).toBuffer();

    const outPath = outExt === ext ? filePath : filePath.replace(/\.[^.]+$/, `.${outExt}`);
    await fs.writeFile(outPath, buffer);
    if (outPath !== filePath) await fs.unlink(filePath);

    return outExt;
}
