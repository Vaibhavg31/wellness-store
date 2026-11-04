import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The round picture (or icon) of one category; a plain tint when it has neither. */
export function Thumb({ item, className, size }) {
    const Icon = item.icon;
    return (
        <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-tint text-primary', className)}>
            {item.image
                ? <img src={imageUrl(item.image, 240)} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} className="size-full scale-125 object-cover transition-transform duration-500 group-hover:scale-[1.38]" />
                : Icon && <Icon size={Math.round(size * 0.45)} strokeWidth={1.8} aria-hidden="true" />}
        </span>
    );
}

/**
 * A row of categories that slides sideways (swipe on a phone, arrows on a wide screen) and keeps the chosen one in the middle.
 *  - variant "circle": big round pictures with the name underneath (the shop page).
 *  - variant "pill":   compact pills with a small round picture (the bar that sticks under the header on the home page).
 * `items` are { id, label, image?, icon? }. Buttons report `aria-pressed`, so it works as a filter or as a jump bar.
 */
export default function CategoryRail({ items, activeId, onSelect, variant = 'circle', label = 'Categories', className, loading = false }) {
    const rowRef = useRef(null);
    const [edge, setEdge] = useState({ start: true, end: false });

    const measure = useCallback(() => {
        const row = rowRef.current;
        if (!row) return;
        setEdge({ start: row.scrollLeft <= 4, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 4 });
    }, []);

    useEffect(() => {
        measure();
        const row = rowRef.current;
        if (!row) return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        return () => observer.disconnect();
    }, [measure, items.length]);

    // Slide the chosen one to the middle of the row (sideways only, so the page itself never jumps).
    useEffect(() => {
        const row = rowRef.current;
        const node = row?.querySelector('[aria-pressed="true"]');
        if (!row || !node) return;
        const left = Math.max(0, node.offsetLeft - (row.clientWidth - node.offsetWidth) / 2);
        row.scrollTo({ left, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, [activeId]);

    const slide = (dir) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.7, behavior: reducedMotion() ? 'auto' : 'smooth' });
    const circle = variant === 'circle';

    return (
        <div className={cn('group/rail relative', className)}>
            <div
                ref={rowRef}
                role="group"
                aria-label={label}
                onScroll={measure}
                className={cn(
                    'relative flex overflow-x-auto overscroll-x-contain scroll-px-4 scrollbar-none snap-x',
                    circle ? 'gap-3 pb-1 pt-1 sm:gap-5' : 'gap-2 py-2',
                    '-mx-4 px-4 sm:mx-0 sm:px-0',
                    !edge.end && '[mask-image:linear-gradient(to_right,#000_90%,transparent)]',
                    !edge.start && edge.end && '[mask-image:linear-gradient(to_left,#000_90%,transparent)]',
                    !edge.start && !edge.end && '[mask-image:linear-gradient(to_right,transparent,#000_6%,#000_90%,transparent)]',
                )}
            >
                {loading && items.length === 0 && Array.from({ length: 6 }, (_, i) => (
                    circle
                        ? <span key={i} className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2 sm:w-24"><span className="skeleton size-[4.5rem] rounded-full sm:size-20" /><span className="skeleton h-3 w-14 rounded" /></span>
                        : <span key={i} className="skeleton h-11 w-28 shrink-0 rounded-full" />
                ))}
                {items.map((item) => {
                    const active = activeId === item.id;
                    return circle ? (
                        <button
                            key={item.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onSelect(item.id)}
                            className="group flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-2 rounded-lg py-1 text-center sm:w-24"
                        >
                            <Thumb
                                item={item}
                                size={80}
                                className={cn(
                                    'size-[4.5rem] ring-2 ring-offset-2 ring-offset-canvas transition-[box-shadow,transform] duration-300 sm:size-20',
                                    active ? 'ring-primary' : 'ring-line group-hover:ring-primary/50',
                                    'group-active:scale-95',
                                )}
                            />
                            <span className={cn('line-clamp-2 min-h-[2.2em] text-[12px] leading-tight transition-colors sm:text-small', active ? 'font-semibold text-primary' : 'font-medium text-ink')}>{item.label}</span>
                        </button>
                    ) : (
                        <button
                            key={item.id}
                            type="button"
                            data-id={item.id}
                            aria-pressed={active}
                            onClick={() => onSelect(item.id)}
                            className={cn(
                                'group inline-flex h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border pl-1.5 pr-4 text-small font-medium transition-[background-color,color,border-color,box-shadow] duration-300 active:scale-[0.98]',
                                active ? 'border-primary bg-primary text-white shadow-sm' : 'border-line bg-surface text-ink hover:border-primary/50 hover:text-primary',
                            )}
                        >
                            <Thumb item={item} size={32} className={cn('size-8', active ? 'bg-white/20 text-white' : '')} />
                            {item.label}
                        </button>
                    );
                })}
            </div>
            {!edge.start && (
                <button type="button" onClick={() => slide(-1)} aria-label="Scroll categories left" className={cn('absolute left-0 hidden size-10 -translate-x-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md transition-colors hover:border-primary hover:text-primary lg:grid', circle ? 'top-[2.6rem] -translate-y-1/2' : 'top-1/2 -translate-y-1/2')}><ChevronLeft size={18} /></button>
            )}
            {!edge.end && (
                <button type="button" onClick={() => slide(1)} aria-label="Scroll categories right" className={cn('absolute right-0 hidden size-10 translate-x-1/2 place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-md transition-colors hover:border-primary hover:text-primary lg:grid', circle ? 'top-[2.6rem] -translate-y-1/2' : 'top-1/2 -translate-y-1/2')}><ChevronRight size={18} /></button>
            )}
        </div>
    );
}
