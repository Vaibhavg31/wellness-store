import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AmbientBlobs from '@/components/ui/AmbientBlobs';
import ConstellationField from '@/components/ui/ConstellationField';
import { BRAND_NAME, BRAND_TAGLINE } from '@/constants';

/**
 * Three dots drifting around the mark in a slow, quiet orbit — the same
 * motif as the homepage's product orbit, not a sparkle ring. A sparkling
 * gem-shimmer sweep across the logo (the previous version of this loader)
 * is exactly the jewelry-template tell this whole redesign is undoing;
 * this reads as wellness/orbit instead.
 */
function OrbitDots() {
    const dots = [
        { angle: 0, radius: 92, size: 7, color: '#D8A860', duration: 9 },
        { angle: 130, radius: 78, size: 5, color: '#FBF9F4', duration: 12 },
        { angle: 250, radius: 100, size: 5, color: '#F1E4F2', duration: 15 },
    ];
    return (
        <>
            {dots.map((d, i) => (
                // Outer div is a pure rotation pivot (zero-size, no visible
                // styling of its own — a <span> here would silently ignore
                // width/height entirely since inline elements don't respect
                // them, which is exactly the bug this shape sidesteps: the
                // dot that's actually drawn is the sized `block` span below,
                // offset out to its orbit radius and carried around by this
                // pivot's own rotation).
                <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: d.duration, ease: 'linear', repeat: Infinity }}
                >
                    <span
                        className="absolute block rounded-full"
                        style={{
                            width: d.size, height: d.size, background: d.color,
                            transform: `rotate(${d.angle}deg) translateY(-${d.radius}px) translate(-50%, -50%)`,
                            boxShadow: `0 0 8px ${d.color}`,
                        }}
                    />
                </motion.div>
            ))}
        </>
    );
}

/**
 * The leaf mark drawing itself — the actual logo's own path data (see
 * src/assets/wellness-logo.svg), not a stand-in icon: the silhouette fades
 * in, then the turmeric vein traces itself stroke-first. It's the brand
 * mark coming to life rather than a generic spinner sitting next to it.
 */
function DrawnMark({ reducedMotion }) {
    return (
        <svg viewBox="0 0 120 120" className="relative z-10 w-full h-full" aria-hidden="true">
            <circle cx="60" cy="60" r="58" fill="#FBF9F4" />
            <motion.path
                d="M60 96C40 84 28 68 28 50C28 36 38 26 50 26C54.5 26 58 27.8 60 30.5C62 27.8 65.5 26 70 26C82 26 92 36 92 50C92 68 80 84 60 96Z"
                fill="#602460"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : 0.15 }}
                style={{ transformOrigin: '60px 68px' }}
            />
            <motion.path
                d="M60 30.5C60 30.5 60 60 60 96"
                stroke="#C08A3E"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: reducedMotion ? 1 : 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.55, ease: 'easeInOut' }}
            />
            <motion.path
                d="M40 50C46 46 54 46 60 52C66 46 74 46 80 50"
                stroke="#C08A3E"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: reducedMotion ? 1 : 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.95, ease: 'easeInOut' }}
            />
        </svg>
    );
}

/**
 * Full-screen loader on first visit only. Always renders children underneath
 * so the app is interactive; the overlay fades after MIN_MS.
 */
export default function InitialAppLoader({ children }) {
    const MIN_MS = 1700;
    const [visible, setVisible] = useState(() => {
        try {
            return sessionStorage.getItem('wellness-loader-seen') !== '1';
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

        // 100% lands right as the reveal finishes, not within the first
        // render tick — it used to jump to 100% immediately (a leftover
        // `setProgress(100)` call here made the whole gradual-climb interval
        // above pointless: the bar would sit at "100%" for the entire ~1.5s
        // the leaf was still mid-draw). This holds it at the interval's
        // gradual climb until the reveal is actually done, then completes it
        // for one visible beat before the overlay fades.
        const completeTimer = setTimeout(() => {
            clearInterval(interval);
            setProgress(100);
        }, remaining);

        const hideTimer = setTimeout(() => {
            setVisible(false);
            try { sessionStorage.setItem('wellness-loader-seen', '1'); } catch { /* ignore */ }
        }, remaining + 200);

        return () => {
            clearInterval(interval);
            clearTimeout(completeTimer);
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
                        exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)', transition: { duration: 0.55, ease: 'easeOut' } }}
                        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-forest pointer-events-none overflow-hidden"
                        aria-label={`Loading ${BRAND_NAME}`}
                        role="status"
                    >
                        <AmbientBlobs variant="dark" className="opacity-70" />
                        {!prefersReduced && <ConstellationField variant="light" density={0.6} className="opacity-40" />}

                        <div className="relative w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center">
                            {!prefersReduced && <OrbitDots />}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-2xl shadow-black/30"
                            >
                                <DrawnMark reducedMotion={prefersReduced} />
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65, duration: 0.55 }}
                            className="relative mt-7 text-center"
                        >
                            <p className="font-display text-2xl sm:text-3xl font-light tracking-[0.06em] text-cream">
                                {BRAND_NAME}
                            </p>
                            <p className="mt-1.5 type-eyebrow text-turmeric-light/70">
                                {BRAND_TAGLINE}
                            </p>
                        </motion.div>

                        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5">
                            <div className="w-36 sm:w-44 h-1 bg-cream/10 overflow-hidden rounded-full">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-turmeric to-turmeric-light"
                                    style={{ width: `${progress}%` }}
                                    transition={{ ease: 'easeOut', duration: 0.2 }}
                                />
                            </div>
                            <p className="type-eyebrow-sm text-cream/40 tabular-nums">{Math.round(progress)}%</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
