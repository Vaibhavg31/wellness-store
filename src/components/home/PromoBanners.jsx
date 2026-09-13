import { Link } from 'react-router-dom';
import { imageUrl } from '@/services/api';
import { useBanners } from '@/hooks/useApi';

export default function PromoBanners() {
    const { banners, loading } = useBanners('stacked');

    if (!loading && banners.length === 0) return null;

    return (
        <section className="py-8 sm:py-12 md:py-16 bg-cream">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
                {loading ? (
                    <div className="aspect-[21/9] sm:aspect-[3/1] rounded-2xl bg-sand/60 animate-pulse" />
                ) : (
                    banners.map((banner) => {
                        const content = (
                            <div className="relative aspect-[16/9] sm:aspect-[3/1] rounded-2xl overflow-hidden group">
                                <img
                                    src={imageUrl(banner.image)}
                                    alt={banner.title || 'Promotional banner'}
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                {(banner.title || banner.subtitle || banner.ctaLabel) && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent flex flex-col justify-end p-5 sm:p-8">
                                        {banner.subtitle && (
                                            <p className="text-cream/80 text-xs sm:text-sm tracking-[0.15em] uppercase mb-1.5">
                                                {banner.subtitle}
                                            </p>
                                        )}
                                        {banner.title && (
                                            <h3 className="font-display text-xl sm:text-3xl text-cream mb-2 sm:mb-4 max-w-lg">
                                                {banner.title}
                                            </h3>
                                        )}
                                        {banner.ctaLabel && (
                                            <span className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-ink bg-cream px-4 sm:px-5 py-2 sm:py-2.5 rounded-sm w-fit font-medium group-hover:bg-turmeric transition-colors">
                                                {banner.ctaLabel}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );

                        if (!banner.ctaHref) {
                            return <div key={banner.id}>{content}</div>;
                        }
                        if (/^https?:\/\//i.test(banner.ctaHref)) {
                            return (
                                <a key={banner.id} href={banner.ctaHref} target="_blank" rel="noopener noreferrer">
                                    {content}
                                </a>
                            );
                        }
                        return <Link key={banner.id} to={banner.ctaHref}>{content}</Link>;
                    })
                )}
            </div>
        </section>
    );
}
