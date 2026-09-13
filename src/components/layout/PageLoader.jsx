import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { BRAND_TAGLINE } from '@/constants';

export default function PageLoader({ message = 'Loading...' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-[60vh] flex flex-col items-center justify-center bg-cream px-6"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col items-center"
      >
        <Logo size="lg" showHover={false} />
        <p className="mt-6 font-display text-sm tracking-[0.25em] uppercase text-emerald/80">
          {message}
        </p>
        <p className="mt-2 text-xs text-slate tracking-wide">{BRAND_TAGLINE}</p>
      </motion.div>

      <div className="mt-10 w-48 h-px bg-border overflow-hidden rounded-full">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald via-turmeric to-emerald"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-turmeric"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
