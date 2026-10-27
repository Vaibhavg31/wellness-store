import { formatPrice, cn } from '@/utils/formatPrice';

export default function Price({ price, originalPrice, className, size = 'md' }) {
    const hasDiscount = originalPrice > price;
    return (
        <p className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
            <span className={cn('font-semibold text-ink', size === 'lg' ? 'font-display text-h3' : 'text-body')}>{formatPrice(price)}</span>
            {hasDiscount && (
                <span className="text-small text-muted line-through">
                    <span className="sr-only">Original price </span>
                    {formatPrice(originalPrice)}
                </span>
            )}
        </p>
    );
}
