import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { formatPrice, cn } from '@/utils/formatPrice';

/** One tappable choice. `count` is the faceted number of products it would show; 0 reads as unavailable but stays tappable. */
function Choice({ active, onClick, children, count }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-small font-medium transition-colors active:scale-[0.97]',
                active ? 'border-primary bg-primary text-white shadow-xs' : 'border-line-strong bg-surface text-ink',
                !active && count === 0 && 'opacity-45',
            )}
        >
            {active && <Check size={14} aria-hidden="true" />}
            <span>{children}</span>
            {typeof count === 'number' && <span className={cn('text-caption tabular-nums', active ? 'text-white/80' : 'text-muted')}>{count}</span>}
        </button>
    );
}

function Section({ title, aside, children }) {
    return (
        <section className="border-t border-line px-5 py-5 first:border-t-0 sm:px-6">
            <h3 className="mb-3 flex items-baseline justify-between gap-3 font-sans text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                <span>{title}</span>{aside}
            </h3>
            {children}
        </section>
    );
}

/** A few friendly "up to" steps below the most expensive product, so a price can be picked with one tap. */
function priceSteps(ceiling) {
    return [300, 500, 1000, 2000].filter((step) => step < ceiling);
}

/**
 * Phone filter: a bottom sheet with chips instead of a long list of radio rows. Each tap applies straight away
 * (the button at the bottom always says how many products are showing), and the sheet closes by tapping outside,
 * the close button, Escape or by swiping its handle down.
 */
export default function FilterSheet({ isOpen, onClose, categories, tags, filters, counts, ceiling, maxPrice, onChange, sortOptions, resultCount, activeCount, onReset }) {
    const panelRef = useDialog(isOpen, onClose);
    const { mounted, closing } = usePresence(isOpen);
    const [drag, setDrag] = useState(0);
    const startY = useRef(null);

    if (!mounted) return null;

    const onTouchStart = (event) => { startY.current = event.touches[0].clientY; };
    const onTouchMove = (event) => {
        if (startY.current === null) return;
        setDrag(Math.max(0, event.touches[0].clientY - startY.current));
    };
    const onTouchEnd = () => {
        const shouldClose = drag > 90;
        startY.current = null;
        setDrag(0);
        if (shouldClose) onClose();
    };

    const steps = priceSteps(ceiling);
    const anyPrice = filters.maxPrice === Infinity || filters.maxPrice >= ceiling;

    return createPortal(
        <div className={cn('fixed inset-0 z-[100]', closing && 'pointer-events-none')}>
            <div className={cn('absolute inset-0 bg-ink/50', closing ? 'animate-fade-out' : 'animate-fade-in')} onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Filters"
                tabIndex={-1}
                style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
                className={cn(
                    'absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-lg focus:outline-none',
                    closing ? 'animate-sheet-down' : 'animate-sheet-up',
                )}
            >
                <div className="shrink-0 touch-none select-none" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                    <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-line-strong" aria-hidden="true" />
                    <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3 sm:px-6">
                        <h2 className="font-sans text-h4">Filters{activeCount > 0 && <span className="ml-2 inline-grid size-6 place-items-center rounded-full bg-primary align-middle text-caption leading-none text-white">{activeCount}</span>}</h2>
                        <button type="button" onClick={onClose} aria-label="Close filters" className="-mr-2 grid size-10 place-items-center rounded-full text-ink hover:bg-canvas-alt">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line pb-2">
                    <Section title="Sort by">
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Sort by">
                            {sortOptions.map((option) => (
                                <Choice key={option.value} active={filters.sort === option.value} onClick={() => onChange('sort', option.value)}>{option.label}</Choice>
                            ))}
                        </div>
                    </Section>

                    <Section title="Category">
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
                            <Choice active={filters.category === 'all'} onClick={() => onChange('category', 'all')} count={counts.categoryTotal}>All products</Choice>
                            {categories.map((c) => (
                                <Choice key={c.slug} active={filters.category === c.slug} onClick={() => onChange('category', c.slug)} count={counts.category[c.slug] ?? 0}>{c.label}</Choice>
                            ))}
                        </div>
                    </Section>

                    {tags.length > 0 && (
                        <Section title="Collection">
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Collection">
                                <Choice active={filters.tag === 'all'} onClick={() => onChange('tag', 'all')}>Everything</Choice>
                                {tags.map((tag) => (
                                    <Choice key={tag} active={filters.tag === tag} onClick={() => onChange('tag', tag)} count={counts.tag[tag] ?? 0}>{tag}</Choice>
                                ))}
                            </div>
                        </Section>
                    )}

                    <Section title="Price" aside={<span className="text-small font-semibold normal-case tracking-normal text-ink">{anyPrice ? 'Any price' : `Up to ${formatPrice(maxPrice)}`}</span>}>
                        <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Quick price">
                            <Choice active={anyPrice} onClick={() => onChange('maxPrice', Infinity)}>Any price</Choice>
                            {steps.map((step) => (
                                <Choice key={step} active={!anyPrice && filters.maxPrice === step} onClick={() => onChange('maxPrice', step)}>Under {formatPrice(step)}</Choice>
                            ))}
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={ceiling}
                            step={50}
                            value={maxPrice}
                            onChange={(e) => onChange('maxPrice', Number(e.target.value))}
                            className="price-range mt-1 w-full"
                            style={{ '--fill': `${ceiling ? (maxPrice / ceiling) * 100 : 100}%` }}
                            aria-label="Maximum price"
                        />
                        <div className="flex justify-between text-caption text-muted"><span>{formatPrice(0)}</span><span>{formatPrice(ceiling)}</span></div>
                    </Section>
                </div>

                <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-5 pt-3 safe-area-pb sm:px-6">
                    <Button variant="outline" onClick={onReset} disabled={activeCount === 0 && !filters.search} className="shrink-0">
                        <RotateCcw size={16} aria-hidden="true" /> Clear
                    </Button>
                    <Button onClick={onClose} className="min-w-0 flex-1">
                        {resultCount === 0 ? 'No products found' : `Show ${resultCount} ${resultCount === 1 ? 'product' : 'products'}`}
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
