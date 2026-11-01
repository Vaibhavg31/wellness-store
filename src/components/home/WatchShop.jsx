import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ReelProduct, ReelVideo, ReelViewer } from '@/components/video/Reels';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { trackEvent } from '@/utils/analytics';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
                    <ul ref={scroller} className={cn('scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-3 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:scroll-pl-0 lg:px-0', reels.length <= 5 && 'lg:justify-center')}>
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
