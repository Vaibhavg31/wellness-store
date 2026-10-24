import { Link } from 'react-router-dom';
import { cn } from '@/utils/formatPrice';

/**
 * Official Chikit logo lockup (icon + wordmark + "Ayurveda and Wellness").
 * The artwork is untouched; only its file format/size is optimised.
 * Single-colour plum on transparent — always place it on a light surface
 * (canvas / surface / primary-tint) and leave clear space around it
 * (the link padding below). Intrinsic ratio 1000×305 is declared to prevent
 * layout shift.
 */
const sizes = {
    sm: 'h-10',
    md: 'h-12',
    header: 'h-10 lg:h-12',
    lg: 'h-16',
    xl: 'h-24 sm:h-28',
};

export default function Logo({ size = 'md', className, linkToHome = false, priority = false, shine }) {
    const picture = (
        <img
            src="/brand/chikit-logo.webp"
            srcSet="/brand/chikit-logo-480.webp 480w, /brand/chikit-logo.webp 1000w"
            sizes="(max-width: 640px) 160px, 240px"
            width="1000"
            height="305"
            alt="Chikit™ — Ayurveda and Wellness"
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
            className={cn('aspect-[1000/305] w-auto object-contain', sizes[size], className)}
            draggable={false}
        />
    );
    // `shine`: 'hover' (light passes over it on hover), 'intro' (once, a moment after it appears) or 'loop' (loaders).
    const img = shine ? (
        <span className="logo-shine" data-shine={shine}>
            {picture}
            <span className="logo-sheen" aria-hidden="true" />
        </span>
    ) : picture;
    if (!linkToHome) return img;
    return (
        <Link to="/" className="inline-flex flex-shrink-0 rounded-sm p-1" aria-label="Chikit home">
            {img}
        </Link>
    );
}
