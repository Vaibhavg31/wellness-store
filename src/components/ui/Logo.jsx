import { Link } from 'react-router-dom';
import { cn } from '@/utils/formatPrice';
import { useSiteContent } from '@/contexts/SiteContentContext';
import logoMark from '@/assets/chikit-icon.png';

/**
 * Chikit logo component.
 *
 * `logoMark` is the real brand icon (transparent circular leaf mark cropped
 * from CHIKIT/Chikit Without background remove logo.png) — self-contained,
 * so it reads fine on both dark (navbar, footer, hero) and light
 * backgrounds without a filter.
 *
 * Size map is calibrated to a square (1:1) mark. Pass `withWordmark` to also
 * render the brand name as live text next to the icon (navbar/footer/admin
 * contexts) — kept as text rather than baked into an image so it stays in
 * sync with the admin-editable brand name.
 */
const sizeMap = {
    xs: 'h-8',
    sm: 'h-10',
    md: 'h-14 md:h-16',
    lg: 'h-20 md:h-24',
    xl: 'h-28 md:h-32',
    hero: 'h-36 md:h-44',
};

const wordmarkSizeMap = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-2xl md:text-3xl',
    lg: 'text-3xl md:text-4xl',
    xl: 'text-4xl md:text-5xl',
    hero: 'text-5xl md:text-6xl',
};

export default function Logo({
    size = 'md',
    className,
    linkToHome = false,
    showHover = true,
    variant = 'default',
    withWordmark = false,
}) {
    const { content: site } = useSiteContent();
    const isLight = variant === 'light';
    const brandName = site?.brandShort || site?.brandName || 'Chikit';

    const content = (
        <div className={cn('logo-wrap relative inline-flex items-center gap-2.5', showHover && 'group', className)}>
            <span className="relative inline-flex items-center justify-center flex-shrink-0">
                {showHover && (
                    <div
                        className="absolute inset-0 -m-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-[600ms] ease-out pointer-events-none"
                        style={{
                            background: isLight
                                ? 'radial-gradient(circle, rgba(96, 36, 96,0.10) 0%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(192, 138, 62,0.18) 0%, transparent 70%)',
                        }}
                        aria-hidden="true"
                    />
                )}

                <div className={cn('relative transition-transform duration-[600ms] ease-out', showHover && 'group-hover:scale-[1.03]', sizeMap[size])}>
                    <img
                        src={logoMark}
                        alt={withWordmark ? '' : brandName}
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
            </span>

            {withWordmark && (
                <span
                    className={cn('font-display font-medium leading-none tracking-tight', wordmarkSizeMap[size], isLight ? 'text-ink' : 'text-current')}
                >
                    {brandName}
                </span>
            )}
        </div>
    );

    if (linkToHome) {
        return (
            <Link to="/" className="inline-flex flex-shrink-0" aria-label={`${brandName} Home`}>
                {content}
            </Link>
        );
    }
    return content;
}
