import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Animated ring + counting percentage — draws from 0 to `value` once. */
export default function MatchRing({ value }) {
    const progress = useMotionValue(0);
    const dashoffset = useTransform(progress, (v) => CIRCUMFERENCE * (1 - v / 100));
    const rounded = useTransform(progress, (v) => Math.round(v));
    const spanRef = useRef(null);

    useEffect(() => {
        const controls = animate(progress, value, { duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] });
        const unsub = rounded.on('change', (v) => {
            if (spanRef.current) spanRef.current.textContent = `${v}%`;
        });
        return () => {
            controls.stop();
            unsub();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
                <circle cx="36" cy="36" r={RADIUS} fill="none" stroke="currentColor" className="text-sand" strokeWidth="5" />
                <motion.circle
                    cx="36"
                    cy="36"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    className="text-emerald"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    style={{ strokeDashoffset: dashoffset }}
                />
            </svg>
            <span ref={spanRef} className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink">
                0%
            </span>
        </div>
    );
}
