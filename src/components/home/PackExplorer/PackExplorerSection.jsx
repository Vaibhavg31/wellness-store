import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Hand, RotateCw, ShoppingBag, ZoomIn } from 'lucide-react';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import Reveal from '@/components/ui/Reveal';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { PACKS, packFor } from '@/data/packs';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const PackScene = lazy(() => import('@/components/home/PackExplorer/PackScene'));

const HINTS = [
    { icon: Hand, label: 'Drag to turn' },
    { icon: ZoomIn, label: 'Pinch or scroll to zoom' },
    { icon: RotateCw, label: 'Turns by itself' },
];

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch { return false; }
}

/** What shows in the viewer before the 3D code arrives, or instead of it (reduced motion, no WebGL). */
function PhotoFallback({ product }) {
    const image = product.images?.[0];
    return (
        <div className="absolute inset-0 grid place-items-center p-8">
            {image && <img src={imageUrl(image, 720)} alt={product.title} width="720" height="900" className="aspect-[4/5] h-full max-h-[26rem] rounded-t-[999px] rounded-b-xl object-cover shadow-lg ring-1 ring-line" />}
        </div>
    );
}

/**
 * "Explore in 3D": the packs, held in the hand. Pick a product, drag the pack round, zoom in on the label, then add it to
 * the bag from the card beside it. Name, price and description are the live catalogue's; the pack shape and label colours
 * come from `src/data/packs.js`. The 3D code (three.js) loads only when the section scrolls near.
 */
export default function PackExplorerSection({ products = [] }) {
    const reduced = useReducedMotion();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const sectionRef = useRef(null);
    const [near, setNear] = useState(false);
    const [onScreen, setOnScreen] = useState(false);
    const [webgl, setWebgl] = useState(false);
    const [sceneReady, setSceneReady] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [addedId, setAddedId] = useState(null);

    const list = useMemo(() => products.filter((p) => PACKS[p.id] && p.images?.[0]), [products]);
    const active = list.find((p) => p.id === activeId) ?? list[0];

    useEffect(() => { setWebgl(hasWebGL()); }, []);
    useEffect(() => {
        const node = sectionRef.current;
        if (!node) return undefined;
        const nearObserver = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '300px 0px' });
        const visibleObserver = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
        nearObserver.observe(node);
        visibleObserver.observe(node);
        return () => { nearObserver.disconnect(); visibleObserver.disconnect(); };
    }, [list.length]);

    if (list.length < 2) return null;

    const live = near && webgl && !reduced;
    const pack = packFor(active);
    const add = () => {
        if (addToCart(active, 1)) {
            setAddedId(active.id);
            showToast(`Added ${active.title} to your bag`, 'success');
            setTimeout(() => setAddedId((id) => (id === active.id ? null : id)), 1800);
        } else showToast('Could not add this product. Please check stock.', 'error');
    };

    return (
        <LazyMotion features={domAnimation}>
            <section ref={sectionRef} className="section bg-canvas" aria-labelledby="pack-explorer-title">
                <div className="container-page">
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-12">
                        <div className="max-w-xl">
                            <p className="eyebrow mb-3">Explore in 3D</p>
                            <h2 id="pack-explorer-title">Hold the pack in your hands</h2>
                        </div>
                        <p className="max-w-xs text-small text-muted">Turn it, zoom in on the label, and read exactly what is inside before it reaches your door.</p>
                    </div>

                    <div className="grid items-stretch gap-6 lg:grid-cols-12 lg:gap-10">
                        <Reveal className="min-w-0 lg:col-span-7">
                            <div className="relative isolate h-[26rem] overflow-hidden rounded-xl bg-gradient-to-b from-primary-soft via-canvas-alt to-accent-tint ring-1 ring-line sm:h-[32rem] lg:h-full lg:min-h-[36rem]">
                                <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface/70 blur-2xl" aria-hidden="true" />
                                {!(live && sceneReady) && <PhotoFallback product={active} />}
                                {live && (
                                    <Suspense fallback={null}>
                                        <PackScene pack={pack} visible={onScreen} onReady={() => setSceneReady(true)} className="absolute inset-0 touch-pan-y" />
                                    </Suspense>
                                )}
                                {live && (
                                    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex flex-wrap justify-center gap-2 px-3">
                                        {HINTS.map(({ icon: Icon, label }, i) => (
                                            <span key={label} className={cn('items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-caption text-muted shadow-sm', i === 0 ? 'inline-flex' : 'hidden sm:inline-flex')}>
                                                <Icon size={13} className="text-primary" aria-hidden="true" /> {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Reveal>

                        <Reveal delay={120} className="flex min-w-0 flex-col gap-5 lg:col-span-5">
                            <div>
                                <p className="mb-3 text-caption font-semibold uppercase tracking-[0.14em] text-muted">Choose a product</p>
                                <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 lg:grid-cols-5">
                                    {list.map((p) => {
                                        const selected = p.id === active.id;
                                        return (
                                            <li key={p.id} className="w-20 shrink-0 sm:w-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveId(p.id)}
                                                    aria-pressed={selected}
                                                    aria-label={p.title}
                                                    title={p.title}
                                                    className={cn('block aspect-square w-full overflow-hidden rounded-lg bg-canvas-alt ring-2 transition-all duration-200', selected ? 'ring-primary shadow-md' : 'ring-transparent hover:ring-line')}
                                                >
                                                    <img src={imageUrl(p.images[0], 160)} alt="" width="160" height="160" loading="lazy" className="size-full object-cover" />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="flex-1 rounded-xl bg-surface p-6 shadow-md ring-1 ring-line sm:p-8">
                                <AnimatePresence mode="wait" initial={false}>
                                    <m.div key={active.id} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                                        <p className="eyebrow mb-2">{active.isNew ? 'New arrival' : active.isBestSeller ? 'Best seller' : 'Chikit'}</p>
                                        <h3 className="text-h3">{active.title}</h3>
                                        <Price price={active.price} originalPrice={active.originalPrice} size="lg" className="mt-2" />
                                        <p className="mt-4 text-small text-muted">{active.description}</p>
                                        <ul className="mt-5 space-y-2 text-small text-ink">
                                            {['Lab tested for purity', 'FSSAI certified', 'No added preservatives'].map((f) => (
                                                <li key={f} className="flex items-center gap-2"><Check size={16} className="shrink-0 text-success" aria-hidden="true" /> {f}</li>
                                            ))}
                                        </ul>
                                    </m.div>
                                </AnimatePresence>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Button size="lg" onClick={add} className={cn('flex-1 sm:flex-none', addedId === active.id && '!bg-success')}>
                                        {addedId === active.id ? <><Check size={18} aria-hidden="true" /> Added</> : <><ShoppingBag size={18} aria-hidden="true" /> Add to bag</>}
                                    </Button>
                                    <Link to={`/product/${active.id}`} className="flex-1 sm:flex-none">
                                        <Button size="lg" variant="outline" className="w-full">Details <ArrowRight size={18} aria-hidden="true" /></Button>
                                    </Link>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>
        </LazyMotion>
    );
}
