import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Pause, Play, ShoppingBag } from 'lucide-react';
import { AnimatePresence, animate, m, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import Price from '@/components/ui/Price';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { sampleColour } from '@/utils/sampleColour';
import { cn } from '@/utils/formatPrice';

/**
 * Hero product showcase: a row of product cards, the front one centred, its neighbours leaning in on either side.
 * It moves on by itself (a progress bar under it shows when), pauses while pointed at or focused, and can be swiped,
 * dragged, stepped with the arrows or keys, or jumped with the progress segments. A card is just the product's own
 * photo, so whatever the admin uploads works with no editing. The light behind the cards takes the front product's
 * colour. Only transform and opacity animate, and React re-renders only when the front card changes.
 */

const SLIDE_SECONDS = 5.5;
const SWIPE_PX = 50;
const SPRING = { type: 'spring', stiffness: 150, damping: 22, mass: 0.9 };
const pad = (n) => String(n).padStart(2, '0');

/** Signed distance of a card from the front one, wrapped so each card sits on its nearer side. */
function offsetOf(index, active, count) {
    if (count === 2) return (index - active + 2) % 2;
    const half = Math.floor(count / 2);
    return ((index - active + count + half) % count) - half;
}

function slotFor(offset) {
    if (offset === 0) return { x: '0%', y: '0%', scale: 1, rotate: 0, opacity: 1 };
    const side = Math.sign(offset);
    const far = Math.abs(offset) > 1;
    return {
        x: `${side * (far ? 28 : 47)}%`,
        y: far ? '5%' : '3.5%',
        scale: far ? 0.78 : 0.88,
        rotate: side * (far ? 7 : 4.5),
        opacity: far ? 0 : 1,
    };
}

function DeckCard({ item, offset, index, onSelect, dragged, priority, reduced }) {
    const front = offset === 0;
    const far = Math.abs(offset) > 1;

    const handleClick = (event) => {
        if (dragged.current || !front) {
            event.preventDefault();
            if (!dragged.current && !far) onSelect(index);
        }
    };

    return (
        <m.div
            className="absolute left-[17%] top-[4%] aspect-[4/5] w-[66%] sm:left-[21%] sm:w-[58%]"
            initial={false}
            animate={slotFor(offset)}
            transition={reduced ? { duration: 0 } : SPRING}
            style={{ zIndex: 10 - Math.abs(offset), pointerEvents: far ? 'none' : undefined }}
        >
            <Link
                to={item.href}
                onClick={handleClick}
                tabIndex={front ? 0 : -1}
                aria-label={front ? item.title : `${item.title}: bring to front`}
                aria-hidden={far || undefined}
                draggable={false}
                className="relative block size-full overflow-hidden rounded-[1.75rem] bg-canvas-alt shadow-lg ring-1 ring-line outline-offset-4"
            >
                <img
                    src={imageUrl(item.image, 640)}
                    alt=""
                    width="640"
                    height="800"
                    fetchPriority={priority ? 'high' : undefined}
                    decoding="async"
                    draggable={false}
                    className="size-full object-cover"
                />
                <m.span className="pointer-events-none absolute inset-0 bg-primary-deep" initial={false} animate={{ opacity: front ? 0 : 0.5 }} transition={{ duration: reduced ? 0 : 0.5 }} aria-hidden="true" />
                {front && !reduced && <span key="sheen" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 animate-card-sheen bg-gradient-to-r from-transparent via-white/45 to-transparent" aria-hidden="true" />}
            </Link>
        </m.div>
    );
}

export default function HeroDeck({ items }) {
    const reduced = useReducedMotion();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const count = items.length;

    const [active, setActive] = useState(0);
    const [userPaused, setUserPaused] = useState(false);
    const [colours, setColours] = useState([]);
    const [addedId, setAddedId] = useState(null);

    const stageRef = useRef(null);
    const dragged = useRef(false);
    const drag = useRef(null);
    const dragX = useMotionValue(0);
    const shift = useTransform(dragX, (v) => v * 0.55);
    const progress = useMotionValue(0);
    const timer = useRef(null);
    const hold = useRef({ hover: false, focus: false, drag: false, offscreen: false, hidden: false });

    const index = count ? active % count : 0;
    const current = items[index];
    const autoplay = count > 1 && !reduced && !userPaused;

    const applyHold = useCallback(() => {
        const h = hold.current;
        if (h.hover || h.focus || h.drag || h.offscreen || h.hidden) timer.current?.pause();
        else timer.current?.play();
    }, []);

    /* one timer per front card: it fills the progress bar, then moves on */
    useEffect(() => {
        progress.set(0);
        if (!autoplay) return undefined;
        timer.current = animate(progress, 1, { duration: SLIDE_SECONDS, ease: 'linear', onComplete: () => setActive((a) => (a + 1) % count) });
        applyHold();
        return () => timer.current?.stop();
    }, [index, autoplay, count, progress, applyHold]);

    /* no work while the hero is off screen or the tab is in the background */
    useEffect(() => {
        const node = stageRef.current;
        const onVisibility = () => { hold.current.hidden = document.hidden; applyHold(); };
        document.addEventListener('visibilitychange', onVisibility);
        let observer;
        if (node && 'IntersectionObserver' in window) {
            observer = new IntersectionObserver(([entry]) => { hold.current.offscreen = !entry.isIntersecting; applyHold(); });
            observer.observe(node);
        }
        return () => { document.removeEventListener('visibilitychange', onVisibility); observer?.disconnect(); };
    }, [applyHold]);

    /* the light behind the cards takes each product's own colour */
    useEffect(() => {
        let alive = true;
        Promise.all(items.map((item) => sampleColour(imageUrl(item.image, 96)))).then((list) => { if (alive) setColours(list); });
        return () => { alive = false; };
    }, [items]);

    const goTo = useCallback((i) => setActive(((i % count) + count) % count), [count]);
    const step = useCallback((dir) => setActive((a) => (((a + dir) % count) + count) % count), [count]);

    /* dragging (mouse or finger). Vertical swipes on touch still scroll the page (touch-action: pan-y). */
    const onPointerDown = (event) => {
        if (count < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
        drag.current = { id: event.pointerId, startX: event.clientX, startT: performance.now(), captured: false };
        dragged.current = false;
    };
    const onPointerMove = (event) => {
        const d = drag.current;
        if (!d || d.id !== event.pointerId) return;
        const dx = event.clientX - d.startX;
        if (!d.captured && Math.abs(dx) > 6) {
            d.captured = true;
            dragged.current = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            hold.current.drag = true;
            applyHold();
        }
        if (d.captured) dragX.set(dx);
    };
    const endDrag = (event) => {
        const d = drag.current;
        if (!d || d.id !== event.pointerId) return;
        drag.current = null;
        if (d.captured) {
            const dx = event.clientX - d.startX;
            const fast = Math.abs(dx) / Math.max(1, performance.now() - d.startT) > 0.5; // px per ms
            if (Math.abs(dx) > SWIPE_PX || (fast && Math.abs(dx) > 20)) step(dx < 0 ? 1 : -1);
            animate(dragX, 0, reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 });
            hold.current.drag = false;
            applyHold();
        }
        setTimeout(() => { dragged.current = false; }, 0); // lets the click handler see that this was a drag
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    };

    const addCurrent = () => {
        const product = current?.product;
        if (!product) return;
        if (addToCart(product, 1)) {
            setAddedId(product.id);
            showToast(`Added ${product.title} to your bag`, 'success');
            setTimeout(() => setAddedId((id) => (id === product.id ? null : id)), 1800);
        } else showToast('Could not add this product. Please check stock.', 'error');
    };

    if (!current) return null;
    const justAdded = addedId === current.product?.id;

    return (
        <div
            className="relative isolate mx-auto w-full max-w-[40rem] overflow-hidden rounded-[1.75rem] bg-primary px-3 pb-3 pt-7 text-white shadow-lg sm:rounded-[2rem] sm:px-8 sm:pb-6 sm:pt-10 lg:ml-auto"
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') { hold.current.hover = true; applyHold(); } }}
            onPointerLeave={() => { hold.current.hover = false; applyHold(); }}
            onFocus={(e) => { if (e.target.matches?.(':focus-visible')) { hold.current.focus = true; applyHold(); } }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { hold.current.focus = false; applyHold(); } }}
        >
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                <div className="absolute left-1/2 top-[36%] aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
                <div className="absolute left-1/2 top-[36%] aspect-square w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
                <div className="absolute inset-x-0 top-0 h-2/3" style={{ background: 'radial-gradient(closest-side at 50% 45%, rgb(255 255 255 / 0.14), transparent)' }} />
            </div>
            <div
                ref={stageRef}
                role="group"
                aria-roledescription="carousel"
                aria-label="Featured products. Swipe or use the arrow keys to browse."
                tabIndex={count > 1 ? 0 : undefined}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={cn('relative isolate aspect-[1/0.9] w-full touch-pan-y select-none rounded-xl outline-offset-4 sm:aspect-[1/0.8]', count > 1 && 'cursor-grab active:cursor-grabbing')}
            >
                {/* light behind the cards, in the colour of the front product */}
                {items.map((item, i) => {
                    const c = colours[i] ?? [96, 36, 96];
                    return (
                        <span
                            key={item.id}
                            className="pointer-events-none absolute left-1/2 top-[44%] -z-10 aspect-square w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-700"
                            style={{ opacity: i === index ? 1 : 0, background: `radial-gradient(closest-side, rgb(${c[0]} ${c[1]} ${c[2]} / 0.38), rgb(${c[0]} ${c[1]} ${c[2]} / 0) 72%)` }}
                            aria-hidden="true"
                        />
                    );
                })}
                <span className="pointer-events-none absolute bottom-[3%] left-[24%] right-[24%] h-5 rounded-[50%] bg-black/25 blur-xl" aria-hidden="true" />

                <m.div className="absolute inset-0" style={{ x: shift }}>
                    {items.map((item, i) => (
                        <DeckCard key={item.id} item={item} index={i} offset={offsetOf(i, index, count)} onSelect={goTo} dragged={dragged} priority={i === 0} reduced={reduced} />
                    ))}
                </m.div>
            </div>

            {/* the product in front: name, price, add to bag */}
            <div className="mt-4 flex items-center gap-4 rounded-2xl bg-surface p-3 pl-4 text-ink shadow-md sm:mt-5" aria-live={autoplay ? 'off' : 'polite'}>
                <div className="relative min-w-0 flex-1">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <m.div key={current.id} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                            <span className="eyebrow block">{current.eyebrow}</span>
                            <Link to={current.href} className="block truncate font-medium text-ink hover:text-primary">{current.title}</Link>
                            {current.product && <Price price={current.product.price} originalPrice={current.product.originalPrice} />}
                        </m.div>
                    </AnimatePresence>
                </div>
                {current.product && (
                    <button
                        type="button"
                        onClick={addCurrent}
                        aria-label={`Add ${current.title} to bag`}
                        className={cn('grid size-12 shrink-0 place-items-center rounded-full text-white shadow-md transition-colors', justAdded ? 'bg-success' : 'bg-primary hover:bg-primary-hover')}
                    >
                        {justAdded ? <Check size={20} aria-hidden="true" /> : <ShoppingBag size={20} aria-hidden="true" />}
                    </button>
                )}
            </div>

            {/* progress: one segment per product, the front one fills until the next takes over */}
            {count > 1 && (
                <div className="mt-2 flex items-center gap-3 px-1 sm:mt-3">
                    <div className="flex flex-1 gap-1.5">
                        {items.map((item, i) => (
                            <button key={item.id} type="button" onClick={() => goTo(i)} aria-label={`Show ${item.title}`} aria-current={i === index || undefined} className="group flex-1 py-2">
                                <span className="relative block h-[3px] overflow-hidden rounded-full bg-white/25">
                                    <m.span
                                        className="absolute inset-0 origin-left rounded-full bg-white"
                                        style={i === index && autoplay ? { scaleX: progress } : { scaleX: i === index ? 1 : 0 }}
                                    />
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="font-display text-small tabular-nums text-white/75" aria-hidden="true">
                        <span className="text-white">{pad(index + 1)}</span> / {pad(count)}
                    </p>
                    {!reduced && (
                        <button type="button" onClick={() => setUserPaused((p) => !p)} aria-label={userPaused ? 'Play automatic slideshow' : 'Pause automatic slideshow'} className="grid size-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                            {userPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                        </button>
                    )}
                    <div className="hidden gap-1.5 sm:flex">
                        <button type="button" onClick={() => step(-1)} aria-label="Previous product" className="grid size-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"><ChevronLeft size={18} aria-hidden="true" /></button>
                        <button type="button" onClick={() => step(1)} aria-label="Next product" className="grid size-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"><ChevronRight size={18} aria-hidden="true" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
