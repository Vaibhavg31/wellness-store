import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Marquee from '@/components/ui/Marquee';
import AmbientBlobs from '@/components/ui/AmbientBlobs';
import ConstellationField from '@/components/ui/ConstellationField';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { imageUrl } from '@/services/api';

const VIDEO_MIME = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

function guessVideoType(url) {
    const clean = url?.split('?')[0] ?? '';
    const ext = clean.split('.').pop()?.toLowerCase();
    return VIDEO_MIME[ext] || 'video/mp4';
}

const TICKER_ITEMS = [
    'PURE INGREDIENTS', 'LAB-TESTED PURITY', 'FSSAI CERTIFIED', 'NO SHORTCUTS', 'HONESTLY MADE',
];

/**
 * Full-bleed "motion banner" — a scrolling ticker band running over either
 * a real admin-uploaded video, or (before one is uploaded) a living
 * animated backdrop of drifting blobs + a constellation field, so the
 * section never ships as an empty gap on a fresh install. This is the
 * "video running type banner" the redesign asked for.
 */
export default function VideoBanner() {
    const { content } = useSiteContent();
    const banner = content.videoBanner;
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(true);
    const reducedMotion = useReducedMotion();
    const hasVideo = Boolean(banner?.videoUrl);

    const aspectRatio = banner?.width && banner?.height ? `${banner.width} / ${banner.height}` : undefined;
    const hasOverlayText = Boolean(banner?.title || banner?.subtitle || banner?.ctaLabel);

    const toggleMute = () => {
        setMuted((m) => {
            const next = !m;
            if (videoRef.current) videoRef.current.muted = next;
            return next;
        });
    };

    return (
        <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw] overflow-hidden bg-ink" aria-label={banner?.title || 'Motion banner'}>
            <div className="relative w-full min-h-[52vh] sm:min-h-[60vh]" style={{ aspectRatio, maxHeight: '85vh' }}>
                {hasVideo && !reducedMotion ? (
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
                ) : hasVideo && banner.poster ? (
                    <img
                        src={imageUrl(banner.poster)}
                        alt=""
                        className="absolute inset-0 w-full h-full"
                        style={{ objectFit: banner.fit === 'contain' ? 'contain' : 'cover' }}
                    />
                ) : (
                    // Living fallback backdrop — bubbles + a drifting particle
                    // network standing in for footage until a real video exists.
                    <div className="absolute inset-0 bg-section-emerald">
                        <AmbientBlobs variant="dark" />
                        <ConstellationField variant="light" density={1.1} className="opacity-70" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" aria-hidden="true" />

                {/* Scrolling ticker band — the "running" motion element */}
                <div className="absolute top-0 inset-x-0 border-b border-cream/10 bg-black/20 backdrop-blur-[2px]">
                    <Marquee
                        speed={22}
                        className="py-2.5"
                        items={TICKER_ITEMS.map((t) => (
                            <span key={t} className="inline-flex items-center gap-2 type-eyebrow text-cream/80">
                                <Sparkles size={11} className="text-turmeric-light" />
                                {t}
                            </span>
                        ))}
                    />
                </div>

                <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-10 lg:p-14">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.7 }}
                        className="max-w-xl"
                    >
                        <p className="type-eyebrow text-turmeric-light/90 mb-2">
                            {hasOverlayText && banner.subtitle ? banner.subtitle : 'In Motion'}
                        </p>
                        <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl text-cream font-medium leading-tight mb-5">
                            {hasOverlayText && banner.title ? banner.title : (
                                <>Wellness that shows its work</>
                            )}
                        </h2>
                        <Link to={(hasOverlayText && banner.ctaHref) || '/shop'}>
                            <Button variant="turmeric" size="lg">
                                {(hasOverlayText && banner.ctaLabel) || 'Shop the Collection'}
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {hasVideo && !reducedMotion && (
                    <button
                        type="button"
                        onClick={toggleMute}
                        className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-cream backdrop-blur-sm transition-colors"
                        aria-label={muted ? 'Unmute video' : 'Mute video'}
                    >
                        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                )}
            </div>
        </section>
    );
}
