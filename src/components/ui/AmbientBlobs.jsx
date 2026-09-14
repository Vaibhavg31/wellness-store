import { cn } from '@/utils/formatPrice';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const PALETTES = {
    forest: ['bg-forest/18', 'bg-sage-light/70', 'bg-turmeric/12'],
    dark: ['bg-sage-light/35', 'bg-turmeric/30', 'bg-cream/20'],
    warm: ['bg-turmeric/16', 'bg-clay/14', 'bg-sage-light/60'],
};

/**
 * Soft blurred blobs that morph shape and drift slowly behind content —
 * the "bubble" ambient background across hero / video-marquee / auth. One
 * shared component instead of copy-pasted absolute-positioned divs per
 * section, so the motion language stays consistent everywhere it's used.
 * Purely decorative: aria-hidden, pointer-events-none, frozen (no
 * animation classes) under prefers-reduced-motion.
 */
export default function AmbientBlobs({ variant = 'forest', className }) {
    const reducedMotion = useReducedMotion();
    const [a, b, c] = PALETTES[variant] ?? PALETTES.forest;
    const anim = reducedMotion ? '' : ' animate-blob-morph';
    const animSlow = reducedMotion ? '' : ' animate-blob-morph-slow';
    const drift = reducedMotion ? '' : ' animate-drift-ambient';

    return (
        <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden="true">
            <div className={cn('absolute -top-[15%] -right-[10%] w-[50%] aspect-square blur-3xl', a, anim)} />
            <div className={cn('absolute -bottom-[20%] -left-[12%] w-[45%] aspect-square blur-3xl', b, animSlow)} />
            <div className={cn('absolute top-[35%] left-[45%] w-[20%] aspect-square blur-2xl', c, anim, drift)} style={reducedMotion ? undefined : { animationDelay: '3s' }} />
        </div>
    );
}
