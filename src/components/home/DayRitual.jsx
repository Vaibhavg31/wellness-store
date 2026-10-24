import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShoppingBag } from 'lucide-react';
import { LazyMotion, domAnimation, m, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import SectionHeader from '@/components/ui/SectionHeader';
import { DAY_RITUAL } from '@/data/dayRitual';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const HOLD_VH = 75; // scroll distance per stage, in viewport heights

/** A small sun that travels across an arc as the day goes by. */
function DayArc({ progress, count }) {
    const t = useTransform(progress, (p) => clamp(p / (count - 1), 0, 1));
    const cx = useTransform(t, (v) => 110 - 100 * Math.cos(Math.PI * v));
    const cy = useTransform(t, (v) => 66 - 56 * Math.sin(Math.PI * v));
    return (
        <svg viewBox="0 0 220 76" className="w-40 text-current sm:w-52" aria-hidden="true">
            <path d="M10,66 A100,56 0 0 1 210,66" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="3 5" />
            <line x1="0" y1="66" x2="220" y2="66" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
            <m.circle cx={cx} cy={cy} r="7" className="fill-accent" />
            <m.circle cx={cx} cy={cy} r="12" className="fill-accent/25" />
        </svg>
    );
}

/** One moment of the day. All stages are stacked; scroll progress decides which one is in front. */
function Stage({ stage, index, count, progress, product, active, onAdd, added, last, onAddAll, total, allAdded }) {
    const deep = stage.tone === 'deep';
    const distance = useTransform(progress, (p) => index - p);
    const opacity = useTransform(distance, (d) => clamp(1.7 - Math.abs(d) * 3.4, 0, 1));
    const y = useTransform(distance, (d) => clamp(d, -1, 1) * 44);
    const bgOpacity = useTransform(distance, (d) => clamp(1.5 - Math.abs(d) * 1.5, 0, 1));
    const img = product.images?.[0];

    return (
        <>
            <m.div className={cn('absolute inset-0', stage.bg)} style={{ opacity: bgOpacity, zIndex: index }} aria-hidden="true" />
            <m.div
                className={cn('absolute inset-0 flex items-center', deep ? 'text-white' : 'text-ink')}
                style={{ opacity, y, zIndex: 10 + index, pointerEvents: active ? 'auto' : 'none', willChange: 'transform, opacity' }}
                aria-hidden={!active}
                inert={!active}
            >
                <div className="container-page grid w-full items-center gap-5 pt-20 pb-36 sm:pt-24 sm:pb-24 lg:grid-cols-2 lg:gap-16">
                    {/* the product, in an arch */}
                    <div className="order-1 mx-auto h-[30svh] min-h-[9rem] [@media(max-height:700px)]:h-[24svh] max-h-[22rem] lg:order-2 lg:h-[min(62svh,34rem)] lg:max-h-none">
                        <div className={cn('aspect-[4/5] h-full overflow-hidden rounded-t-[999px] rounded-b-2xl shadow-lg ring-1', deep ? 'ring-white/20' : 'ring-line')}>
                            {img && <img src={imageUrl(img, 720)} alt={product.title} width="720" height="900" loading="lazy" decoding="async" className="size-full object-cover" />}
                        </div>
                    </div>

                    <div className="order-2 text-center lg:order-1 lg:text-left">
                        <div className={cn('mb-3 hidden justify-center sm:flex lg:mb-6 lg:justify-start', deep ? 'text-white/80' : 'text-primary-deep')}>
                            <DayArc progress={progress} count={count} />
                        </div>
                        <p className={cn('eyebrow mb-2', deep && '!text-accent')}>{stage.label} · {stage.time}</p>
                        <h3 className={cn('text-h2 lg:text-h1', deep && '!text-white')}>{stage.title}</h3>
                        <p className={cn('mx-auto mt-3 max-w-md text-small lg:mx-0 lg:mt-4 lg:text-body', deep ? 'text-white/80' : 'text-muted')}>{stage.copy}</p>

                        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:mt-7 lg:justify-start">
                            <Link to={`/product/${product.id}`} className="group text-left">
                                <span className={cn('block text-small font-semibold group-hover:underline', deep ? 'text-white' : 'text-ink')}>{product.title}</span>
                                <Price price={product.price} originalPrice={product.originalPrice} className={deep ? '[&_*]:!text-white' : undefined} />
                            </Link>
                            <Button variant={deep ? 'accent' : 'primary'} onClick={() => onAdd(product)} disabled={added} className="min-w-40">
                                {added ? <><Check size={16} aria-hidden="true" /> Added</> : <><ShoppingBag size={16} aria-hidden="true" /> Add to bag</>}
                            </Button>
                        </div>

                        {last && (
                            <button
                                type="button"
                                onClick={onAddAll}
                                disabled={allAdded}
                                className={cn('mt-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold underline underline-offset-4 transition-colors disabled:no-underline', deep ? 'text-accent hover:text-white' : 'text-primary hover:text-primary-deep')}
                            >
                                {allAdded ? 'The full ritual is in your bag' : `${DAY_RITUAL.cta} · ${formatPrice(total)}`}
                            </button>
                        )}
                    </div>
                </div>
            </m.div>
        </>
    );
}

/** Resolves the stages against the live catalogue; the story only mounts once there are enough to tell it. */
export default function DayRitual({ products = [] }) {
    const stages = useMemo(
        () => DAY_RITUAL.stages
            .map((stage) => ({ stage, product: products.find((p) => p.id === stage.productId) }))
            .filter(({ product }) => product && (product.stock ?? 0) > 0),
        [products],
    );
    if (stages.length < 3) return null;
    return <RitualStory stages={stages} />;
}

function RitualStory({ stages }) {
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const sectionRef = useRef(null);
    const [active, setActive] = useState(0);
    const [addedIds, setAddedIds] = useState([]);
    const count = stages.length;

    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
    const progress = useTransform(scrollYProgress, [0, 1], [0, Math.max(count - 1, 0)]);
    useMotionValueEvent(progress, 'change', (p) => {
        const next = clamp(Math.round(p), 0, Math.max(count - 1, 0));
        setActive((cur) => (cur === next ? cur : next));
    });

    const total = stages.reduce((sum, { product }) => sum + product.price, 0);
    const allAdded = stages.every(({ product }) => addedIds.includes(product.id));

    const add = (product) => {
        if (addToCart(product, 1)) {
            setAddedIds((ids) => [...new Set([...ids, product.id])]);
            showToast(`Added ${product.title} to your bag`, 'success');
        } else showToast('Could not add this product — please check stock', 'error');
    };
    const addAll = () => {
        let ok = 0;
        stages.forEach(({ product }) => { if (addToCart(product, 1)) ok += 1; });
        setAddedIds(stages.map(({ product }) => product.id));
        showToast(ok ? `Added ${ok} products to your bag` : 'These are already in your bag', ok ? 'success' : 'info');
    };

    const jump = (i) => {
        const el = sectionRef.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY + (i * HOLD_VH * window.innerHeight) / 100;
        window.scrollTo({ top, behavior: 'smooth' });
    };

    return (
        <LazyMotion features={domAnimation}>
            <section aria-labelledby="ritual-title" className="bg-canvas">
                <div className="container-page pt-12 lg:pt-20">
                    <SectionHeader eyebrow={DAY_RITUAL.eyebrow} title={DAY_RITUAL.title} description={DAY_RITUAL.description} className="!mb-6 lg:!mb-8" />
                </div>
                <div ref={sectionRef} style={{ height: `${(count - 1) * HOLD_VH + 100}svh` }} className="relative">
                    <h2 id="ritual-title" className="sr-only">{DAY_RITUAL.title}</h2>
                    <div className="sticky top-0 h-svh overflow-hidden">
                        {stages.map(({ stage, product }, i) => (
                            <Stage
                                key={stage.id}
                                stage={stage}
                                index={i}
                                count={count}
                                progress={progress}
                                product={product}
                                active={i === active}
                                onAdd={add}
                                added={addedIds.includes(product.id)}
                                last={i === count - 1}
                                onAddAll={addAll}
                                total={total}
                                allAdded={allAdded}
                            />
                        ))}

                        {/* the day, as a rail: tap a moment to jump to it */}
                        <nav aria-label="Moments of the day" className="absolute inset-x-0 bottom-[4.5rem] z-[40] sm:bottom-8">
                            <ul className="container-page mx-auto flex max-w-xl items-end justify-between gap-2">
                                {stages.map(({ stage }, i) => {
                                    const deep = stages[active].stage.tone === 'deep';
                                    return (
                                        <li key={stage.id} className="flex-1">
                                            <button type="button" onClick={() => jump(i)} aria-current={i === active} className={cn('group flex w-full flex-col items-center gap-2 py-1', deep ? 'text-white' : 'text-ink')}>
                                                <span className={cn('h-1 w-full rounded-full transition-colors duration-300', i <= active ? (deep ? 'bg-accent' : 'bg-primary') : (deep ? 'bg-white/25' : 'bg-ink/15'))} />
                                                <span className={cn('text-caption font-semibold transition-opacity', i === active ? 'opacity-100' : 'opacity-75 group-hover:opacity-100')}>{stage.label}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </div>
                </div>
            </section>
        </LazyMotion>
    );
}
