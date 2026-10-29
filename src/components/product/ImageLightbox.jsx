import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const MAX_SCALE = 4;
const BUTTON_STEP = 1.5;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_PX = 60;
const TAP_MS = 300;
const TAP_SLOP = 8;
const FIT = { s: 1, x: 0, y: 0 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundButton = 'pointer-events-auto grid size-11 place-items-center rounded-full bg-surface/95 text-ink shadow-md ring-1 ring-line transition-colors hover:bg-surface disabled:opacity-40 disabled:hover:bg-surface/95';

/**
 * Full-screen photo viewer. Pinch, mouse wheel, double-tap/click or the +/- buttons zoom; a zoomed photo can be dragged
 * around; at normal size a horizontal swipe (or the arrows / arrow keys) moves to the next photo. Escape or the X closes it.
 */
export default function ImageLightbox({ isOpen, images, index, title, onIndexChange, onClose }) {
    const panelRef = useDialog(isOpen, onClose);
    const { mounted, closing } = usePresence(isOpen);
    const [view, setView] = useState(FIT);
    const [smooth, setSmooth] = useState(false);
    const viewRef = useRef(FIT);
    const stageRef = useRef(null);
    const pointers = useRef(new Map());
    const gesture = useRef({ tap: null, lastTap: null, pinch: null, swipe: null });
    const count = images.length;

    const commit = useCallback((next, animate = false) => {
        viewRef.current = next;
        setSmooth(animate);
        setView(next);
    }, []);

    // Keep the photo inside the stage while zoomed (nothing to drag at 1x).
    const bounded = useCallback((s, x, y) => {
        if (s <= 1) return FIT;
        const rect = stageRef.current?.getBoundingClientRect();
        const maxX = rect ? (rect.width * (s - 1)) / 2 : 0;
        const maxY = rect ? (rect.height * (s - 1)) / 2 : 0;
        return { s, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
    }, []);

    // Zoom to `target`, keeping the point (fx, fy) — measured from the stage centre — under the finger / cursor.
    const zoomAt = useCallback((target, fx = 0, fy = 0, animate = false) => {
        const { s, x, y } = viewRef.current;
        const next = clamp(target, 1, MAX_SCALE);
        const k = next / s;
        commit(bounded(next, fx - (fx - x) * k, fy - (fy - y) * k), animate);
    }, [bounded, commit]);

    const reset = useCallback(() => commit(FIT, true), [commit]);

    const go = useCallback((dir) => {
        const next = index + dir;
        if (next < 0 || next >= count) return;
        onIndexChange(next);
    }, [count, index, onIndexChange]);

    // A new photo (or re-opening) starts fitted.
    useEffect(() => { commit(FIT); }, [index, isOpen, commit]);

    // Warm the neighbours so swiping feels instant.
    useEffect(() => {
        if (!isOpen) return;
        [index - 1, index + 1].forEach((i) => { if (images[i]) new Image().src = imageUrl(images[i], 1600); });
    }, [isOpen, images, index]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (event) => {
            if (event.key === 'ArrowLeft') go(-1);
            else if (event.key === 'ArrowRight') go(1);
            else if (event.key === '+' || event.key === '=') zoomAt(viewRef.current.s * BUTTON_STEP, 0, 0, true);
            else if (event.key === '-' || event.key === '_') zoomAt(viewRef.current.s / BUTTON_STEP, 0, 0, true);
            else if (event.key === '0') reset();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, go, zoomAt, reset]);

    // Wheel / trackpad pinch must be non-passive to stop the page scrolling behind the viewer.
    useEffect(() => {
        const stage = stageRef.current;
        if (!mounted || !stage) return undefined;
        const onWheel = (event) => {
            event.preventDefault();
            const rect = stage.getBoundingClientRect();
            const factor = Math.exp((-event.deltaY * (event.ctrlKey ? 0.01 : 0.0018)));
            zoomAt(viewRef.current.s * factor, event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
        };
        stage.addEventListener('wheel', onWheel, { passive: false });
        return () => stage.removeEventListener('wheel', onWheel);
    }, [mounted, zoomAt]);

    const centreOf = (point) => {
        const rect = stageRef.current.getBoundingClientRect();
        return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
    };

    const onPointerDown = (event) => {
        stageRef.current.setPointerCapture?.(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const g = gesture.current;
        if (pointers.current.size === 1) {
            g.tap = { x: event.clientX, y: event.clientY, t: Date.now(), moved: false };
            g.swipe = { x: event.clientX, y: event.clientY };
        } else {
            g.tap = null;
            g.swipe = null;
            const [a, b] = [...pointers.current.values()];
            g.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: viewRef.current.s, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        }
    };

    const onPointerMove = (event) => {
        const prev = pointers.current.get(event.pointerId);
        if (!prev) return;
        const point = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, point);
        const g = gesture.current;

        if (pointers.current.size >= 2 && g.pinch) {
            const [a, b] = [...pointers.current.values()];
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const { s, x, y } = viewRef.current;
            commit(bounded(s, x + mid.x - g.pinch.mid.x, y + mid.y - g.pinch.mid.y));
            g.pinch.mid = mid;
            const focal = centreOf(mid);
            zoomAt(g.pinch.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.pinch.dist), focal.x, focal.y);
            return;
        }

        if (g.tap && Math.hypot(point.x - g.tap.x, point.y - g.tap.y) > TAP_SLOP) g.tap.moved = true;
        const { s, x, y } = viewRef.current;
        if (s > 1) commit(bounded(s, x + point.x - prev.x, y + point.y - prev.y));
    };

    const onPointerUp = (event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.delete(event.pointerId);
        const g = gesture.current;
        if (pointers.current.size > 0) return; // still mid-pinch; the remaining finger must not trigger a tap

        const wasPinch = !!g.pinch;
        g.pinch = null;
        if (wasPinch) { g.swipe = null; return; }

        const { tap, swipe } = g;
        g.tap = null;
        g.swipe = null;
        if (event.type === 'pointercancel') return;

        if (tap && !tap.moved && Date.now() - tap.t < TAP_MS) {
            const last = g.lastTap;
            if (last && Date.now() - last.t < TAP_MS && Math.hypot(event.clientX - last.x, event.clientY - last.y) < 30) {
                g.lastTap = null;
                const focal = centreOf({ x: event.clientX, y: event.clientY });
                if (viewRef.current.s > 1) reset();
                else zoomAt(DOUBLE_TAP_SCALE, focal.x, focal.y, true);
            } else {
                g.lastTap = { x: event.clientX, y: event.clientY, t: Date.now() };
            }
            return;
        }

        if (swipe && viewRef.current.s === 1 && count > 1) {
            const dx = event.clientX - swipe.x;
            const dy = event.clientY - swipe.y;
            if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }
    };

    if (!mounted) return null;
    const zoomed = view.s > 1.001;

    return createPortal(
        <div className={cn('fixed inset-0 z-[120]', closing && 'pointer-events-none')}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={`${title} photos`}
                tabIndex={-1}
                className={cn('absolute inset-0 bg-canvas focus:outline-none', closing ? 'animate-fade-out' : 'animate-fade-in')}
            >
                <div
                    ref={stageRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className={cn('absolute inset-0 touch-none select-none overflow-hidden', zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
                >
                    <img
                        key={index}
                        src={imageUrl(images[index], 1600)}
                        alt={`${title} — photo ${index + 1} of ${count}`}
                        draggable={false}
                        className="size-full object-contain mix-blend-multiply will-change-transform"
                        style={{
                            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`,
                            transition: smooth ? 'transform 0.2s var(--ease-out-soft)' : 'none',
                        }}
                    />
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                    <p className="pointer-events-auto min-w-0 truncate rounded-full bg-surface/95 px-3.5 py-2 text-small font-medium text-ink shadow-xs ring-1 ring-line">
                        {title}{count > 1 && <span className="ml-2 tabular-nums text-muted">{index + 1} / {count}</span>}
                    </p>
                    <button type="button" onClick={onClose} aria-label="Close photo viewer" className={cn(roundButton, 'shrink-0')}>
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {count > 1 && (
                    <>
                        <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous photo" className={cn(roundButton, 'absolute left-2 top-1/2 -translate-y-1/2 sm:left-5')}>
                            <ChevronLeft size={22} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => go(1)} disabled={index === count - 1} aria-label="Next photo" className={cn(roundButton, 'absolute right-2 top-1/2 -translate-y-1/2 sm:right-5')}>
                            <ChevronRight size={22} aria-hidden="true" />
                        </button>
                    </>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 sm:p-5" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                    {!zoomed && <p className="rounded-full bg-surface/90 px-3 py-1 text-caption text-muted">Pinch or double-tap to zoom</p>}
                    <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-surface/95 p-1 shadow-md ring-1 ring-line">
                        <button type="button" onClick={() => zoomAt(view.s / BUTTON_STEP, 0, 0, true)} disabled={view.s <= 1.001} aria-label="Zoom out" className="grid size-11 place-items-center rounded-full text-ink hover:bg-canvas-alt disabled:opacity-40 disabled:hover:bg-transparent">
                            <ZoomOut size={20} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={reset} disabled={!zoomed} aria-label="Reset zoom" className="flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-full px-2 text-small font-medium tabular-nums text-ink hover:bg-canvas-alt disabled:hover:bg-transparent">
                            {zoomed && <RotateCcw size={14} aria-hidden="true" />}
                            {Math.round(view.s * 100)}%
                        </button>
                        <button type="button" onClick={() => zoomAt(view.s * BUTTON_STEP, 0, 0, true)} disabled={view.s >= MAX_SCALE - 0.001} aria-label="Zoom in" className="grid size-11 place-items-center rounded-full text-ink hover:bg-canvas-alt disabled:opacity-40 disabled:hover:bg-transparent">
                            <ZoomIn size={20} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
