import { Link } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

/**
 * Renamed from AntiTarnishBanner — the rendered copy ("Purity You Can
 * Verify", FSSAI/GMP claims) was already wellness-appropriate, only the
 * component's jewelry-flavored name needed to change.
 */
export default function CertifiedBanner() {
    const { content } = useSiteContent();
    const banner = content.certifiedBanner;

    return (
        <section className="py-16 md:py-20 px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald via-forest to-forest-deep text-cream">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-turmeric/30 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-sage-light/20 rounded-full blur-3xl" />
                    </div>
                    <div className="relative grid lg:grid-cols-2 gap-10 items-center p-10 md:p-14 lg:p-16">
                        <div>
                            <span className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-turmeric mb-5">
                                <Shield size={14} />
                                {banner.badge}
                            </span>
                            <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight mb-5">
                                {banner.title}
                            </h2>
                            <p className="text-cream/70 font-light leading-relaxed max-w-lg mb-8">
                                {banner.description}
                            </p>
                            <Link to={banner.ctaHref || '/shop'}>
                                <Button variant="turmeric" size="lg" className="group">
                                    {banner.ctaLabel}
                                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                        <div className="hidden lg:block">
                            <img
                                src={imageUrl(banner.image)}
                                alt={banner.title}
                                loading="lazy"
                                className="w-full aspect-[4/3] object-cover rounded-2xl border border-cream/10 shadow-2xl"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
