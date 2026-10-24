import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, MoveHorizontal, ShoppingBag } from 'lucide-react';
import {
    AnimatePresence, animate, m, useAnimationFrame, useMotionValue, useMotionValueEvent,
    useReducedMotion, useScroll, useSpring, useTransform,
} from 'framer-motion';
import Price from '@/components/ui/Price';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

/**
 * Hero "orbit stage", designed for Chikit rather than borrowed.
 *
 *  - An Ayurvedic medallion (a slowly turning lotus mandala inside a ring of promises, the brand mark at its heart)
 *    sits at the centre like a sun. Products ride a tilted orbit around it, standing on the ring with soft ground
 *    shadows, so the ones in front overlap the medallion and the ones behind slip out of sight: real depth.
 *  - The ring turns by itself, tilts toward the cursor, is turned by scrolling, can be dragged or flicked (it
 *    coasts), and tapping a side product swings it to the front. Whatever is in front lights the stage in its own
 *    colour (sampled from its picture) and fills the info card, which can add it to the bag.
 *  - Tiny seeds drift along the orbit. Everything is projected by hand to translate + scale, so only transform and
 *    opacity change per frame and React never re-renders while it spins (state changes only when a different product
 *    comes to the front).
 *
 * Products with a cut-out stand out of an arch-shaped window; any other photo (with or without a background) is
 * clipped into the same arch, so uploads always look intentional.
 */

const RAD = Math.PI / 180;
const AUTO_SPEED = 10; // degrees per second
const DEG_PER_PX = 0.32;
const PITCH = -16; // the ring is seen from slightly above
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const WINDOWS = ['from-primary-tint', 'from-accent-tint', 'from-success-tint', 'from-canvas-alt', 'from-info-tint'];
const SEEDS = [
    { base: 20, speed: 14, size: 7, r: 1.16, tone: 'bg-accent' },
    { base: 95, speed: -9, size: 5, r: 0.92, tone: 'bg-primary/60' },
    { base: 170, speed: 11, size: 6, r: 1.24, tone: 'bg-success/70' },
    { base: 240, speed: -13, size: 4, r: 1.05, tone: 'bg-accent/80' },
    { base: 310, speed: 8, size: 6, r: 0.86, tone: 'bg-primary/45' },
];

/**
 * A 3D point on the ring (x, z; the ring lies flat), turned by the pitch and the cursor tilt, then put through a
 * simple perspective. Returns where to draw it and how big, how far forward it is, and how "front" it is (0..1).
 */
function project(angleDeg, radius, [tiltX, tiltY, width]) {
    const th = angleDeg * RAD;
    const x = Math.sin(th) * radius;
    const z = Math.cos(th) * radius;
    const ax = (PITCH + tiltX) * RAD;
    const ay = tiltY * RAD;
    const x1 = x * Math.cos(ay) + z * Math.sin(ay);
    const z1 = -x * Math.sin(ay) + z * Math.cos(ay);
    const y2 = -z1 * Math.sin(ax);
    const z2 = z1 * Math.cos(ax);
    const P = width * 1.9;
    const p = P / (P - z2);
    return { x: x1 * p, y: y2 * p, p, z: z2, depth: (Math.cos(th) + 1) / 2 };
}

/** One product standing on the orbit. */
function OrbitItem({ item, index, tile, base, controls, active, onSelect, dragged, reduced }) {
    const { angle, scrollAngle, spread, tiltX, tiltY, width } = controls;
    const state = useTransform([angle, scrollAngle, spread, tiltX, tiltY, width], ([a, s, sp, tx, ty, w]) => {
        const pr = project(base + a + s, w * 0.37 * sp, [tx, ty, w]);
        return { ...pr, scale: pr.p * (0.3 + 0.7 * sp), sp };
    });
    const x = useTransform(state, (v) => v.x);
    const y = useTransform(state, (v) => v.y);
    const scale = useTransform(state, (v) => v.scale);
    const zIndex = useTransform(state, (v) => 1000 + Math.round(v.z));
    const opacity = useTransform(state, (v) => clamp(0.55 + 0.45 * v.depth, 0, 1) * clamp(v.sp * 1.8, 0, 1));
    const height = tile * 1.32;

    const handleClick = (event) => {
        if (dragged.current || !active) {
            event.preventDefault();
            if (!dragged.current) onSelect(index);
        }
    };

    return (
        <m.div
            className="absolute left-1/2"
            style={{ top: '66%', width: tile, height, marginLeft: -tile / 2, marginTop: -height, transformOrigin: '50% 100%', x, y, scale, zIndex, opacity, willChange: 'transform, opacity' }}
        >
            <span className="pointer-events-none absolute -bottom-2 left-[6%] right-[6%] h-4 rounded-[50%] bg-ink/25 blur-md" aria-hidden="true" />
            <m.div
                className="size-full"
                animate={reduced ? undefined : { y: [0, -7, 0] }}
                transition={{ duration: 4.2 + index * 0.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
            >
                <Link
                    to={item.href}
                    onClick={handleClick}
                    aria-label={active ? item.title : `${item.title}: bring to front`}
                    className="relative block size-full rounded-t-full outline-offset-4"
                    draggable={false}
                >
                    {item.cutout ? (
                        <>
                            <span className={cn('absolute inset-x-[4%] bottom-0 top-[12%] rounded-t-full rounded-b-[1.4rem] bg-gradient-to-b to-transparent', WINDOWS[index % WINDOWS.length])} aria-hidden="true" />
                            <img src={imageUrl(item.cutout)} alt="" width="600" height="800" decoding="async" draggable={false} className="absolute inset-x-[-4%] bottom-[2%] h-[100%] w-[108%] max-w-none object-contain" />
                        </>
                    ) : (
                        <span className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-[1.4rem] border-[5px] border-surface bg-surface shadow-lg ring-1 ring-line">
                            <img src={imageUrl(item.image, 480)} alt="" width="480" height="640" decoding="async" draggable={false} className="size-full object-cover" />
                        </span>
                    )}
                </Link>
            </m.div>
        </m.div>
    );
}

/** A small seed drifting around the orbit (decor; hidden from assistive tech). */
function OrbitSeed({ seed, clock, controls }) {
    const { scrollAngle, spread, tiltX, tiltY, width } = controls;
    const state = useTransform([clock, scrollAngle, spread, tiltX, tiltY, width], ([c, s, sp, tx, ty, w]) => (
        project(seed.base + c * seed.speed + s * 0.6, w * 0.37 * seed.r * sp, [tx, ty, w])
    ));
    const x = useTransform(state, (v) => v.x);
    const y = useTransform(state, (v) => v.y - 4);
    const scale = useTransform(state, (v) => v.p);
    const opacity = useTransform(state, (v) => 0.25 + 0.75 * v.depth);
    const zIndex = useTransform(state, (v) => 1000 + Math.round(v.z) + 1);
    return (
        <m.span
            className={cn('pointer-events-none absolute left-1/2 rounded-full', seed.tone)}
            style={{ top: '66%', width: seed.size, height: seed.size, marginLeft: -seed.size / 2, x, y, scale, opacity, zIndex }}
            aria-hidden="true"
        />
    );
}

/** The centrepiece: a lotus mandala, a ring of promises that turns, and the brand mark at the heart. */
function Medallion() {
    const petals = Array.from({ length: 12 }, (_, i) => i * 30);
    const inner = Array.from({ length: 8 }, (_, i) => i * 45 + 22.5);
    return (
        <div className="relative size-full rounded-full bg-gradient-to-b from-surface to-primary-tint shadow-lg ring-1 ring-line">
            <div className="absolute inset-[3%] animate-orbit-spin-reverse">
                <svg viewBox="0 0 200 200" className="size-full text-primary" aria-hidden="true">
                    <g fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8">
                        {petals.map((a) => <ellipse key={a} cx="100" cy="56" rx="9" ry="26" transform={`rotate(${a} 100 100)`} />)}
                        {inner.map((a) => <ellipse key={a} cx="100" cy="74" rx="7" ry="17" transform={`rotate(${a} 100 100)`} strokeOpacity="0.28" />)}
                        <circle cx="100" cy="100" r="38" />
                        <circle cx="100" cy="100" r="22" strokeOpacity="0.3" />
                    </g>
                </svg>
            </div>
            <div className="absolute inset-0 animate-orbit-spin">
                <svg viewBox="0 0 200 200" className="size-full" aria-hidden="true">
                    <defs><path id="orbit-promises" d="M100,100 m-90,0 a90,90 0 1,1 180,0 a90,90 0 1,1 -180,0" /></defs>
                    <text className="fill-primary-deep" style={{ fontSize: 8, fontWeight: 600 }}>
                        <textPath href="#orbit-promises" textLength="560" lengthAdjust="spacing">FSSAI CERTIFIED • LAB TESTED • 100% NATURAL • ANCIENT WISDOM • </textPath>
                    </text>
                </svg>
            </div>
            <div className="absolute inset-[26%] grid place-items-center rounded-full bg-surface shadow-md ring-1 ring-line">
                <img src="/brand/chikit-icon.webp" alt="" width="160" height="160" draggable={false} className="size-[64%] animate-breathe object-contain" />
            </div>
        </div>
    );
}

/** Dominant colour of a product picture, for the stage light. Falls back (null) when the picture cannot be read. */
const colourCache = new Map();
function sampleColour(src) {
    if (colourCache.has(src)) return colourCache.get(src);
    const result = new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 24; canvas.height = 24;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, 24, 24);
                const { data } = ctx.getImageData(0, 0, 24, 24);
                let r = 0; let g = 0; let b = 0; let weight = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 200) continue;
                    const max = Math.max(data[i], data[i + 1], data[i + 2]);
                    const min = Math.min(data[i], data[i + 1], data[i + 2]);
                    const sat = max === 0 ? 0 : (max - min) / max;
                    const w = sat * sat + 0.001; // vivid pixels decide the colour; whites and greys barely count
                    r += data[i] * w; g += data[i + 1] * w; b += data[i + 2] * w; weight += w;
                }
                resolve(weight > 0.5 ? [Math.round(r / weight), Math.round(g / weight), Math.round(b / weight)] : null);
            } catch { resolve(null); } // a picture from another origin cannot be read: use the default light
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
    colourCache.set(src, result);
    return result;
}

export default function HeroStage({ items }) {
    const reduced = useReducedMotion();
    const rootRef = useRef(null);
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const count = items.length;
    const step = 360 / count;

    const [stageWidth, setStageWidth] = useState(560);
    const [active, setActive] = useState(0);
    const [hinted, setHinted] = useState(true);
    const [colours, setColours] = useState([]);
    const [addedId, setAddedId] = useState(null);

    const angle = useMotionValue(reduced ? 0 : -80);
    const spread = useMotionValue(reduced ? 1 : 0);
    const width = useMotionValue(560);
    const rawTiltX = useMotionValue(0);
    const rawTiltY = useMotionValue(0);
    const tiltX = useSpring(rawTiltX, { stiffness: 90, damping: 18, mass: 0.6 });
    const tiltY = useSpring(rawTiltY, { stiffness: 90, damping: 18, mass: 0.6 });
    const rawPx = useMotionValue(0);
    const rawPy = useMotionValue(0);
    const px = useSpring(rawPx, { stiffness: 70, damping: 16, mass: 0.7 });
    const py = useSpring(rawPy, { stiffness: 70, damping: 16, mass: 0.7 });
    const clock = useMotionValue(0);

    /* scrolling the page turns the ring a little, and the stage drifts against the scroll */
    const { scrollYProgress } = useScroll({ target: rootRef, offset: ['start end', 'end start'] });
    const scrollAngle = useSpring(useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-50, 50]), { stiffness: 60, damping: 22, mass: 0.8 });
    const lift = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [22, -22]);

    const live = useRef({ drag: null, dragging: false, hover: false, visible: true, snapping: false, coast: 0, auto: 0, holdUntil: 0 });
    const dragged = useRef(false);
    const activeRef = useRef(0);
    const snap = useRef(null);

    /* keep the stage width in sync (drives every size and the projection) */
    useEffect(() => {
        const node = rootRef.current;
        if (!node) return undefined;
        const observer = new ResizeObserver(([entry]) => {
            const w = Math.round(entry.contentRect.width);
            if (w > 0) { setStageWidth(w); width.set(w); }
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [width]);

    /* the stage light takes each product's own colour */
    useEffect(() => {
        let alive = true;
        Promise.all(items.map((item) => sampleColour(imageUrl(item.image, 96)))).then((list) => { if (alive) setColours(list); });
        return () => { alive = false; };
    }, [items]);

    /* intro: the ring unwinds out of the medallion */
    useEffect(() => {
        if (reduced) { spread.set(1); angle.set(0); return undefined; }
        live.current.snapping = true;
        const a = animate(spread, 1, { duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 });
        const b = animate(angle, 0, { duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.25, onComplete: () => { live.current.snapping = false; } });
        return () => { a.stop(); b.stop(); };
    }, [reduced, angle, spread]);

    /* skip all work while the hero is off screen */
    useEffect(() => {
        const node = rootRef.current;
        if (!node || !('IntersectionObserver' in window)) return undefined;
        const observer = new IntersectionObserver(([entry]) => { live.current.visible = entry.isIntersecting; });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    /* cursor: tilt the ring and drift the medallion. Anywhere over the hero counts. */
    useEffect(() => {
        const node = rootRef.current;
        if (!node || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
        const area = node.closest('section') ?? node;
        const onMove = (event) => {
            const rect = node.getBoundingClientRect();
            const nx = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.9), -1, 1);
            const ny = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.9), -1, 1);
            rawTiltY.set(nx * 12);
            rawTiltX.set(-ny * 6);
            rawPx.set(nx);
            rawPy.set(ny);
        };
        const onLeave = () => { rawTiltX.set(0); rawTiltY.set(0); rawPx.set(0); rawPy.set(0); };
        area.addEventListener('pointermove', onMove);
        area.addEventListener('pointerleave', onLeave);
        return () => { area.removeEventListener('pointermove', onMove); area.removeEventListener('pointerleave', onLeave); };
    }, [reduced, rawTiltX, rawTiltY, rawPx, rawPy]);

    /* motion: constant slow spin (easing down while hovered), the coasting left over from a flick, and the seeds' clock */
    useAnimationFrame((_, delta) => {
        const s = live.current;
        if (reduced || !s.visible) return;
        const dt = Math.min(delta, 50) / 1000;
        clock.set(clock.get() + dt);
        if (s.snapping || s.dragging) return;
        s.coast *= Math.exp(-dt * 2.2);
        if (Math.abs(s.coast) < 0.05) s.coast = 0;
        const target = performance.now() < s.holdUntil ? 0 : s.hover ? AUTO_SPEED * 0.3 : AUTO_SPEED;
        s.auto += (target - s.auto) * Math.min(1, dt * 3);
        angle.set(angle.get() + (s.auto + s.coast) * dt);
    });

    const syncActive = (total) => {
        const index = (((Math.round(-total / step)) % count) + count) % count;
        if (index !== activeRef.current) { activeRef.current = index; setActive(index); }
    };
    useMotionValueEvent(angle, 'change', (value) => syncActive(value + scrollAngle.get()));
    useMotionValueEvent(scrollAngle, 'change', (value) => syncActive(angle.get() + value));

    const goTo = useCallback((index) => {
        const s = live.current;
        const desired = -index * step - scrollAngle.get();
        const turns = Math.round((angle.get() - desired) / 360);
        s.snapping = true;
        s.coast = 0;
        s.holdUntil = performance.now() + 3200;
        snap.current?.stop();
        snap.current = animate(angle, desired + turns * 360, {
            ...(reduced ? { duration: 0.01 } : { type: 'spring', stiffness: 70, damping: 15, mass: 0.9 }),
            onComplete: () => { s.snapping = false; },
        });
    }, [angle, scrollAngle, reduced, step]);

    const stepBy = (dir) => goTo((activeRef.current + dir + count) % count);

    /* dragging (mouse or finger). Vertical swipes on touch still scroll the page (touch-action: pan-y). */
    const onPointerDown = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const s = live.current;
        snap.current?.stop();
        s.snapping = false;
        s.drag = { id: event.pointerId, lastX: event.clientX, lastT: performance.now(), moved: 0, vel: 0, captured: false };
        dragged.current = false;
    };
    const onPointerMove = (event) => {
        const s = live.current;
        const d = s.drag;
        if (!d || d.id !== event.pointerId) return;
        const dx = event.clientX - d.lastX;
        const now = performance.now();
        d.moved += Math.abs(dx);
        if (d.moved > 6) {
            if (!d.captured) { event.currentTarget.setPointerCapture?.(event.pointerId); d.captured = true; s.dragging = true; dragged.current = true; setHinted(false); }
            angle.set(angle.get() + dx * DEG_PER_PX);
            const inst = (dx * DEG_PER_PX) / Math.max(1, now - d.lastT) * 1000;
            d.vel = d.vel * 0.6 + inst * 0.4;
        }
        d.lastX = event.clientX;
        d.lastT = now;
    };
    const endDrag = (event) => {
        const s = live.current;
        const d = s.drag;
        if (!d || d.id !== event.pointerId) return;
        s.drag = null;
        if (s.dragging) { s.coast = clamp(d.vel, -420, 420); s.holdUntil = 0; }
        s.dragging = false;
        setTimeout(() => { dragged.current = false; }, 0); // lets the click handler see that this was a drag
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); stepBy(1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); stepBy(-1); }
    };

    const addCurrent = () => {
        const product = items[activeRef.current]?.product;
        if (!product) return;
        if (addToCart(product, 1)) {
            setAddedId(product.id);
            showToast(`Added ${product.title} to your bag`, 'success');
            setTimeout(() => setAddedId((id) => (id === product.id ? null : id)), 1800);
        } else showToast('Could not add this product — please check stock', 'error');
    };

    const tile = stageWidth * 0.22;
    const controls = { angle, scrollAngle, spread, tiltX, tiltY, width };
    const current = items[active] ?? items[0];
    const medX = useTransform(px, (v) => v * -10);
    const medY = useTransform(py, (v) => v * -8);
    const sunX = useTransform(px, (v) => v * 16);
    const sunY = useTransform(py, (v) => v * 12);

    return (
        <div>
            <m.div style={{ y: lift }} className="relative mx-auto w-full max-w-[24rem] sm:max-w-[40rem]">
                <div
                    ref={rootRef}
                    role="group"
                    aria-roledescription="carousel"
                    aria-label="Featured products. Drag or use the arrow keys to turn."
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onPointerEnter={() => { live.current.hover = true; }}
                    onPointerLeave={() => { live.current.hover = false; }}
                    className="relative isolate aspect-[1/0.92] w-full cursor-grab touch-pan-y select-none rounded-xl outline-offset-4 active:cursor-grabbing"
                >
                    {/* light: a pale sun behind everything, and a glow in the colour of whatever is at the front */}
                    <m.div style={{ x: sunX, y: sunY }} className="pointer-events-none absolute left-1/2 top-[40%] aspect-square w-[80%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
                        <div className="size-full rounded-full bg-gradient-to-b from-accent-tint via-primary-soft to-transparent opacity-80" />
                    </m.div>
                    {items.map((item, i) => {
                        const c = colours[i] ?? [96, 36, 96];
                        return (
                            <span
                                key={item.id}
                                className="pointer-events-none absolute left-1/2 top-[40%] aspect-square w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-700"
                                style={{ opacity: i === active ? 1 : 0, background: `radial-gradient(closest-side, rgb(${c[0]} ${c[1]} ${c[2]} / 0.34), rgb(${c[0]} ${c[1]} ${c[2]} / 0) 72%)` }}
                                aria-hidden="true"
                            />
                        );
                    })}

                    {/* the orbit, drawn as two faint ellipses */}
                    <svg viewBox="0 0 100 92" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full text-primary" aria-hidden="true">
                        <ellipse cx="50" cy="60.7" rx="37" ry="11" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="0.25" strokeDasharray="1 1.4" />
                        <ellipse cx="50" cy="60.7" rx="45" ry="14" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.25" />
                    </svg>

                    {/* the medallion: products behind it slip out of sight, those in front overlap it */}
                    <div className="pointer-events-none absolute left-1/2 top-[38%] z-[1000] aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2">
                        <m.div className="size-full" style={{ x: medX, y: medY }} initial={reduced ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
                            <Medallion />
                        </m.div>
                    </div>

                    {SEEDS.map((seed, i) => <OrbitSeed key={i} seed={seed} clock={clock} controls={controls} />)}
                    {items.map((item, index) => (
                        <OrbitItem key={item.id} item={item} index={index} tile={tile} base={index * step} controls={controls} active={index === active} onSelect={goTo} dragged={dragged} reduced={reduced} />
                    ))}

                    <AnimatePresence>
                        {hinted && (
                            <m.p
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 2.4, duration: 0.5 }}
                                className="pointer-events-none absolute bottom-[1%] left-1/2 z-[2300] inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-caption font-medium text-muted shadow-sm"
                            >
                                <MoveHorizontal size={13} aria-hidden="true" /> Drag to explore
                            </m.p>
                        )}
                    </AnimatePresence>
                </div>

                <button type="button" onClick={() => stepBy(-1)} aria-label="Previous product" className="absolute left-0 top-[52%] z-[2400] hidden size-10 sm:grid place-items-center rounded-full bg-surface text-ink shadow-md ring-1 ring-line transition-colors hover:bg-primary-tint sm:-left-3"><ChevronLeft size={18} /></button>
                <button type="button" onClick={() => stepBy(1)} aria-label="Next product" className="absolute right-0 top-[52%] z-[2400] hidden size-10 sm:grid place-items-center rounded-full bg-surface text-ink shadow-md ring-1 ring-line transition-colors hover:bg-primary-tint sm:-right-3"><ChevronRight size={18} /></button>
            </m.div>

            {/* what is at the front right now */}
            <div className="mx-auto mt-3 flex max-w-[24rem] items-center gap-3 rounded-2xl bg-surface p-3 shadow-md ring-1 ring-line sm:max-w-[34rem]" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                    <m.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-canvas-alt">
                            <img src={imageUrl(current.image, 160)} alt="" width="56" height="56" className="size-full object-cover" />
                        </span>
                        <span className="min-w-0">
                            <span className="eyebrow block">{current.eyebrow}</span>
                            <Link to={current.href} className="block truncate font-medium text-ink hover:text-primary">{current.title}</Link>
                            <Price price={current.price} originalPrice={current.originalPrice} />
                        </span>
                    </m.div>
                </AnimatePresence>
                <button
                    type="button"
                    onClick={addCurrent}
                    aria-label={`Add ${current.title} to bag`}
                    className={cn('grid size-12 shrink-0 place-items-center rounded-full text-white shadow-md transition-colors', addedId === current.id ? 'bg-success' : 'bg-primary hover:bg-primary-hover')}
                >
                    {addedId === current.id ? <Check size={20} /> : <ShoppingBag size={20} />}
                </button>
            </div>
        </div>
    );
}
