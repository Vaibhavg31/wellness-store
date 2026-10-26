import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Check, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import Reveal from '@/components/ui/Reveal';
import { ROUTINES } from '@/data/routines';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * "Build your routine": choose a goal, see a three-step routine of real products (when to take it and why), with the
 * live total and one button that adds the whole routine to the bag. Everything shown comes from the catalogue.
 */
export default function RoutineBuilder({ products = [] }) {
    const { eyebrow, title, description, goals } = ROUTINES;
    const reduced = useReducedMotion();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [goalId, setGoalId] = useState(goals[0].id);
    const [added, setAdded] = useState(false);

    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
    const resolved = useMemo(() => goals
        .map((g) => ({ ...g, steps: g.steps.map((s) => ({ ...s, product: byId.get(s.productId) })).filter((s) => s.product && s.product.stock !== 0) }))
        .filter((g) => g.steps.length >= 2), [goals, byId]);

    const goal = resolved.find((g) => g.id === goalId) ?? resolved[0];
    if (!goal) return null;

    const unique = [...new Map(goal.steps.map((s) => [s.product.id, s.product])).values()];
    const total = unique.reduce((sum, p) => sum + p.price, 0);
    const original = unique.reduce((sum, p) => sum + Math.max(p.originalPrice || 0, p.price), 0);
    const saving = original - total;

    const addAll = () => {
        const ok = unique.map((p) => addToCart(p, 1));
        if (ok.every(Boolean)) {
            setAdded(true);
            showToast(`Added your ${goal.label.toLowerCase()} routine to the bag`, 'success');
            setTimeout(() => setAdded(false), 2200);
        } else showToast('Some items could not be added. Please check stock.', 'error');
    };

    return (
        <LazyMotion features={domAnimation}>
            <section className="section bg-canvas" aria-labelledby="routine-title">
                <div className="container-page">
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-12">
                        <div className="max-w-xl">
                            <p className="eyebrow mb-3">{eyebrow}</p>
                            <h2 id="routine-title">{title}</h2>
                        </div>
                        <p className="max-w-xs text-small text-muted">{description}</p>
                    </div>

                    <Reveal>
                        <div role="tablist" aria-label="Your goal" className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                            {resolved.map((g) => {
                                const selected = g.id === goal.id;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        onClick={() => { setGoalId(g.id); setAdded(false); }}
                                        className={cn('shrink-0 rounded-full px-5 py-2.5 text-small font-medium transition-colors', selected ? 'bg-primary text-white shadow-md' : 'bg-surface text-ink ring-1 ring-line hover:bg-primary-tint')}
                                    >
                                        {g.label}
                                    </button>
                                );
                            })}
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                            <m.div
                                key={goal.id}
                                role="tabpanel"
                                initial={reduced ? false : { opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
                            >
                                <p className="mb-6 font-display text-h4 text-ink">{goal.summary}</p>
                                <ol className="relative grid gap-4 md:grid-cols-3 md:gap-6">
                                    {goal.steps.map((step, i) => (
                                        <li key={`${step.when}-${step.product.id}`} className="relative flex gap-4 rounded-xl bg-surface p-4 shadow-sm ring-1 ring-line md:flex-col md:p-5">
                                            <Link to={`/product/${step.product.id}`} className="block size-24 shrink-0 overflow-hidden rounded-lg bg-canvas-alt md:aspect-[4/3] md:size-auto" aria-label={step.product.title}>
                                                <img src={imageUrl(step.product.images?.[0], 480)} alt="" width="480" height="360" loading="lazy" className="size-full object-cover" />
                                            </Link>
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">
                                                    <span className="grid size-6 place-items-center rounded-full bg-accent-tint font-display text-small normal-case tracking-normal text-accent-ink">{i + 1}</span>
                                                    {step.when}
                                                </p>
                                                <Link to={`/product/${step.product.id}`} className="mt-2 block font-medium text-ink hover:text-primary">{step.product.title}</Link>
                                                <p className="mt-1 text-small text-muted">{step.why}</p>
                                                <Price price={step.product.price} originalPrice={step.product.originalPrice} className="mt-2" />
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </m.div>
                        </AnimatePresence>

                        <div className="mt-6 flex flex-col gap-4 rounded-xl bg-primary-tint p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                            <div>
                                <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary-deep">Your {goal.label.toLowerCase()} routine</p>
                                <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                                    <span className="font-display text-h3 text-ink">{formatPrice(total)}</span>
                                    {saving > 0 && <span className="text-small text-muted"><span className="line-through">{formatPrice(original)}</span> · you save {formatPrice(saving)}</span>}
                                </p>
                            </div>
                            <Button size="lg" onClick={addAll} className={cn('w-full sm:w-auto', added && '!bg-success')}>
                                {added ? <><Check size={18} aria-hidden="true" /> Added to bag</> : <><ShoppingBag size={18} aria-hidden="true" /> Add whole routine to bag</>}
                            </Button>
                        </div>
                    </Reveal>
                </div>
            </section>
        </LazyMotion>
    );
}
