import { useEffect, useRef, useState } from 'react';
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
    const frameRef = useRef(null);
    const [muted, setMuted] = useState(true);
    const [near, setNear] = useState(false);

    // The film sits far down the page: do not download it (half a megabyte) until the visitor is about to reach it.
    useEffect(() => {
        const node = frameRef.current;
        if (!node) return undefined;
        if (!('IntersectionObserver' in window)) { setNear(true); return undefined; }
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); observer.disconnect(); } }, { rootMargin: '600px 0px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [banner?.videoUrl]);

    useEffect(() => {
        if (!near || !videoRef.current) return;
        videoRef.current.load();
        videoRef.current.play().catch(() => {}); // autoplay can be blocked (e.g. low-power mode): the poster stays
    }, [near]);

    if (!banner?.videoUrl) return null;
    // The caption is a small card rather than a dark gradient: readable on any footage and never muddies the picture.

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
                <div className="relative overflow-hidden rounded-xl border border-line bg-canvas sm:border-0 sm:bg-ink">
                    <div ref={frameRef} className="relative" style={{ aspectRatio }}>
                        <video
                            ref={videoRef}
                            className={`absolute inset-0 size-full ${fit}`}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="none"
                            poster={banner.poster ? imageUrl(banner.poster, 1200) : undefined}
                            aria-label={banner.title || 'Promotional video'}
                        >
                            {near && <source src={imageUrl(banner.videoUrl)} type={videoType(banner.videoUrl)} />}
                        </video>
    
                        <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-md hover:bg-surface">
                            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>
                    {hasText && (
                        <div className="bg-canvas p-5 sm:absolute sm:bottom-8 sm:left-8 sm:max-w-sm sm:rounded-lg sm:p-6 sm:shadow-md">
                            {banner.subtitle && <p className="eyebrow">{banner.subtitle}</p>}
                            {banner.title && <p className="mt-1 font-display text-h3 leading-tight text-ink">{banner.title}</p>}
                            {banner.ctaLabel && banner.ctaHref && (
                                <Link to={banner.ctaHref} className="mt-4 inline-block"><Button size="sm">{banner.ctaLabel}</Button></Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
