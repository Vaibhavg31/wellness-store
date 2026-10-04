import { useRef } from 'react';
import { cn } from '@/utils/formatPrice';

/**
 * Wraps content in a pointer-driven 3D tilt with a moving glare.
 * Uses transform/opacity only; disabled for touch input and reduced motion (via CSS + hover media check).
 */
export default function TiltCard({ children, className, max = 7 }) {
    const cardRef = useRef(null);
    const glareRef = useRef(null);
    const frame = useRef(0);

    const enabled = () => window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;

    const onMove = (e) => {
        if (!enabled()) return;
        const el = cardRef.current;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            el.style.transform = `perspective(1000px) rotateY(${(x - 0.5) * max * 2}deg) rotateX(${(0.5 - y) * max * 2}deg) scale3d(1.015,1.015,1.015)`;
            if (glareRef.current) {
                glareRef.current.style.opacity = '1';
                glareRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgb(255 255 255 / 0.28), transparent 55%)`;
            }
        });
    };

    const onLeave = () => {
        cancelAnimationFrame(frame.current);
        const el = cardRef.current;
        el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)';
        if (glareRef.current) glareRef.current.style.opacity = '0';
    };

    return (
        <div onPointerMove={onMove} onPointerLeave={onLeave} className={cn('relative', className)}>
            <div ref={cardRef} className="relative transition-transform duration-300 ease-out will-change-transform">
                {children}
                <div ref={glareRef} aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300" />
            </div>
        </div>
    );
}
