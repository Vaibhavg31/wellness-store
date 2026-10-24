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
        <section className="section bg-canvas-alt pb-8 lg:pb-10">
            <div className="container-page">
                <SectionHeader eyebrow="Shop by category" title="Find what your body needs" />
                <ul className="flex flex-wrap justify-center gap-4 lg:gap-6">
                    {items.slice(0, 8).map((cat, i) => (
                        <Reveal as="li" key={cat.slug} delay={i * 50} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.67rem)] lg:w-[calc(25%-1.125rem)]">
                            <Link to={`/category/${cat.slug}`} className="group block">
                                <div className="aspect-square overflow-hidden rounded-lg bg-surface">
                                    <img src={imageUrl(cat.image, 400)} alt="" width="400" height="400" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
