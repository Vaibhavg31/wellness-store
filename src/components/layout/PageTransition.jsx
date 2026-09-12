import { useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const pageTransition = {
    initial: { opacity: 0, y: 24, filter: 'blur(4px)' },
    animate: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
    },
    exit: {
        opacity: 0,
        y: -12,
        filter: 'blur(2px)',
        transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
    },
};

export default function PageTransition({ className = '' }) {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        className={className}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

/** Wrap standalone pages (login, 404) without useOutlet */
export function AnimatedPage({ children }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
