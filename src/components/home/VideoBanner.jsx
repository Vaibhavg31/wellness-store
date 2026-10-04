import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

const VIDEO_MIME = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const videoType = (url) => VIDEO_MIME[url.split('?')[0].split('.').pop()?.toLowerCase()] || 'video/mp4';

/** Admin-managed promo video. Renders nothing until a video has been uploaded. */
export default function VideoBanner() {
    const { content } = useSiteContent();
    const banner = content.videoBanner;
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(true);

    if (!banner?.videoUrl) return null;

    const fit = banner.fit === 'contain' ? 'object-contain' : 'object-cover';
    const aspectRatio = banner.width && banner.height ? `${banner.width} / ${banner.height}` : '16 / 9';
    const hasText = banner.title || banner.subtitle || banner.ctaLabel;

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        if (videoRef.current) videoRef.current.muted = next;
    };

    return (
        <section className="bg-canvas py-6 sm:py-10">
            <div className="container-page">
                <div className="relative overflow-hidden rounded-xl bg-ink" style={{ aspectRatio }}>
                    <video
                        ref={videoRef}
                        className={`absolute inset-0 size-full ${fit}`}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={banner.poster ? imageUrl(banner.poster, 1200) : undefined}
                        aria-label={banner.title || 'Promotional video'}
                    >
                        <source src={imageUrl(banner.videoUrl)} type={videoType(banner.videoUrl)} />
                    </video>

                    {hasText && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-5 text-white sm:p-10">
                            {banner.subtitle && <p className="eyebrow !text-accent-hover">{banner.subtitle}</p>}
                            {banner.title && <p className="mt-1 max-w-xl font-display text-h2 text-white">{banner.title}</p>}
                            {banner.ctaLabel && banner.ctaHref && (
                                <Link to={banner.ctaHref} className="mt-4 inline-block"><Button variant="accent">{banner.ctaLabel}</Button></Link>
                            )}
                        </div>
                    )}

                    <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-md hover:bg-surface">
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            </div>
        </section>
    );
}
