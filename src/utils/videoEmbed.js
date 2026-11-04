/**
 * Works out what a saved video address is, so a product can show either an uploaded video file or a link someone pasted
 * (a customer's YouTube / Instagram / Vimeo video). Returns:
 *  - kind:  'file' (an uploaded or direct video file), 'youtube', 'instagram', 'vimeo', or 'link' (anything else, opened in a new tab)
 *  - embed: the address to put in an iframe (for the three services), with `autoplay` when asked
 *  - thumb: a cover picture the service provides (YouTube only; the others need a cover picture uploaded)
 *  - tall:  true when the video is portrait (Shorts, Instagram reels), so it gets a tall frame
 */
export function videoSource(rawUrl) {
    const url = String(rawUrl ?? '').trim();
    if (!url) return { kind: 'none' };
    if (url.startsWith('/') || /\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return { kind: 'file', url };

    let u;
    try { u = new URL(url); } catch { return { kind: 'none' }; }
    const host = u.hostname.replace(/^www\.|^m\./, '');

    if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const parts = u.pathname.split('/').filter(Boolean);
        const shorts = parts[0] === 'shorts';
        const id = host === 'youtu.be' ? parts[0] : shorts || parts[0] === 'embed' || parts[0] === 'live' ? parts[1] : u.searchParams.get('v');
        if (id && /^[\w-]{6,15}$/.test(id)) {
            return { kind: 'youtube', id, tall: shorts, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embed: (autoplay) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1${autoplay ? '&autoplay=1' : ''}` };
        }
    }

    if (host === 'instagram.com') {
        const m = u.pathname.match(/\/(reel|reels|p|tv)\/([\w-]+)/);
        if (m) return { kind: 'instagram', id: m[2], tall: true, thumb: null, embed: () => `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed` };
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p));
        if (id) return { kind: 'vimeo', id, tall: false, thumb: null, embed: (autoplay) => `https://player.vimeo.com/video/${id}?playsinline=1${autoplay ? '&autoplay=1' : ''}` };
    }

    return { kind: 'link', url };
}
