import { useEffect, useRef } from 'react';
import { cn } from '@/utils/formatPrice';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const COLORS = {
    light: { dot: 'rgba(251, 249, 244, 0.55)', line: 'rgba(251, 249, 244, 0.16)' },
    dark: { dot: 'rgba(96, 36, 96, 0.45)', line: 'rgba(96, 36, 96, 0.12)' },
};

/**
 * Lightweight canvas "spider net" — a drifting dot field with connecting
 * lines between nearby points, the ambient background motif requested
 * alongside the bubble blobs. Deliberately not a library (no particles.js):
 * ~40 points max, plain 2D canvas, one rAF loop.
 *
 * Only runs while the section is actually on screen (IntersectionObserver)
 * and the tab is visible, and renders nothing at all under
 * prefers-reduced-motion — this is decoration, never worth a battery/CPU
 * cost the viewer didn't ask for.
 */
export default function ConstellationField({ variant = 'light', density = 1, linkDistance = 130, className }) {
    const canvasRef = useRef(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (reducedMotion) return undefined;
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        const { dot, line } = COLORS[variant] ?? COLORS.light;

        let points = [];
        let width = 0;
        let height = 0;
        let raf = null;
        let running = false;
        let visible = false;

        const seed = () => {
            const area = width * height;
            const count = Math.min(48, Math.max(14, Math.round((area / 22000) * density)));
            points = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
            }));
        };

        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            width = canvas.width = rect.width;
            height = canvas.height = rect.height;
            seed();
        };

        const tick = () => {
            if (!running) return;
            ctx.clearRect(0, 0, width, height);

            for (const p of points) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;
                p.x = Math.max(0, Math.min(width, p.x));
                p.y = Math.max(0, Math.min(height, p.y));
            }

            for (let i = 0; i < points.length; i += 1) {
                for (let j = i + 1; j < points.length; j += 1) {
                    const dx = points[i].x - points[j].x;
                    const dy = points[i].y - points[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < linkDistance) {
                        ctx.globalAlpha = 1 - dist / linkDistance;
                        ctx.strokeStyle = line;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(points[i].x, points[i].y);
                        ctx.lineTo(points[j].x, points[j].y);
                        ctx.stroke();
                    }
                }
            }

            ctx.globalAlpha = 1;
            ctx.fillStyle = dot;
            for (const p of points) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }

            raf = requestAnimationFrame(tick);
        };

        const start = () => {
            if (running) return;
            running = true;
            raf = requestAnimationFrame(tick);
        };
        const stop = () => {
            running = false;
            if (raf) cancelAnimationFrame(raf);
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas.parentElement);

        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && document.visibilityState === 'visible') start();
            else stop();
        }, { threshold: 0.05 });
        io.observe(canvas);

        const onVisibility = () => {
            if (document.visibilityState === 'visible' && visible) start();
            else stop();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            stop();
            ro.disconnect();
            io.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [variant, density, linkDistance, reducedMotion]);

    if (reducedMotion) return null;

    return (
        <canvas
            ref={canvasRef}
            className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
            aria-hidden="true"
        />
    );
}
