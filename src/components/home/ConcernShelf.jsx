import { Link } from 'react-router-dom';
import SectionHeader from '@/components/ui/SectionHeader';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

/** "Shop by concern": goal-led entry points set in the admin. Renders nothing until at least one is added. */
export default function ConcernShelf() {
    const { content } = useSiteContent();
    const concerns = content.extras.concerns;
    if (concerns.length === 0) return null;

    return (
        <section className="section">
            <div className="container-page">
                <SectionHeader eyebrow="Shop by concern" title="Start with what you want to improve" />
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {concerns.map((concern) => (
                        <li key={concern.label}>
                            <Link
                                to={concern.search ? `/shop?search=${encodeURIComponent(concern.search)}` : '/shop'}
                                className="group flex h-full items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-primary hover:bg-primary-soft"
                            >
                                {concern.image ? (
                                    <img src={imageUrl(concern.image, 120)} alt="" width="48" height="48" loading="lazy" className="size-12 shrink-0 rounded-full object-cover" />
                                ) : (
                                    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-tint font-display text-h4 text-primary-deep">{concern.label.charAt(0)}</span>
                                )}
                                <span className="text-small font-medium text-ink group-hover:text-primary-deep">{concern.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
