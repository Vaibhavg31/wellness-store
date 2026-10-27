import { Star } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

export default function Rating({ value = 0, count, size = 14, className }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-small text-muted', className)}>
            <span className="inline-flex" role="img" aria-label={`Rated ${value} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={size} strokeWidth={0} className={n <= Math.round(value) ? 'fill-accent' : 'fill-line'} aria-hidden="true" />
                ))}
            </span>
            {count != null && <span>({count})</span>}
        </span>
    );
}
