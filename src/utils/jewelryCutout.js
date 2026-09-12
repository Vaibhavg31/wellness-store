const memoryCache = new Map();

/**
 * Extract jewellery from a product photo (background removal).
 * Results are cached in memory by source URL.
 */
export async function extractJewelryCutout(imageUrl) {
    if (!imageUrl) throw new Error('No image URL');

    if (memoryCache.has(imageUrl)) {
        return memoryCache.get(imageUrl);
    }

    const { removeBackground } = await import('@imgly/background-removal');

    const blob = await removeBackground(imageUrl, {
        output: {
            format: 'image/png',
            quality: 0.95,
        },
    });

    const objectUrl = URL.createObjectURL(blob);
    memoryCache.set(imageUrl, objectUrl);
    return objectUrl;
}

export function clearCutoutCache() {
    memoryCache.forEach((url) => URL.revokeObjectURL(url));
    memoryCache.clear();
}
