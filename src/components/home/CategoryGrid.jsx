import { Link } from 'react-router-dom';
import SectionHeader from '@/components/ui/SectionHeader';
import Reveal from '@/components/ui/Reveal';
import { useCategories } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { CATEGORIES } from '@/constants';

export default function CategoryGrid() {
    const { categories } = useCategories();
    const items = categories.length > 0
        ? categories.map((c) => ({ slug: c.slug, label: c.label, image: c.image }))
        : CATEGORIES.map((c) => ({ slug: c.id, label: c.label, image: c.image }));

    return (
        <section className="section bg-canvas-alt">
            <div className="container-page">
                <SectionHeader eyebrow="Shop by category" title="Find what your body needs" />
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                    {items.slice(0, 8).map((cat, i) => (
                        <Reveal as="li" key={cat.slug} delay={i * 50}>
                            <Link to={`/category/${cat.slug}`} className="group block">
                                <div className="aspect-square overflow-hidden rounded-lg bg-surface">
                                    <img src={imageUrl(cat.image)} alt="" width="400" height="400" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <p className="mt-3 text-center font-display text-h4 transition-colors group-hover:text-primary">{cat.label}</p>
                            </Link>
                        </Reveal>
                    ))}
                </ul>
            </div>
        </section>
    );
}
