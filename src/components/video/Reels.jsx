import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import AddToBag from '@/components/product/AddToBag';
import Price from '@/components/ui/Price';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { imageUrl } from '@/services/api';
import { videoSource } from '@/utils/videoEmbed';
import { trackEvent } from '@/utils/analytics';
import { cn } from '@/utils/formatPrice';

const VIDEO_MIME = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const videoType = (url) => VIDEO_MIME[url.split('?')[0].split('.').pop()?.toLowerCase()] || 'video/mp4';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dataSaver = () => Boolean(navigator.connection?.saveData);

/** The product a reel is about, with a button that puts it in the bag (and opens the bag). */
export function ReelProduct({ product, compact = false, onBuy }) {
    if (!product) return null;
    const bought = () => {
        trackEvent('reel_buy', { productId: product.id, path: window.location.pathname });
    };

    return (
        <div className={cn('flex flex-col gap-3', compact ? 'p-3' : 'p-4')}>
            <Link to={`/product/${product.id}`} onClick={onBuy} className="flex items-center gap-3">
                <img src={imageUrl(product.images?.[0], 120)} alt="" width="44" height="44" loading="lazy" className="size-11 shrink-0 rounded-md bg-canvas-alt object-cover" />
                <span className="min-w-0">
                    <span className="block truncate text-small font-medium text-ink">{product.title}</span>
                    <Price price={product.price} originalPrice={product.originalPrice} className="text-small" />
                </span>
            </Link>
            <AddToBag product={product} onFirstAdd={bought} />
        </div>
    );
}

/** Plays muted on a loop while it is mostly on screen and the visitor has not asked for less motion. */
export function ReelVideo({ reel, onOpen, label }) {
    const ref = useRef(null);
    const [playing, setPlaying] = useState(false);
    const source = videoSource(reel.videoUrl);
    const cover = reel.poster ? imageUrl(reel.poster, 600) : source.thumb;

    useEffect(() => {
        const node = ref.current;
        if (!node || source.kind !== 'file' || reducedMotion() || dataSaver()) return undefined;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) node.play().then(() => setPlaying(true)).catch(() => {});
            else { node.pause(); setPlaying(false); }
        }, { threshold: [0, 0.6, 1] });
        observer.observe(node);
        return () => observer.disconnect();
    }, [reel.videoUrl, source.kind]);

    return (
        <button type="button" onClick={onOpen} aria-label={`Play: ${label}`} className="group relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-ink">
            {source.kind === 'file' ? (
                <video ref={ref} className="absolute inset-0 size-full object-cover" muted loop playsInline preload="none" poster={reel.poster ? imageUrl(reel.poster, 600) : undefined}>
                    <source src={imageUrl(reel.videoUrl)} type={videoType(reel.videoUrl)} />
                </video>
            ) : cover ? (
                <img src={cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
            ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-primary-deep to-primary" aria-hidden="true" />
            )}
            <span className={cn('absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-ink/10 transition-opacity', playing && 'opacity-60')} aria-hidden="true" />
            <span className={cn('absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-primary shadow-md transition-opacity group-hover:opacity-100', playing ? 'opacity-0' : 'opacity-100')} aria-hidden="true">
                <Play size={20} className="ml-0.5" fill="currentColor" />
            </span>
        </button>
    );
}

/** The reel opened full screen, with sound, and its product underneath. Arrows (or swipe keys) go to the next reel. */
export function ReelViewer({ reels, index, productFor, onIndex, onClose }) {
    const panelRef = useDialog(true, onClose);
    const { mounted, closing } = usePresence(true);
    const reel = reels[index];
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight') onIndex((index + 1) % reels.length);
            if (e.key === 'ArrowLeft') onIndex((index - 1 + reels.length) % reels.length);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [index, reels.length, onIndex]);
    if (!mounted || !reel) return null;
    const product = productFor(reel);
    const source = videoSource(reel.videoUrl);

    return createPortal(
        <div className={cn('fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-3', closing && 'pointer-events-none')} onClick={onClose}>
            <div ref={panelRef} role="dialog" aria-modal="true" aria-label={reel.title || 'Video'} tabIndex={-1} onClick={(e) => e.stopPropagation()} className={cn('relative flex max-h-[94dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-surface shadow-lg focus:outline-none', closing ? 'animate-fade-down' : 'animate-fade-up')}>
                <div className="relative min-h-0 flex-1 bg-ink">
                    {source.kind === 'file' ? (
                        <video key={reel.id} className="mx-auto max-h-[68dvh] w-full object-contain" autoPlay loop playsInline controls poster={reel.poster ? imageUrl(reel.poster, 900) : undefined}>
                            <source src={imageUrl(reel.videoUrl)} type={videoType(reel.videoUrl)} />
                        </video>
                    ) : source.embed ? (
                        <div className={cn('mx-auto w-full', source.tall ? 'h-[68dvh]' : 'aspect-video')}>
                            <iframe key={reel.id} src={source.embed(true)} title={reel.title || 'Video'} className="size-full border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                        </div>
                    ) : source.kind === 'link' ? (
                        <div className="grid h-64 place-items-center px-6 text-center">
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-small font-semibold text-primary-deep"><Play size={16} fill="currentColor" aria-hidden="true" /> Watch this video</a>
                        </div>
                    ) : (
                        <img src={imageUrl(reel.poster, 900)} alt={reel.title} className="mx-auto max-h-[68dvh] w-full object-contain" />
                    )}
                    <button type="button" onClick={onClose} aria-label="Close video" className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-md"><X size={18} /></button>
                    {reels.length > 1 && (
                        <>
                            <button type="button" onClick={() => onIndex((index - 1 + reels.length) % reels.length)} aria-label="Previous video" className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink shadow-md"><ChevronLeft size={20} /></button>
                            <button type="button" onClick={() => onIndex((index + 1) % reels.length)} aria-label="Next video" className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink shadow-md"><ChevronRight size={20} /></button>
                        </>
                    )}
                </div>
                <ReelProduct product={product} onBuy={onClose} />
            </div>
        </div>,
        document.body,
    );
}

