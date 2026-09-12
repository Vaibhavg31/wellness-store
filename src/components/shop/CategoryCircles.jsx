import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCategories } from '@/hooks/useApi';
import { CATEGORIES } from '@/constants';
import { imageUrl } from '@/services/api';

export default function CategoryCircles({ activeSlug, onSelect, linkMode = false }) {
    const { categories } = useCategories();

    const items = categories.length > 0
        ? categories.map((c) => ({ slug: c.slug, label: c.label, image: c.image }))
        : CATEGORIES.map((c) => ({ slug: c.id, label: c.label, image: c.image }));

    return (
        <div className="relative w-full mx-auto">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 bg-gradient-to-r from-ivory to-transparent z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 bg-gradient-to-l from-ivory to-transparent z-10" aria-hidden="true" />

            <div className="flex flex-nowrap gap-4 sm:gap-6 md:gap-8 py-0.5 sm:py-2 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-proximity px-4 sm:px-0 sm:justify-center">
                {items.map((cat, i) => {
                    const active = activeSlug === cat.slug;
                    const inner = (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-col items-center gap-1 sm:gap-2.5 flex-shrink-0 w-16 sm:w-24 md:w-28 group snap-start"
                        >
                            <div
                                className={`relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden transition-all duration-300 ${
                                    active
                                        ? 'ring-[1.5px] ring-wine ring-offset-1 sm:ring-2 sm:ring-offset-2 ring-offset-ivory shadow-md sm:shadow-lg shadow-wine/10 sm:scale-105'
                                        : 'ring-1 ring-border/50 sm:ring-border/60 group-hover:ring-wine/40 sm:group-hover:scale-105 sm:group-hover:shadow-md'
                                }`}
                                style={{
                                    background: 'radial-gradient(circle at 30% 30%, #FFF5F0 0%, #F5EBE5 45%, #F2B8B5 100%)',
                                }}
                            >
                                <div
                                    className="absolute inset-0 opacity-30 sm:opacity-40 pointer-events-none hidden sm:block"
                                    aria-hidden="true"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, rgba(217,178,111,0.5) 1px, transparent 1px), radial-gradient(circle, rgba(90,0,9,0.15) 1px, transparent 1px)',
                                        backgroundSize: '18px 18px, 24px 24px',
                                        backgroundPosition: '0 0, 12px 12px',
                                    }}
                                />
                                <img
                                    src={imageUrl(cat.image)}
                                    alt={cat.label}
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover object-center scale-[0.88] sm:scale-90 group-hover:scale-95 transition-transform duration-500"
                                />
                            </div>
                            <span className={`text-[9px] sm:text-[11px] tracking-wide text-center leading-tight max-w-[3.5rem] sm:max-w-none transition-colors ${
                                active ? 'text-wine font-medium' : 'text-charcoal/75 sm:text-charcoal/80 group-hover:text-wine'
                            }`}>
                                {cat.label}
                            </span>
                        </motion.div>
                    );

                    if (linkMode) {
                        return (
                            <Link key={cat.slug} to={`/category/${cat.slug}`} className="flex-shrink-0">
                                {inner}
                            </Link>
                        );
                    }

                    return (
                        <button
                            key={cat.slug}
                            type="button"
                            onClick={() => onSelect?.(cat.slug)}
                            className="flex-shrink-0 text-left"
                            aria-pressed={active}
                        >
                            {inner}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
