import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoMaroon from '@/assets/krivea-logo-maroon.png';

function Sparkle({ cx, cy, size, delay, duration }) {
    return (
        <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: [0, 1, 1, 0],
                scale:   [0, 1, 1.1, 0],
                rotate:  [0, 45, 90, 135],
            }}
            transition={{ delay, duration, ease: 'easeInOut', repeat: Infinity, repeatDelay: duration * 0.6 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
            <path
                d={`M${cx},${cy - size} Q${cx + size * 0.18},${cy - size * 0.18} ${cx + size},${cy} Q${cx + size * 0.18},${cy + size * 0.18} ${cx},${cy + size} Q${cx - size * 0.18},${cy + size * 0.18} ${cx - size},${cy} Q${cx - size * 0.18},${cy - size * 0.18} ${cx},${cy - size}Z`}
                fill="rgba(242,184,181,0.9)"
            />
        </motion.g>
    );
}

function SparkleRing() {
    const sparkles = [
        { cx: 200, cy: 80,  size: 10, delay: 0,    duration: 1.8 },
        { cx: 320, cy: 120, size: 7,  delay: 0.3,  duration: 2.1 },
        { cx: 370, cy: 220, size: 12, delay: 0.6,  duration: 1.6 },
        { cx: 300, cy: 330, size: 6,  delay: 0.9,  duration: 2.3 },
        { cx: 160, cy: 350, size: 9,  delay: 0.2,  duration: 1.9 },
        { cx: 60,  cy: 260, size: 11, delay: 0.5,  duration: 1.7 },
        { cx: 50,  cy: 140, size: 6,  delay: 0.8,  duration: 2.0 },
        { cx: 130, cy: 60,  size: 8,  delay: 1.1,  duration: 1.8 },
    ];

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 420 420" fill="none" aria-hidden="true">
            {sparkles.map((s, i) => <Sparkle key={i} {...s} />)}
        </svg>
    );
}

/**
 * Full-screen loader on first visit only. Always renders children underneath
 * so the app is interactive; the overlay fades after MIN_MS.
 */
export default function InitialAppLoader({ children }) {
    const MIN_MS = 1400;
    const [visible, setVisible] = useState(() => {
        try {
            return sessionStorage.getItem('krivea-loader-seen') !== '1';
        } catch {
            return true;
        }
    });
    const [progress, setProgress] = useState(0);
    const startRef = useRef(Date.now());

    const prefersReduced = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    useEffect(() => {
        if (!visible) return undefined;

        const interval = setInterval(() => {
            setProgress((p) => {
                if (p >= 90) { clearInterval(interval); return p; }
                return p + (90 - p) * 0.07 + 1;
            });
        }, 50);

        const elapsed = Date.now() - startRef.current;
        const remaining = Math.max(0, MIN_MS - elapsed);
        setProgress(100);

        const hideTimer = setTimeout(() => {
            setVisible(false);
            try { sessionStorage.setItem('krivea-loader-seen', '1'); } catch { /* ignore */ }
        }, remaining + 200);

        return () => {
            clearInterval(interval);
            clearTimeout(hideTimer);
        };
    }, [visible]);

    return (
        <>
            {children}
            <AnimatePresence>
                {visible && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
                        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-wine pointer-events-none"
                        aria-label="Loading Krivea Jewels"
                        role="status"
                    >
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(242,184,181,0.08) 0%, transparent 70%)' }}
                            aria-hidden="true"
                        />

                        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                            {!prefersReduced && <SparkleRing />}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                className="relative z-10 w-40 h-40 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl"
                            >
                                <img src={logoMaroon} alt="Krivea Jewels" className="w-full h-full object-cover" draggable={false} />
                                {!prefersReduced && (
                                    <motion.div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background: 'linear-gradient(105deg, transparent 30%, rgba(242,184,181,0.20) 50%, transparent 70%)',
                                            backgroundSize: '200% 100%',
                                        }}
                                        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                                        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                                    />
                                )}
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.55 }}
                            className="mt-6 text-center"
                        >
                            <p className="font-serif text-2xl sm:text-3xl font-light tracking-[0.06em] text-ivory">
                                Krivea Jewels
                            </p>
                            <p className="mt-1.5 text-[10px] tracking-[0.35em] uppercase text-blush/60">
                                Wear the Sparkle
                            </p>
                        </motion.div>

                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-32 h-px bg-ivory/10 overflow-hidden rounded-full">
                            <motion.div
                                className="h-full bg-blush/60 rounded-full"
                                style={{ width: `${progress}%` }}
                                transition={{ ease: 'easeOut', duration: 0.2 }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
