import { Link } from 'react-router-dom';
import { cn } from '@/utils/formatPrice';
import logoMark from '@/assets/wellness-logo.svg';

/**
 * Wellness Store logo component.
 *
 * `logoMark` is a placeholder brand mark (swap the file to drop in real
 * artwork) — it's a self-contained circular badge, so it reads fine on both
 * dark (navbar, footer, hero) and light backgrounds without a filter.
 *
 * Size map is calibrated to a square (1:1) mark.
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
                            ? 'radial-gradient(circle, rgba(15, 81, 50,0.10) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(253, 230, 138,0.15) 0%, transparent 70%)',
                    }}
                    aria-hidden="true"
                />
            )}

            <div className={cn('relative transition-transform duration-[600ms] ease-out', showHover && 'group-hover:scale-[1.03]', sizeMap[size])}>
                <img
                    src={logoMark}
                    alt="Wellness Store"
                    className="h-full w-auto object-contain"
                    draggable={false}
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
            <Link to="/" className="inline-flex flex-shrink-0" aria-label="Wellness Store Home">
                {content}
            </Link>
        );
    }
    return content;
}
