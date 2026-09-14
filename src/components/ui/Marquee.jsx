import { isValidElement } from 'react';
import { cn } from '@/utils/formatPrice';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Infinite horizontal ticker — one strip of content duplicated once and
 * animated -50% so the loop is seamless, no JS measurement required.
 * Used for the navbar trust strip and the video banner overlay so both
 * read as "alive" instead of a static centered line of text (the generic
 * template convention this redesign is moving away from).
 *
 * Pass either `items` (array of strings/nodes, auto-separated with a
 * dot) or raw `children` for full control over one repeating unit.
 */
export default function Marquee({ items, children, speed = 28, className, itemClassName, separator = true }) {
    const reducedMotion = useReducedMotion();

    const unit = children ?? (
        <span className={cn('inline-flex items-center gap-3 sm:gap-4', itemClassName)}>
            {items.map((item, i) => (
                <span key={isValidElement(item) ? i : String(item)} className="inline-flex items-center gap-3 sm:gap-4 whitespace-nowrap">
                    {item}
                    {separator && <span aria-hidden="true" className="opacity-40">&middot;</span>}
                </span>
            ))}
        </span>
    );

    if (reducedMotion) {
        return (
            <div className={cn('overflow-x-auto hide-scrollbar', className)}>
                {unit}
            </div>
        );
    }

    return (
        <div className={cn('overflow-hidden', className)} aria-hidden={items ? undefined : true}>
            <div
                className="flex w-max animate-ticker"
                style={{ animationDuration: `${speed}s` }}
            >
                {unit}
                {unit}
            </div>
        </div>
    );
}
