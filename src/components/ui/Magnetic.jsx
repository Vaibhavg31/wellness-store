import { useRef } from 'react';
import { m, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Wraps a button so it drifts a few pixels toward the cursor while the pointer is near it, then springs back.
 * Mouse only: touch screens and "reduce motion" users get the plain element.
 */
export default function Magnetic({ children, strength = 0.28, className }) {
    const ref = useRef(null);
    const reduced = useReducedMotion();
    const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });
    const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });

    const onMove = (event) => {
        if (reduced || event.pointerType !== 'mouse') return;
        const rect = ref.current.getBoundingClientRect();
        x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const reset = () => { x.set(0); y.set(0); };

    return (
        <m.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x, y }} className={className}>
            {children}
        </m.div>
    );
}
