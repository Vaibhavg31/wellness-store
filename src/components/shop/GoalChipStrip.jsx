import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GOALS } from '@/components/home/wellnessRituals';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Fade-up stagger, matching the container/item convention already used
// across the site's other homepage sections (staggerChildren + delayChildren,
// eased fade+translateY) — reused here rather than inventing a new curve.
const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * "Shop by Goal" quick-nav — the primary, goal-first way to browse this
 * catalog (Energy, Immunity, Strength, Gut, Skin & Hair, Sleep, Heart,
 * Joints), the way Kapiva/OZiva/HealthKart structure discovery. Reused in
 * the hero, the homepage Categories section, and the shop page's category
 * row — one component, one visual language, everywhere goals are browsable.
 *
 * `eager` skips the scroll-triggered reveal for above-the-fold placements
 * (the hero) where the strip is visible on load.
 */
export default function GoalChipStrip({ activeGoal = null, eager = false, className = '' }) {
    const reducedMotion = useReducedMotion();
    const animProps = reducedMotion
        ? { initial: 'show', animate: 'show' }
        : eager
            ? { initial: 'hidden', animate: 'show' }
            : { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-60px' } };

    return (
        <motion.div
            variants={container}
            {...animProps}
            className={`flex flex-nowrap gap-2.5 sm:gap-3 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-proximity px-4 sm:px-0 sm:flex-wrap sm:justify-center ${className}`}
        >
            {GOALS.map((goal) => {
                const Icon = goal.icon;
                const active = activeGoal === goal.id;
                return (
                    <motion.div key={goal.id} variants={item} className="flex-shrink-0 snap-start">
                        <Link
                            to={`/shop?goal=${goal.id}`}
                            className={`group inline-flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full border transition-all duration-300 ${
                                active
                                    ? 'bg-forest text-cream border-forest shadow-sm'
                                    : 'bg-cream text-ink border-border/70 hover:border-forest/40 hover:bg-forest/5'
                            }`}
                        >
                            <span
                                className={`flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 transition-colors ${
                                    active ? 'bg-cream/15 text-cream' : 'bg-forest/8 text-forest group-hover:bg-forest/12'
                                }`}
                            >
                                <Icon size={14} strokeWidth={1.75} />
                            </span>
                            <span className="type-eyebrow-sm whitespace-nowrap">{goal.label}</span>
                        </Link>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
