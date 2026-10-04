import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

export default function CertifiedBanner() {
    const { content } = useSiteContent();
    const banner = content.certifiedBanner;

    return (
        <section className="section bg-canvas-alt">
            <div className="container-page grid items-center gap-8 overflow-hidden rounded-xl bg-primary-tint p-6 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
                <div>
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-caption font-semibold text-primary-deep">
                        <ShieldCheck size={14} aria-hidden="true" /> {banner.badge}
                    </p>
                    <h2>{banner.title}</h2>
                    <p className="mt-4 max-w-md text-lead text-muted">{banner.description}</p>
                    <Link to={banner.ctaHref || '/about'} className="mt-7 inline-block"><Button size="lg">{banner.ctaLabel}</Button></Link>
                </div>
                {banner.image && (
                    <img src={imageUrl(banner.image, 700)} alt="" width="700" height="460" loading="lazy" decoding="async" className="aspect-[3/2] w-full rounded-lg object-cover" />
                )}
            </div>
        </section>
    );
}
