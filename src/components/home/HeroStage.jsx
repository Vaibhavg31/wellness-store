import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
import {
    AnimatePresence, animate, m, useAnimationFrame, useMotionTemplate, useMotionValue,
    useMotionValueEvent, useReducedMotion, useSpring, useTransform,
} from 'framer-motion';
import Price from '@/components/ui/Price';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

/**
 * Hero "orbit stage": product packs stand on a slowly turning podium. The ring auto-rotates, tilts toward the
 * cursor, can be dragged or flicked (it coasts to a stop), and clicking a side pack swings it to the front.
 *
 * Positions are projected by hand (3D maths -> translate + scale) instead of CSS preserve-3d, so stacking order,
 * Safari and the tilt all behave. Only transform / opacity / filter change per frame, and nothing re-renders
 * while it spins: React state changes only when a different pack comes to the front.
 */

const RAD = Math.PI / 180;
const AUTO_SPEED = 9; // degrees per second
const DEG_PER_PX = 0.32;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Projects one pack on the ring for the current ring angle, cursor tilt and stage width. */
function project(base, [angle, spread, tiltX, tiltY, width]) {
    const R = width * 0.36;
    const P = width * 2.4;
    const th = (base + angle) * RAD;
    const c = Math.cos(th);
    const x = Math.sin(th) * R * spread;
    const z = c * R * spread;
    const y = c * R * 0.1 * spread; // the near side sits a little lower, like a ring seen from slightly above
    const cx = Math.cos(tiltX * RAD); const sx = Math.sin(tiltX * RAD);
    const cy = Math.cos(tiltY * RAD); const sy = Math.sin(tiltY * RAD);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const p = P / (P - z2);
    return { x: x1 * p, y: y2 * p, scale: p * (0.3 + 0.7 * spread), z: z2, depth: (c + 1) / 2, spread };
}

function OrbitItem({ item, index, size, footY, base, controls, active, onSelect, dragged }) {
    const { angle, spread, tiltX, tiltY, width } = controls;
    const state = useTransform([angle, spread, tiltX, tiltY, width], (values) => project(base, values));
    const x = useTransform(state, (s) => s.x);
    const y = useTransform(state, (s) => s.y);
    const scale = useTransform(state, (s) => s.scale);
    const zIndex = useTransform(state, (s) => 1000 + Math.round(s.z));
    const opacity = useTransform(state, (s) => clamp(0.35 + 0.65 * s.depth ** 0.6, 0, 1) * clamp(s.spread * 1.6, 0, 1));
    const height = (size * 4) / 3;

    const handleClick = (event) => {
        if (dragged.current || !active) {
            event.preventDefault();
            if (!dragged.current) onSelect(index);
        }
    };

    return (
        <m.div
            className="absolute left-1/2"
            style={{ width: size, height, top: footY - height, marginLeft: -size / 2, transformOrigin: '50% 100%', x, y, scale, zIndex, opacity, willChange: 'transform, opacity' }}
        >
            <Link
                to={item.href}
                onClick={handleClick}
                aria-label={active ? item.title : `${item.title}: bring to front`}
                className="block size-full rounded-lg outline-offset-4"
                draggable={false}
            >
                {item.cutout ? (
                    <img src={imageUrl(item.cutout)} alt="" width="600" height="800" decoding="async" draggable={false} className="size-full object-contain" />
                ) : (
                    <span className="block size-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
                        <img src={imageUrl(item.image, 480)} alt="" width="480" height="640" decoding="async" draggable={false} className="size-full object-cover" />
                    </span>
                )}
            </Link>
        </m.div>
    );
}

function Leaf({ className, style }) {
    return (
        <svg viewBox="0 0 100 60" aria-hidden="true" className={className} style={style}>
            <path d="M2,30 C20,0 72,0 98,30 C72,60 20,60 2,30 Z" fill="currentColor" />
            <path d="M2,30 L94,30" stroke="#fff" strokeWidth="1.2" opacity=".35" />
        </svg>
    );
}

/** A decorative layer that drifts with the cursor; `depth` is how many pixels it can travel. */
function Drift({ depth, pointer, className, style, children }) {
    const x = useTransform(pointer.x, (v) => v * depth);
    const y = useTransform(pointer.y, (v) => v * depth);
    return <m.div style={{ x, y, ...style }} className={cn('pointer-events-none absolute', className)} aria-hidden="true">{children}</m.div>;
}

export default function HeroStage({ items }) {
    const reduced = useReducedMotion();
    const rootRef = useRef(null);
    const count = items.length;
    const step = 360 / count;

    const [stageWidth, setStageWidth] = useState(520);
    const [active, setActive] = useState(0);
    const [hinted, setHinted] = useState(true);

    const angle = useMotionValue(reduced ? 0 : -70);
    const spread = useMotionValue(reduced ? 1 : 0);
    const width = useMotionValue(520);
    const rawTiltX = useMotionValue(0);
    const rawTiltY = useMotionValue(0);
    const tiltX = useSpring(rawTiltX, { stiffness: 90, damping: 18, mass: 0.6 });
    const tiltY = useSpring(rawTiltY, { stiffness: 90, damping: 18, mass: 0.6 });
    const rawPx = useMotionValue(0);
    const rawPy = useMotionValue(0);
    const pointer = { x: useSpring(rawPx, { stiffness: 70, damping: 16, mass: 0.7 }), y: useSpring(rawPy, { stiffness: 70, damping: 16, mass: 0.7 }) };
    const glowX = useTransform(pointer.x, (v) => 50 + v * 90);
    const glowY = useTransform(pointer.y, (v) => 42 + v * 90);
    const glow = useMotionTemplate`radial-gradient(38% 38% at ${glowX}% ${glowY}%, rgb(255 255 255 / 0.85), rgb(255 255 255 / 0) 70%)`;

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

    /* intro: the ring unwinds and the packs rise out of the podium */
    useEffect(() => {
        if (reduced) { spread.set(1); angle.set(0); return undefined; }
        live.current.snapping = true;
        const a = animate(spread, 1, { duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 });
        const b = animate(angle, 0, { duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.1, onComplete: () => { live.current.snapping = false; } });
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

    /* cursor: tilt the ring, drift the decor and move the light. Anywhere over the hero counts. */
    useEffect(() => {
        const node = rootRef.current;
        if (!node || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
        const area = node.closest('section') ?? node;
        const onMove = (event) => {
            const rect = node.getBoundingClientRect();
            const nx = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.9), -1, 1);
            const ny = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.9), -1, 1);
            rawTiltY.set(nx * 11);
            rawTiltX.set(-ny * 7);
            rawPx.set(nx * 0.5);
            rawPy.set(ny * 0.5);
        };
        const onLeave = () => { rawTiltX.set(0); rawTiltY.set(0); rawPx.set(0); rawPy.set(0); };
        area.addEventListener('pointermove', onMove);
        area.addEventListener('pointerleave', onLeave);
        return () => { area.removeEventListener('pointermove', onMove); area.removeEventListener('pointerleave', onLeave); };
    }, [reduced, rawTiltX, rawTiltY, rawPx, rawPy]);

    /* motion: constant slow spin (easing down while hovered), plus the coasting left over from a flick */
    useAnimationFrame((_, delta) => {
        const s = live.current;
        if (reduced || !s.visible || s.snapping || s.dragging) return;
        const dt = Math.min(delta, 50) / 1000;
        s.coast *= Math.exp(-dt * 2.2);
        if (Math.abs(s.coast) < 0.05) s.coast = 0;
        const target = performance.now() < s.holdUntil ? 0 : s.hover ? AUTO_SPEED * 0.3 : AUTO_SPEED;
        s.auto += (target - s.auto) * Math.min(1, dt * 3);
        angle.set(angle.get() + (s.auto + s.coast) * dt);
    });

    useMotionValueEvent(angle, 'change', (value) => {
        const index = (((Math.round(-value / step)) % count) + count) % count;
        if (index !== activeRef.current) { activeRef.current = index; setActive(index); }
    });

    const goTo = useCallback((index) => {
        const s = live.current;
        const desired = -index * step;
        const turns = Math.round((angle.get() - desired) / 360);
        s.snapping = true;
        s.coast = 0;
        s.holdUntil = performance.now() + 3200;
        snap.current?.stop();
        snap.current = animate(angle, desired + turns * 360, {
            ...(reduced ? { duration: 0.01 } : { type: 'spring', stiffness: 70, damping: 15, mass: 0.9 }),
            onComplete: () => { s.snapping = false; },
        });
    }, [angle, reduced, step]);

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

    const size = stageWidth * 0.3;
    const footY = stageWidth * 0.74;
    const controls = { angle, spread, tiltX, tiltY, width };
    const current = items[active] ?? items[0];

    return (
        <div>
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
                className="relative isolate mx-auto aspect-square w-full max-w-[34rem] cursor-grab touch-pan-y select-none rounded-xl outline-offset-4 active:cursor-grabbing"
            >
                {/* light and atmosphere */}
                <Drift depth={14} pointer={pointer} className="inset-[6%]">
                    <div className="size-full rounded-full" style={{ background: 'radial-gradient(closest-side, #fff 0%, var(--color-primary-tint) 62%, rgb(241 228 242 / 0) 100%)' }} />
                </Drift>
                <div className="pointer-events-none absolute inset-[3%] animate-orbit-spin rounded-full border border-dashed border-primary/25" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-0 rounded-full opacity-70" style={{ background: glow }} aria-hidden="true" />
                <img src="/brand/chikit-icon.webp" alt="" width="160" height="160" className="pointer-events-none absolute left-[33%] top-[16%] w-[34%] animate-orbit-spin-reverse opacity-[0.09]" draggable={false} />

                {/* podium */}
                <div className="pointer-events-none absolute left-[9%] right-[9%] rounded-[50%] bg-gradient-to-b from-surface to-primary-tint shadow-lg ring-1 ring-line" style={{ top: footY - stageWidth * 0.062, height: stageWidth * 0.124 }} aria-hidden="true" />
                <div className="pointer-events-none absolute left-[22%] right-[22%] rounded-[50%] bg-ink/10 blur-md" style={{ top: footY + stageWidth * 0.05, height: stageWidth * 0.05 }} aria-hidden="true" />

                {/* behind the packs */}
                <Drift depth={-18} pointer={pointer} className="left-[2%] top-[34%] w-[26%]">
                    <m.div animate={reduced ? undefined : { y: [0, -10, 0], rotate: [-24, -18, -24] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
                        <Leaf className="text-success/55" style={{ transform: 'rotate(-24deg)' }} />
                    </m.div>
                </Drift>
                <Drift depth={-12} pointer={pointer} className="right-[3%] top-[22%] w-[20%]">
                    <m.div animate={reduced ? undefined : { y: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
                        <Leaf className="text-success/45" style={{ transform: 'rotate(200deg)' }} />
                    </m.div>
                </Drift>

                {/* the ring */}
                {items.map((item, index) => (
                    <OrbitItem key={item.id} item={item} index={index} size={size} footY={footY} base={index * step} controls={controls} active={index === active} onSelect={goTo} dragged={dragged} />
                ))}

                <AnimatePresence>
                    {hinted && (
                        <m.p
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 2.2, duration: 0.5 }}
                            className="pointer-events-none absolute left-1/2 top-[2%] z-[2300] inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-caption font-medium text-muted shadow-sm"
                        >
                            <MoveHorizontal size={13} aria-hidden="true" /> Drag to explore
                        </m.p>
                    )}
                </AnimatePresence>
            </div>

            {/* what is at the front right now */}
            <div className="mx-auto mt-5 flex max-w-[34rem] items-center justify-between gap-3 rounded-lg bg-surface p-3 pl-4 shadow-md ring-1 ring-line" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                    <m.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="min-w-0">
                        <span className="eyebrow block">{current.eyebrow}</span>
                        <Link to={current.href} className="block truncate font-medium text-ink hover:text-primary">{current.title}</Link>
                        <Price price={current.price} originalPrice={current.originalPrice} />
                    </m.div>
                </AnimatePresence>
                <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => stepBy(-1)} aria-label="Previous product" className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-primary-tint"><ChevronLeft size={18} /></button>
                    <div className="hidden items-center gap-1.5 sm:flex" role="group" aria-label="Choose product">
                        {items.map((item, index) => (
                            <button key={item.id} type="button" onClick={() => goTo(index)} aria-label={`Show ${item.title}`} aria-current={index === active} className="grid h-6 place-items-center px-0.5">
                                <span className={cn('block h-1.5 rounded-full transition-[width,background-color] duration-300', index === active ? 'w-5 bg-primary' : 'w-1.5 bg-line-strong/60')} />
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => stepBy(1)} aria-label="Next product" className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-primary-tint"><ChevronRight size={18} /></button>
                </div>
            </div>
        </div>
    );
}
