import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

const VIDEO_MIME = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

function guessVideoType(url) {
    const clean = url?.split('?')[0] ?? '';
    const ext = clean.split('.').pop()?.toLowerCase();
    return VIDEO_MIME[ext] || 'video/mp4';
}

/** Full-width autoplay video banner. Renders nothing until the admin
 *  uploads a video — safe to leave the homepage section toggle on by
 *  default. */
export default function VideoBanner() {
    const { content } = useSiteContent();
    const banner = content.videoBanner;
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }, []);

    if (!banner?.videoUrl) return null;

    const aspectRatio = banner.width && banner.height ? `${banner.width} / ${banner.height}` : '16 / 9';
    const hasOverlayText = Boolean(banner.title || banner.subtitle || banner.ctaLabel);

    const toggleMute = () => {
        setMuted((m) => {
            const next = !m;
            if (videoRef.current) videoRef.current.muted = next;
            return next;
        });
    };

    return (
        <section className="relative w-full overflow-hidden bg-charcoal" aria-label={banner.title || 'Video banner'}>
            <div className="relative w-full" style={{ aspectRatio, maxHeight: '85vh' }}>
                {reducedMotion ? (
                    banner.poster && (
                        <img
                            src={imageUrl(banner.poster)}
                            alt=""
                            className="absolute inset-0 w-full h-full"
                            style={{ objectFit: banner.fit === 'contain' ? 'contain' : 'cover' }}
                        />
                    )
                ) : (
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ objectFit: banner.fit === 'contain' ? 'contain' : 'cover' }}
                        poster={banner.poster ? imageUrl(banner.poster) : undefined}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                    >
                        <source src={imageUrl(banner.videoUrl)} type={guessVideoType(banner.videoUrl)} />
                    </video>
                )}

                {hasOverlayText && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
                )}

                {hasOverlayText && (
                    <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-10 lg:p-14">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.7 }}
                            className="max-w-xl"
                        >
                            {banner.subtitle && (
                                <p className="type-eyebrow text-ivory/70 mb-2">{banner.subtitle}</p>
                            )}
                            {banner.title && (
                                <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl text-ivory font-medium leading-tight mb-5">
                                    {banner.title}
                                </h2>
                            )}
                            {banner.ctaLabel && (
                                <Link to={banner.ctaHref || '/shop'}>
                                    <Button variant="gold" size="lg">{banner.ctaLabel}</Button>
                                </Link>
                            )}
                        </motion.div>
                    </div>
                )}

                {!reducedMotion && (
                    <button
                        type="button"
                        onClick={toggleMute}
                        className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-ivory backdrop-blur-sm transition-colors"
                        aria-label={muted ? 'Unmute video' : 'Mute video'}
                    >
                        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                )}
            </div>
        </section>
    );
}
