import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

const DotLottieReact = lazy(() =>
    import('@lottiefiles/dotlottie-react').then((m) => ({ default: m.DotLottieReact }))
);

/**
 * Shimmer/sparkle burst shown at each scroll checkpoint. Renders a hosted
 * Lottie file when `lottieUrl` is configured (admin-editable later); until
 * then falls back to a small set of CSS/Framer sparkle particles so the
 * effect never depends on an external asset being reachable.
 */
export default function SparkleBurst({ lottieUrl, burstKey }) {
    if (lottieUrl) {
        return (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <Suspense fallback={null}>
                    <DotLottieReact key={burstKey} src={lottieUrl} autoplay loop={false} className="w-40 h-40" />
                </Suspense>
            </div>
        );
    }

    const particles = Array.from({ length: 7 });

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {particles.map((_, i) => {
                const angle = (i / particles.length) * Math.PI * 2;
                const distance = 70 + (i % 3) * 20;
                return (
                    <motion.span
                        key={`${burstKey}-${i}`}
                        className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-gold"
                        style={{ boxShadow: '0 0 8px 2px rgba(217,178,111,0.8)' }}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                        animate={{
                            opacity: [0, 1, 0],
                            x: Math.cos(angle) * distance,
                            y: Math.sin(angle) * distance,
                            scale: [0.4, 1.1, 0.6],
                        }}
                        transition={{ duration: 1.1, delay: i * 0.03, ease: 'easeOut' }}
                    />
                );
            })}
        </div>
    );
}
