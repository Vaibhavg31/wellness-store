import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { imageUrl } from '@/services/api';

const VIDEO_MIME = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const videoType = (url) => VIDEO_MIME[url.split('?')[0].split('.').pop()?.toLowerCase()] || 'video/mp4';
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const control = 'grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-md transition-colors hover:bg-surface';

/**
 * The single full-width video for the top section (chosen in admin instead of the image slider). Plays silently on a
 * loop edge to edge, with the same height as the image slider so the page doesn't change shape. Visitors can pause it
 * and turn sound on; people who prefer reduced motion get the still poster until they press play.
 */
export default function TopVideo({ video }) {
    const ref = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const hasText = video.title || video.subtitle || (video.ctaLabel && video.ctaHref);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (prefersReducedMotion()) {
            node.pause();
            setPlaying(false);
        } else {
            node.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); // autoplay can be blocked (e.g. low-power mode)
        }
    }, [video.url]);

    const togglePlay = () => {
        const node = ref.current;
        if (!node) return;
        if (node.paused) node.play().then(() => setPlaying(true)).catch(() => {});
        else { node.pause(); setPlaying(false); }
    };
    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        if (ref.current) ref.current.muted = next;
    };

    return (
        <section className="relative bg-ink" aria-label={video.title || 'Featured video'}>
            <div className="relative aspect-[16/10] w-full sm:aspect-[21/8]">
                <video
                    ref={ref}
                    className="absolute inset-0 size-full object-cover"
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    poster={video.poster ? imageUrl(video.poster, 1920) : undefined}
                >
                    <source src={imageUrl(video.url)} type={videoType(video.url)} />
                </video>

                {hasText && (
                    <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-ink/70 via-ink/20 to-transparent sm:items-center sm:bg-gradient-to-r sm:from-ink/65 sm:via-ink/25 sm:to-transparent">
                        <div className="container-page pb-12 text-white sm:pb-0">
                            <div className="max-w-xl">
                                {video.subtitle && <p className="text-caption font-semibold uppercase tracking-widest text-white/90">{video.subtitle}</p>}
                                {video.title && <p className="mt-1 font-display text-h2 text-white">{video.title}</p>}
                                {video.ctaLabel && video.ctaHref && (
                                    <Link to={video.ctaHref} className="pointer-events-auto mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-small font-medium text-ink">{video.ctaLabel}</Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="absolute bottom-3 right-3 flex gap-2 sm:bottom-4 sm:right-4">
                    <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'} className={control}>
                        {playing ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button type="button" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} className={control}>
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            </div>
        </section>
    );
}
