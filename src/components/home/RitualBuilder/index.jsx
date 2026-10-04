import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { Check, ArrowRight, ArrowLeft, RotateCcw, ShoppingBag } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';
import Button from '@/components/ui/Button';
import { formatPrice, cn } from '@/utils/formatPrice';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { GOALS, matchProducts, coverageScore } from '../wellnessRituals';
import { RHYTHMS, buildTimeline } from './rhythms';
import MatchRing from './MatchRing';

const MAX_GOALS = 2;
const STEP_LABELS = ['Your focus', 'Your rhythm', 'Your ritual'];

const stepVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
};

const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 24 } },
};

export default function RitualBuilder({ products = [] }) {
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);
    const [selectedGoals, setSelectedGoals] = useState([]);
    const [rhythmId, setRhythmId] = useState(RHYTHMS[1].id);
    const lineRef = useRef(null);
    const { addToCart } = useCart();
    const { showToast } = useToast();

    const goTo = (next) => {
        setDir(next > step ? 1 : -1);
        setStep(next);
    };

    const toggleGoal = (id) => {
        setSelectedGoals((prev) => {
            if (prev.includes(id)) return prev.filter((g) => g !== id);
            if (prev.length >= MAX_GOALS) return [prev[1], id];
            return [...prev, id];
        });
    };

    const candidates = useMemo(
        () => matchProducts(products, selectedGoals, { limit: 4 }),
        [products, selectedGoals],
    );
    const timeline = useMemo(() => buildTimeline(candidates, rhythmId), [candidates, rhythmId]);
    const coverage = useMemo(() => coverageScore(products, selectedGoals), [products, selectedGoals]);
    const allItems = useMemo(() => timeline.flatMap((slot) => slot.items), [timeline]);

    // A GSAP path-draw for the connecting line under the ritual timeline —
    // reserved for this one moment because it's the kind of "reveal a
    // structure that already exists" effect GSAP's DrawSVG-style tweening
    // does better than spring physics.
    const onResultMount = (node) => {
        lineRef.current = node;
        if (!node) return;
        const length = node.getTotalLength();
        gsap.set(node, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(node, { strokeDashoffset: 0, duration: 1, delay: 0.15, ease: 'power2.out' });
    };

    const handleAddRitual = () => {
        if (!allItems.length) return;
        allItems.forEach(({ product }) => addToCart(product, 1));
        showToast(`${allItems.length} ritual item${allItems.length > 1 ? 's' : ''} added to your bag`, 'success');
    };

    const restart = () => {
        setSelectedGoals([]);
        setRhythmId(RHYTHMS[1].id);
        goTo(0);
    };

    return (
        <section className="py-20 md:py-28 bg-cream" aria-label="Build your ritual">
            <div className="max-w-5xl mx-auto px-6 lg:px-12">
                <SectionTitle
                    subtitle="Personalize"
                    title="Build Your Ritual"
                    description="Two questions, and we'll assemble the routine your day is actually missing — from what's already in the shop."
                />

                <div className="rounded-3xl border border-border bg-white/60 shadow-[0_20px_60px_rgba(36, 23, 32,0.06)] overflow-hidden">
                    {/* Step rail */}
                    <div className="flex items-center gap-2 px-6 sm:px-10 pt-8">
                        {STEP_LABELS.map((label, i) => (
                            <div key={label} className="flex-1 flex items-center gap-2">
                                <div className="flex flex-col gap-2 flex-1">
                                    <span className={cn('text-[11px] uppercase tracking-[0.14em]', i <= step ? 'text-emerald font-medium' : 'text-ink/35')}>
                                        {label}
                                    </span>
                                    <div className="h-1 rounded-full bg-sand overflow-hidden">
                                        <motion.div
                                            className="h-full bg-emerald rounded-full"
                                            initial={false}
                                            animate={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
                                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 sm:p-10 min-h-[420px] flex flex-col">
                        <AnimatePresence mode="wait" custom={dir}>
                            {step === 0 && (
                                <motion.div
                                    key="step-0"
                                    custom={dir}
                                    variants={stepVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex-1"
                                >
                                    <p className="text-ink/60 mb-6 font-light">
                                        What do you want your body to be better at? Pick up to {MAX_GOALS}.
                                    </p>
                                    <motion.div
                                        variants={listVariants}
                                        initial="hidden"
                                        animate="show"
                                        className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
                                    >
                                        {GOALS.map((goal) => {
                                            const Icon = goal.icon;
                                            const selected = selectedGoals.includes(goal.id);
                                            return (
                                                <motion.button
                                                    key={goal.id}
                                                    type="button"
                                                    variants={itemVariants}
                                                    whileHover={{ scale: 1.03 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => toggleGoal(goal.id)}
                                                    aria-pressed={selected}
                                                    className={cn(
                                                        'relative text-left rounded-2xl border p-4 transition-colors duration-200',
                                                        selected
                                                            ? 'border-emerald bg-emerald/[0.06] shadow-[0_0_0_3px_rgba(96, 36, 96,0.12)]'
                                                            : 'border-border bg-white hover:border-emerald/40',
                                                    )}
                                                >
                                                    <AnimatePresence>
                                                        {selected && (
                                                            <motion.span
                                                                initial={{ scale: 0, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0, opacity: 0 }}
                                                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                                className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald flex items-center justify-center"
                                                            >
                                                                <Check size={12} className="text-cream" />
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                    <Icon size={20} className={selected ? 'text-emerald' : 'text-ink/50'} />
                                                    <p className="mt-3 text-sm font-medium text-ink">{goal.label}</p>
                                                    <p className="mt-1 text-xs text-ink/50 leading-snug">{goal.blurb}</p>
                                                </motion.button>
                                            );
                                        })}
                                    </motion.div>
                                </motion.div>
                            )}

                            {step === 1 && (
                                <motion.div
                                    key="step-1"
                                    custom={dir}
                                    variants={stepVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex-1"
                                >
                                    <p className="text-ink/60 mb-6 font-light">When does taking care of yourself actually fit into your day?</p>
                                    <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {RHYTHMS.map((rhythm) => {
                                            const Icon = rhythm.icon;
                                            const selected = rhythmId === rhythm.id;
                                            return (
                                                <motion.button
                                                    key={rhythm.id}
                                                    type="button"
                                                    variants={itemVariants}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setRhythmId(rhythm.id)}
                                                    aria-pressed={selected}
                                                    className={cn(
                                                        'text-left rounded-2xl border p-5 transition-colors duration-200',
                                                        selected
                                                            ? 'border-emerald bg-emerald/[0.06] shadow-[0_0_0_3px_rgba(96, 36, 96,0.12)]'
                                                            : 'border-border bg-white hover:border-emerald/40',
                                                    )}
                                                >
                                                    <Icon size={22} className={selected ? 'text-emerald' : 'text-ink/50'} />
                                                    <p className="mt-3 text-sm font-medium text-ink">{rhythm.label}</p>
                                                    <p className="mt-1 text-xs text-ink/50 leading-snug">{rhythm.blurb}</p>
                                                </motion.button>
                                            );
                                        })}
                                    </motion.div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step-2"
                                    custom={dir}
                                    variants={stepVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex-1"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                        <div>
                                            <p className="text-sm font-medium text-ink">Your ritual is ready</p>
                                            <p className="text-xs text-ink/50 mt-0.5">Matched from what's currently in stock.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MatchRing value={allItems.length ? coverage : 0} />
                                            <span className="text-xs text-ink/50 max-w-[7rem] leading-snug">catalog match for your goals</span>
                                        </div>
                                    </div>

                                    {allItems.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-ink/50 text-sm">
                                            Go back and pick a focus — we'll build the routine from there.
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <svg className="absolute left-0 right-0 top-9 hidden sm:block" height="2" width="100%" preserveAspectRatio="none">
                                                <line ref={onResultMount} x1="16%" y1="1" x2="84%" y2="1" stroke="#C08A3E" strokeWidth="2" strokeOpacity="0.4" />
                                            </svg>
                                            <motion.div
                                                variants={listVariants}
                                                initial="hidden"
                                                animate="show"
                                                className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 relative"
                                            >
                                                {timeline.map((slot) => (
                                                    <motion.div key={slot.id} variants={itemVariants} className="flex flex-col items-center text-center">
                                                        <span className="w-3 h-3 rounded-full bg-turmeric border-2 border-cream shadow mb-3" />
                                                        <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">{slot.label}</p>
                                                        {slot.items.length === 0 ? (
                                                            <div className="w-full rounded-xl border border-dashed border-border p-4 text-xs text-ink/40">
                                                                Nothing extra needed here
                                                            </div>
                                                        ) : (
                                                            <div className="w-full space-y-3">
                                                                {slot.items.map(({ product }) => (
                                                                    <Link
                                                                        key={product.id}
                                                                        to={`/product/${product.id}`}
                                                                        className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 text-left hover:border-emerald/40 transition-colors"
                                                                    >
                                                                        <img
                                                                            src={product.images?.[0]}
                                                                            alt=""
                                                                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-sand"
                                                                            loading="lazy"
                                                                        />
                                                                        <span className="min-w-0">
                                                                            <span className="block text-xs font-medium text-ink truncate">{product.title}</span>
                                                                            <span className="block text-xs text-ink/50 mt-0.5">{formatPrice(product.price)}</span>
                                                                        </span>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Nav */}
                        <div className="flex items-center justify-between pt-8 mt-auto">
                            <button
                                type="button"
                                onClick={() => (step === 0 ? undefined : goTo(step - 1))}
                                className={cn(
                                    'inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-ink/60 hover:text-ink transition-colors',
                                    step === 0 && 'invisible',
                                )}
                            >
                                <ArrowLeft size={14} /> Back
                            </button>

                            {step < 2 ? (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => goTo(step + 1)}
                                    disabled={step === 0 && selectedGoals.length === 0}
                                    className="gap-2"
                                >
                                    {step === 0 ? 'Next' : 'Build my ritual'}
                                    <ArrowRight size={14} />
                                </Button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={restart}
                                        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-ink/50 hover:text-ink transition-colors"
                                    >
                                        <RotateCcw size={13} /> Start over
                                    </button>
                                    <Button variant="turmeric" size="sm" onClick={handleAddRitual} disabled={!allItems.length} className="gap-2">
                                        <ShoppingBag size={15} />
                                        Add ritual to bag
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
