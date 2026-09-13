import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import figureSrc from '@/assets/hero-figure-silhouette.png';

const FigureScene = lazy(() => import('./FigureScene'));

function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }, []);
    return reduced;
}

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * "Opening Intro" — a cinematic figure moment shown before the hero banner.
 * A Three.js-rendered figure plane (with a soft particle field) sits behind
 * the headline, gently parallaxing with the pointer and easing in on load.
 * The Suspense fallback renders the exact same layout with a static image
 * instead of the canvas, so there's no layout shift or blank flash while
 * the Three.js chunk loads — progressive enhancement, not a placeholder.
 */
export default function OpeningIntro() {
    const reducedMotion = useReducedMotion();

    return (
        <section
            aria-label="Welcome"
            className="relative h-[92vh] min-h-[560px] max-h-[920px] w-full overflow-hidden bg-gradient-to-b from-[#0A3D25] via-[#0F5132] to-[#0A3D25]"
        >
            <div className="absolute inset-0">
                {reducedMotion ? (
                    <img src={figureSrc} alt="" className="w-full h-full object-cover object-top opacity-90" />
                ) : (
                    <Suspense fallback={<img src={figureSrc} alt="" className="w-full h-full object-cover object-top opacity-90" />}>
                        <FigureScene />
                    </Suspense>
                )}
            </div>

            {/* Vignette so the text stays legible regardless of what the
                figure/particles are doing underneath it. */}
            <div
                className="absolute inset-0 bg-gradient-to-t from-[#0A3D25] via-transparent to-[#0A3D25]/40 pointer-events-none"
                aria-hidden="true"
            />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="relative z-10 h-full flex flex-col items-center justify-end text-center px-6 pb-16 sm:pb-20"
            >
                <motion.p variants={item} className="type-eyebrow text-gold-light mb-3">
                    Every Step Is A Choice
                </motion.p>
                <motion.h1 variants={item} className="font-serif text-4xl sm:text-5xl md:text-6xl text-ivory leading-[1.05] mb-4 max-w-3xl">
                    From Depleted To <span className="text-gold-light">Unstoppable</span>
                </motion.h1>
                <motion.p variants={item} className="text-ivory/65 font-light leading-relaxed max-w-lg mb-8">
                    The same body, running on what you actually give it. See where the shift happens.
                </motion.p>
                <motion.div variants={item}>
                    <Link to="/shop">
                        <Button variant="gold" size="lg" className="px-8">
                            Start Your Ritual
                        </Button>
                    </Link>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-ivory/50"
                aria-hidden="true"
            >
                <span className="text-[10px] tracking-[0.25em] uppercase">Scroll</span>
                <motion.span
                    animate={reducedMotion ? {} : { y: [0, 6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChevronDown size={16} />
                </motion.span>
            </motion.div>
        </section>
    );
}
