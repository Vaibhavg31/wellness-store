import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCategories } from '@/hooks/useApi';
import { CATEGORIES } from '@/constants';
import { imageUrl } from '@/services/api';
import GoalChipStrip from '@/components/shop/GoalChipStrip';

/**
 * Two-row category browsing — replaces the old circular blush-toned photo
 * bubbles (a fashion/jewelry-site pattern) with the DTC-supplement
 * convention: goal-first browsing up top, product-type tiles underneath.
 *
 *   1. Primary — the "Shop by Goal" chip strip (same component as the hero).
 *   2. Secondary — product-type categories (Protein & Fitness, Vitamins &
 *      Immunity, Herbal & Ayurvedic, Superfoods, ...) as rounded rectangular
 *      tiles, not circles.
 */
export default function CategoryCircles({ activeSlug, activeGoal = null, onSelect, linkMode = false }) {
    const { categories } = useCategories();

    const items = categories.length > 0
        ? categories.map((c) => ({ slug: c.slug, label: c.label, image: c.image }))
        : CATEGORIES.map((c) => ({ slug: c.id, label: c.label, image: c.image }));

    return (
        <div className="space-y-6 sm:space-y-8">
            <div>
                <p className="text-center type-eyebrow text-slate mb-4">Shop by Goal</p>
                <GoalChipStrip activeGoal={activeGoal} />
            </div>

            <div className="relative w-full mx-auto">
                <p className="text-center type-eyebrow text-slate mb-4">Shop by Category</p>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 bg-gradient-to-r from-cream to-transparent z-10" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 bg-gradient-to-l from-cream to-transparent z-10" aria-hidden="true" />

                <div className="flex flex-nowrap gap-3 sm:gap-4 md:gap-5 py-0.5 sm:py-2 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-proximity px-4 sm:px-0 sm:flex-wrap sm:justify-center">
                    {items.map((cat, i) => {
                        const active = activeSlug === cat.slug;
                        const inner = (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className="flex-shrink-0 w-32 sm:w-40 md:w-44 group snap-start"
                            >
                                <div
                                    className={`relative aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-300 ${
                                        active
                                            ? 'ring-2 ring-forest ring-offset-2 ring-offset-cream shadow-md'
                                            : 'ring-1 ring-border/60 group-hover:ring-forest/40 group-hover:shadow-md'
                                    }`}
                                >
                                    <img
                                        src={imageUrl(cat.image)}
                                        alt={cat.label}
                                        loading="lazy"
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent" aria-hidden="true" />
                                    <span className="absolute bottom-2.5 left-3 right-3 text-[11px] sm:text-xs font-semibold text-cream leading-tight">
                                        {cat.label}
                                    </span>
                                </div>
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
        </div>
    );
}
