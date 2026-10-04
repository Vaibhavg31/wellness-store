import { useEffect, useState } from 'react';
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
                src={imageUrl(banner.image)}
                alt={banner.title || 'Promotional banner'}
                width="1440"
                height="560"
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] sm:aspect-[18/7]"
            />
            {hasCaption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-5 text-white sm:p-8">
                    {banner.subtitle && <p className="text-caption font-semibold uppercase tracking-widest">{banner.subtitle}</p>}
                    {banner.title && <p className="mt-1 font-display text-h3 text-white">{banner.title}</p>}
                    {banner.ctaLabel && <span className="mt-3 inline-block rounded-full bg-white px-5 py-2 text-small font-medium text-ink">{banner.ctaLabel}</span>}
                </div>
            )}
        </BannerLink>
    );
}

/** Rotating banner slider (target "slider"). */
export function BannerSlider() {
    const { banners, loading } = useBanners('slider');
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = banners.length;

    useEffect(() => {
        if (count < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
        return () => clearInterval(timer);
    }, [count, paused]);

    if (loading || count === 0) return null;
    const go = (next) => setIndex((next + count) % count);

    return (
        <section className="bg-canvas py-6 sm:py-10" aria-roledescription="carousel" aria-label="Promotions">
            <div className="container-page relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
                <div className="overflow-hidden rounded-xl">
                    <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
                        {banners.map((b, i) => (
                            <div key={b.id} className="w-full shrink-0" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={i !== index}>
                                <Banner banner={b} priority={i === 0} />
                            </div>
                        ))}
                    </div>
                </div>
                {count > 1 && (
                    <>
                        <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="absolute left-5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-md hover:bg-surface sm:left-7">
                            <ChevronLeft size={20} />
                        </button>
                        <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="absolute right-5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-md hover:bg-surface sm:right-7">
                            <ChevronRight size={20} />
                        </button>
                        <div className="mt-4 flex justify-center gap-2">
                            {banners.map((b, i) => (
                                <button key={b.id} type="button" onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`} aria-current={i === index} className={`h-2 rounded-full transition-[width,background-color] duration-300 ${i === index ? 'w-6 bg-primary' : 'w-2 bg-line-strong/50'}`} />
                            ))}
                        </div>
                    </>
                )}
            </div>
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
