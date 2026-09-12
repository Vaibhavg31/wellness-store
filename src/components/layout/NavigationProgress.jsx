import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function NavigationProgress() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(12);

    const timers = [
      setTimeout(() => setProgress(45), 80),
      setTimeout(() => setProgress(72), 180),
      setTimeout(() => setProgress(88), 320),
      setTimeout(() => {
        setProgress(100);
        timers.push(setTimeout(() => setVisible(false), 280));
      }, 480),
    ];

    return () => timers.forEach(clearTimeout);
  }, [pathname]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[150] h-[3px] pointer-events-none"
          role="progressbar"
          aria-hidden="true"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald via-gold to-emerald shadow-[0_0_12px_rgba(212,175,55,0.5)]"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
