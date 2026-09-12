/** Whether a social Instagram profile URL is configured. */
export function hasInstagramUrl(url) {
    return typeof url === 'string' && url.trim().length > 0;
}
