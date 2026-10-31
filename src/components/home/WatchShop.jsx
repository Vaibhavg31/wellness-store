import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, ShoppingBag, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import { useSiteContent } from '@/contexts/SiteContentContext';
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
function ReelProduct({ product, compact = false, onBuy }) {
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
function ReelVideo({ reel, onOpen, label }) {
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
            {reel.title && <span className="absolute inset-x-0 bottom-0 p-3 text-left text-small font-medium text-white">{reel.title}</span>}
        </button>
    );
}

/** The reel opened full screen, with sound, and its product underneath. Arrows (or swipe keys) go to the next reel. */
function ReelViewer({ reels, index, productFor, onIndex, onClose }) {
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

/** "Watch & Shop": short videos, each tied to a product that can be bought from right there. Managed in Content → Homepage. */
export default function WatchShop({ products }) {
    const { content } = useSiteContent();
    const { title, subtitle, reels } = content.extras.watchShop;
    const [openIndex, setOpenIndex] = useState(null);
    const scroller = useRef(null);
    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
    const productFor = useCallback((reel) => byId.get(reel.productId) ?? null, [byId]);
    const close = useCallback(() => setOpenIndex(null), []);

    if (reels.length === 0) return null;
    const slide = (direction) => scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' });

    return (
        <section aria-labelledby="watch-shop-title" className="section bg-canvas-alt">
            <div className="container-page">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div className="mx-auto text-center">
                        <h2 id="watch-shop-title">{title}</h2>
                        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
                    </div>
                </div>
                <div className="group/rail relative">
                    <ul ref={scroller} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-3 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:justify-center lg:scroll-pl-0 lg:px-0">
                        {reels.map((reel, i) => {
                            const product = productFor(reel);
                            return (
                                <li key={reel.id} className="w-[62%] shrink-0 snap-start sm:w-[38%] md:w-[28%] lg:w-[calc(20%-0.8rem)]">
                                    <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
                                        <ReelVideo reel={reel} label={reel.title || product?.title || 'video'} onOpen={() => { setOpenIndex(i); trackEvent('reel_open', { productId: reel.productId || undefined, path: window.location.pathname }); }} />
                                        <ReelProduct product={product} compact />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {reels.length > 5 && (
                        <>
                            <button type="button" onClick={() => slide(-1)} aria-label="Scroll videos left" className="absolute -left-5 top-[35%] hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md hover:border-primary hover:text-primary lg:grid"><ChevronLeft size={20} /></button>
                            <button type="button" onClick={() => slide(1)} aria-label="Scroll videos right" className="absolute -right-5 top-[35%] hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md hover:border-primary hover:text-primary lg:grid"><ChevronRight size={20} /></button>
                        </>
                    )}
                </div>
            </div>
            {openIndex !== null && <ReelViewer reels={reels} index={openIndex} productFor={productFor} onIndex={setOpenIndex} onClose={close} />}
        </section>
    );
}
