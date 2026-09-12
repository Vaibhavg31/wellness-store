import { Link } from 'react-router-dom';
import { cn } from '@/utils/formatPrice';
import logoTransparent from '@/assets/krivea-logo-transparent.png';

/**
 * Krivea logo component.
 *
 * The transparent PNG (pink art on a transparent canvas) is used everywhere.
 * It is designed to sit on Wine Maroon backgrounds (navbar, footer, hero) where
 * it reads beautifully. On light backgrounds the `variant="light"` prop applies
 * a CSS filter to render it in a dark tone that stays legible.
 *
 * Size map is calibrated to the real artwork dimensions (341×299, ~1.14:1).
 */
const sizeMap = {
    xs: 'h-8',
    sm: 'h-10',
    md: 'h-14 md:h-16',
    lg: 'h-20 md:h-24',
    xl: 'h-28 md:h-32',
    hero: 'h-36 md:h-44',
};

export default function Logo({
    size = 'md',
    className,
    linkToHome = false,
    showHover = true,
    variant = 'default',
}) {
    const isLight = variant === 'light';

    const content = (
        <div className={cn('logo-wrap relative inline-flex items-center justify-center', showHover && 'group', className)}>
            {showHover && (
                <div
                    className="absolute inset-0 -m-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-[600ms] ease-out pointer-events-none"
                    style={{
                        background: isLight
                            ? 'radial-gradient(circle, rgba(90,0,9,0.10) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(242,184,181,0.15) 0%, transparent 70%)',
                    }}
                    aria-hidden="true"
                />
            )}

            <div className={cn('relative transition-transform duration-[600ms] ease-out', showHover && 'group-hover:scale-[1.03]', sizeMap[size])}>
                <img
                    src={logoTransparent}
                    alt="Krivea Jewels"
                    className="h-full w-auto object-contain"
                    draggable={false}
                    style={isLight ? { filter: 'brightness(0.15) sepia(0.3)' } : undefined}
                />
                {showHover && (
                    <div
                        className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-[600ms]"
                        aria-hidden="true"
                    >
                        <div className="absolute inset-0 shimmer opacity-40 group-hover:shimmer-animate" />
                    </div>
                )}
            </div>
        </div>
    );

    if (linkToHome) {
        return (
            <Link to="/" className="inline-flex flex-shrink-0" aria-label="Krivea Jewels Home">
                {content}
            </Link>
        );
    }
    return content;
}
