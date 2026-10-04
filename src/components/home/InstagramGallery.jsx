import SectionHeader from '@/components/ui/SectionHeader';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { hasInstagramUrl } from '@/utils/socialLinks';
import { imageUrl } from '@/services/api';

export default function InstagramGallery() {
    const { content } = useSiteContent();
    const { instagram, social } = content;
    const url = social.instagramUrl?.trim();
    const linked = hasInstagramUrl(url);
    const images = (instagram.images ?? []).slice(0, 6);
    if (images.length === 0) return null;

    const Tile = linked ? 'a' : 'div';
    const tileProps = linked ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {};

    return (
        <section className="section bg-canvas-alt">
            <div className="container-page">
                <SectionHeader eyebrow={instagram.subtitle} title={instagram.title} description={instagram.description} />
                <ul className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-6">
                    {images.map((src, i) => (
                        <li key={src}>
                            <Tile {...tileProps} className="group relative block aspect-square overflow-hidden rounded-md bg-surface" {...(linked ? { 'aria-label': `Open Instagram, photo ${i + 1}` } : {})}>
                                <img src={imageUrl(src)} alt="" width="300" height="300" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                {linked && (
                                    <span className="absolute inset-0 grid place-items-center bg-primary-deep/60 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                        <InstagramIcon size={24} />
                                    </span>
                                )}
                            </Tile>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
