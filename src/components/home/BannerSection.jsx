import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';

const isExternal = (href) => /^https?:\/\//i.test(href);

function BannerLink({ href, children, className }) {
    if (!href) return <div className={className}>{children}</div>;
    if (isExternal(href)) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
    }
    return <Link to={href} className={className}>{children}</Link>;
}

export function Banner({ banner, priority = false }) {
    const hasCaption = banner.title || banner.subtitle || banner.ctaLabel;
    return (
        <BannerLink href={banner.ctaHref} className="group relative block overflow-hidden rounded-xl bg-canvas-alt">
            <img
                src={imageUrl(banner.image, 1200)}
                alt={banner.title || 'Promotional banner'}
                width="1440"
                height="560"
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] sm:aspect-[18/7]"
            />
            {hasCaption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/50 to-transparent p-5 text-white sm:p-8">
                    {banner.subtitle && <p className="text-caption font-semibold uppercase tracking-widest">{banner.subtitle}</p>}
                    {banner.title && <p className="mt-1 font-display text-h3 text-white">{banner.title}</p>}
                    {banner.ctaLabel && <span className="mt-3 inline-block rounded-full bg-white px-5 py-2 text-small font-medium text-ink">{banner.ctaLabel}</span>}
                </div>
            )}
        </BannerLink>
    );
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One slide: edge-to-edge picture (phone artwork when provided) with an optional caption over a soft gradient. */
function SlideContent({ banner, priority, phoneRatio }) {
    const hasCaption = banner.title || banner.subtitle || banner.ctaLabel;
    return (
        <div className="relative size-full bg-canvas-alt">
            <picture>
                {banner.mobileImage && <source media="(max-width: 639px)" srcSet={imageUrl(banner.mobileImage, 900)} />}
                <img
                    src={imageUrl(banner.image, 1920)}
                    alt={banner.title || 'Promotional banner'}
                    width="1920"
                    height="720"
                    loading={priority ? 'eager' : 'lazy'}
                    fetchPriority={priority ? 'high' : undefined}
                    decoding="async"
                    className={`w-full object-cover ${phoneRatio} sm:aspect-[21/8]`}
                />
            </picture>
            {hasCaption && (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/70 via-ink/20 to-transparent sm:items-center sm:bg-gradient-to-r sm:from-ink/65 sm:via-ink/25 sm:to-transparent">
                    <div className="container-page pb-12 text-white sm:pb-0">
                        <div className="max-w-xl">
                            {banner.subtitle && <p className="text-caption font-semibold uppercase tracking-widest text-white/90">{banner.subtitle}</p>}
                            {banner.title && <p className="mt-1 font-display text-h2 text-white">{banner.title}</p>}
                            {banner.ctaLabel && <span className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-small font-medium text-ink">{banner.ctaLabel}</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Full-width banner slider (banners tagged "slider"/"both"): runs edge to edge, swipes natively on touch
 * (scroll-snap), auto-advances, pauses on hover/focus, and shows phone artwork on small screens when the admin
 * added it. Announcements, offers or plain brand images all work: a slide is just an image with optional text.
 */
export function BannerSlider() {
    const { banners, loading } = useBanners('slider');
    const trackRef = useRef(null);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = banners.length;
    const phoneRatio = banners.length > 0 && banners.every((b) => b.mobileImage) ? 'aspect-[4/5]' : 'aspect-[16/10]';

    const go = useCallback((next) => {
        const track = trackRef.current;
        if (!track) return;
        const target = (next + count) % count;
        track.scrollTo({ left: target * track.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, [count]);

    const onScroll = () => {
        const track = trackRef.current;
        if (track) setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    };

    useEffect(() => {
        if (count < 2 || paused || reducedMotion()) return undefined;
        const timer = setInterval(() => go(index + 1), 6000);
        return () => clearInterval(timer);
    }, [count, paused, index, go]);

    if (loading || count === 0) return null;

    return (
        <section
            className="relative bg-canvas"
            aria-roledescription="carousel"
            aria-label="Promotions"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div ref={trackRef} onScroll={onScroll} className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
                {banners.map((banner, i) => (
                    <div key={banner.id} className="w-full shrink-0 snap-start" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
                        <BannerLink href={banner.ctaHref} className="block">
                            <SlideContent banner={banner} priority={i === 0} phoneRatio={phoneRatio} />
                        </BannerLink>
                    </div>
                ))}
            </div>

            {count > 1 && (
                <>
                    <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="absolute left-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-md transition-colors hover:bg-surface sm:grid">
                        <ChevronLeft size={22} />
                    </button>
                    <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="absolute right-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-md transition-colors hover:bg-surface sm:grid">
                        <ChevronRight size={22} />
                    </button>
                    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                        {banners.map((banner, i) => (
                            <button key={banner.id} type="button" onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`} aria-current={i === index} className={`h-2 rounded-full shadow-sm transition-[width,background-color] duration-300 ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

/** Stacked promo banners (target "stacked"). */
export function PromoBanners() {
    const { banners, loading } = useBanners('stacked');
    if (loading || banners.length === 0) return null;
    return (
        <section className="bg-canvas py-6 sm:py-10">
            <div className="container-page grid gap-6">
                {banners.map((b) => <Banner key={b.id} banner={b} />)}
            </div>
        </section>
    );
}
