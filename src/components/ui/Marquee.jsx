import { Children } from 'react';
import { cn } from '@/utils/formatPrice';

/**
 * A running ribbon: the children glide right to left in a seamless loop. It pauses while hovered or focused (so a
 * link can be tapped or read), and for people who prefer reduced motion it stops and becomes a row they can swipe.
 * `secondsPerItem` sets the pace; it is scaled to how many items one copy holds so a longer ribbon is not faster.
 */
export default function Marquee({ children, className, trackClassName, secondsPerItem = 4, label }) {
    const items = Children.toArray(children);
    if (items.length === 0) return null;

    // Each copy must be at least as wide as the screen or the loop shows a gap, so a short list is repeated.
    const repeat = items.length < 3 ? 6 : items.length < 6 ? 3 : items.length < 10 ? 2 : 1;
    const copy = (n) => (
        <div data-marquee-copy={n} className={cn('flex shrink-0 items-center', trackClassName)} aria-hidden={n === 2 ? 'true' : undefined}>
            {Array.from({ length: repeat }, (_, r) => items.map((child, i) => <div key={`${r}-${i}`} className="shrink-0">{child}</div>))}
        </div>
    );

    return (
        <div className={cn('marquee overflow-hidden', className)} role="group" aria-label={label}>
            <div className="marquee-track" style={{ animationDuration: `${items.length * repeat * secondsPerItem}s` }}>
                {copy(1)}
                {copy(2)}
            </div>
        </div>
    );
}
