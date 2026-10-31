import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, ShoppingBag, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import { useCart } from '@/contexts/CartContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { imageUrl } from '@/services/api';
import { trackEvent } from '@/utils/analytics';
import { cn } from '@/utils/formatPrice';

const VIDEO_MIME = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const videoType = (url) => VIDEO_MIME[url.split('?')[0].split('.').pop()?.toLowerCase()] || 'video/mp4';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dataSaver = () => Boolean(navigator.connection?.saveData);

/** The product a reel is about, with a button that puts it in the bag and goes straight to checkout. */
export function ReelProduct({ product, compact = false, onBuy }) {
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const navigate = useNavigate();
    if (!product) return null;
    const outOfStock = typeof product.stock === 'number' && product.stock <= 0;

    const buy = () => {
        if (outOfStock) return showToast('Out of stock', 'error');
        if (addToCart(product)) {
            showCartToast(showToast, product, 'Added. Proceeding to checkout');
            trackEvent('reel_buy', { productId: product.id, path: window.location.pathname });
            onBuy?.();
            navigate('/checkout');
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
        }
        return undefined;
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
            <Button size="sm" disabled={outOfStock} onClick={buy} className="w-full"><ShoppingBag size={15} aria-hidden="true" /> {outOfStock ? 'Sold out' : 'Buy now'}</Button>
        </div>
    );
}

/** Plays muted on a loop while it is mostly on screen and the visitor has not asked for less motion. */
export function ReelVideo({ reel, onOpen, label }) {
    const ref = useRef(null);
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || !reel.videoUrl || reducedMotion() || dataSaver()) return undefined;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) node.play().then(() => setPlaying(true)).catch(() => {});
            else { node.pause(); setPlaying(false); }
        }, { threshold: [0, 0.6, 1] });
        observer.observe(node);
        return () => observer.disconnect();
    }, [reel.videoUrl]);

    return (
        <button type="button" onClick={onOpen} aria-label={`Play: ${label}`} className="group relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-ink">
            {reel.videoUrl ? (
                <video ref={ref} className="absolute inset-0 size-full object-cover" muted loop playsInline preload="none" poster={reel.poster ? imageUrl(reel.poster, 600) : undefined}>
                    <source src={imageUrl(reel.videoUrl)} type={videoType(reel.videoUrl)} />
                </video>
            ) : (
                <img src={imageUrl(reel.poster, 600)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
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

    return createPortal(
        <div className={cn('fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-3', closing && 'pointer-events-none')} onClick={onClose}>
            <div ref={panelRef} role="dialog" aria-modal="true" aria-label={reel.title || 'Video'} tabIndex={-1} onClick={(e) => e.stopPropagation()} className={cn('relative flex max-h-[94dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-surface shadow-lg focus:outline-none', closing ? 'animate-fade-down' : 'animate-fade-up')}>
                <div className="relative min-h-0 flex-1 bg-ink">
                    {reel.videoUrl ? (
                        <video key={reel.id} className="mx-auto max-h-[68dvh] w-full object-contain" autoPlay loop playsInline controls poster={reel.poster ? imageUrl(reel.poster, 900) : undefined}>
                            <source src={imageUrl(reel.videoUrl)} type={videoType(reel.videoUrl)} />
                        </video>
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

