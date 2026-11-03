import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const isExternal = (href) => /^https?:\/\//i.test(href);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function BannerLink({ href, children, className }) {
    if (!href) return <div className={className}>{children}</div>;
    if (isExternal(href)) return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
    return <Link to={href} className={className}>{children}</Link>;
}

/** One banner as a rounded picture card with its caption on a soft plum gradient. Also used for a product's information banners. */
export function Banner({ banner, priority = false }) {
    const hasCaption = banner.title || banner.subtitle || banner.ctaLabel;
    return (
        <BannerLink href={banner.ctaHref} className="group relative block overflow-hidden rounded-[1.75rem] bg-accent-tint">
            <picture>
                {banner.mobileImage && <source media="(max-width: 639px)" srcSet={imageUrl(banner.mobileImage, 800)} />}
                <img src={imageUrl(banner.image, 1400)} alt={banner.title || 'Promotional banner'} width="1440" height="560" loading={priority ? 'eager' : 'lazy'} decoding="async" className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] sm:aspect-[18/7]" />
            </picture>
            {hasCaption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-night/90 via-primary-night/55 to-transparent p-6 text-white sm:p-10">
                    {banner.subtitle && <p className="text-caption font-bold uppercase tracking-[0.16em] text-peach">{banner.subtitle}</p>}
                    {banner.title && <p className="mt-1.5 max-w-xl font-display text-h3 leading-tight text-white sm:text-h2">{banner.title}</p>}
                    {banner.ctaLabel && <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 text-small font-bold text-primary-deep">{banner.ctaLabel} <ArrowRight size={16} aria-hidden="true" /></span>}
                </div>
            )}
        </BannerLink>
    );
}

/**
 * The banners the admin uploads (Admin → Banners), as a swipeable slider with arrows and dots. It advances by itself every six seconds,
 * pauses while hovered or touched, and stays still for people who prefer reduced motion.
 */
export function BannerSlider() {
    const { banners, loading } = useBanners('slider');
    const track = useRef(null);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = banners.length;

    const go = useCallback((i) => {
        const node = track.current;
        if (!node || count === 0) return;
        const next = (i + count) % count;
        node.scrollTo({ left: next * node.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
        setIndex(next);
    }, [count]);

    useEffect(() => {
        if (count < 2 || paused || reducedMotion()) return undefined;
        const t = setInterval(() => go(index + 1), 6000);
        return () => clearInterval(t);
    }, [count, paused, index, go]);

    if (loading || count === 0) return null;
    return (
        <section aria-label="Featured" className="bg-canvas py-6 lg:py-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)}>
            <div className="container-page">
                <div className="relative">
                    <ul ref={track} onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto rounded-[1.75rem]">
                        {banners.map((b, i) => <li key={b.id} className="w-full shrink-0 snap-start"><Banner banner={b} priority={i === 0} /></li>)}
                    </ul>
                    {count > 1 && (
                        <>
                            <button type="button" onClick={() => go(index - 1)} aria-label="Previous banner" className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-ink shadow-md hover:text-primary sm:grid"><ChevronLeft size={20} aria-hidden="true" /></button>
                            <button type="button" onClick={() => go(index + 1)} aria-label="Next banner" className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-ink shadow-md hover:text-primary sm:grid"><ChevronRight size={20} aria-hidden="true" /></button>
                            <div className="absolute right-5 top-5 flex gap-1.5 rounded-full bg-primary-night/40 px-2.5 py-2 backdrop-blur" role="tablist" aria-label="Choose banner">
                                {banners.map((b, i) => <button key={b.id} type="button" role="tab" aria-selected={i === index} aria-label={`Banner ${i + 1}`} onClick={() => go(i)} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/55')} />)}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

/** Kept so the admin's "promo banners" switch still resolves; the v3 home page has no separate promo row. */
export function PromoBanners() { return null; }
