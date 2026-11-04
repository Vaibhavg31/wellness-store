import { useEffect, useRef } from 'react';
import { Crown } from 'lucide-react';
import { formatPrice, cn } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';

/** Rough per-day cost read from a duration in the label ("1 Month Supply"); null otherwise. */
function estimateDailyCost(label, price) {
    if (!label || !price) return null;
    const month = label.match(/(\d+)\s*month/i);
    const week = !month && label.match(/(\d+)\s*week/i);
    const days = month ? Number(month[1]) * 30 : week ? Number(week[1]) * 7 : null;
    if (!days) return null;
    const perDay = price / days;
    return perDay >= 1 ? Math.round(perDay) : Math.round(perDay * 100) / 100;
}

/** The bottles in a pack: one round photo per unit (up to five), overlapping, so "3 bottles" looks like three. */
function Bottles({ units, src, size }) {
    const shown = Math.min(Math.max(units, 1), 5);
    return (
        <span className="flex items-center justify-center -space-x-3" aria-hidden="true">
            {Array.from({ length: shown }, (_, i) => (
                <img
                    key={i}
                    src={src}
                    alt=""
                    width={size}
                    height={size}
                    loading="lazy"
                    className="rounded-full border-2 border-surface bg-canvas-alt object-cover shadow-xs"
                    style={{ width: size, height: size, zIndex: shown - i }}
                />
            ))}
            {units > 5 && <span className="z-0 pl-4 text-caption font-semibold text-muted">×{units}</span>}
        </span>
    );
}

/**
 * Pack options as cards in one horizontal row: each shows its bottles, name, price (and member price), what is saved, and a
 * ribbon such as "Super Saver". Swipes sideways on a phone; fills the width on a wide screen.
 */
export default function VariantPicker({ variants, activeId, onChange, productImage, isMember = false }) {
    const rowRef = useRef(null);
    const first = useRef(true);
    // On a phone, bring the chosen pack to the middle of the row (sideways only, the page never jumps). Not on first paint.
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        const row = rowRef.current;
        const card = row?.querySelector('[aria-pressed="true"]');
        if (!row || !card || row.scrollWidth <= row.clientWidth) return;
        row.scrollTo({ left: card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
    }, [activeId]);

    return (
        <fieldset className="min-w-0">
            <legend className="mb-3 text-small font-semibold text-ink">Choose your pack</legend>
            <div ref={rowRef} className={cn('relative flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 overscroll-x-contain pb-1 scrollbar-none max-sm:-mx-4 max-sm:px-4 sm:grid sm:overflow-visible sm:pb-0', variants.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
                {variants.map((v) => {
                    const active = v.id === activeId;
                    const soldOut = v.stock <= 0;
                    const perDay = estimateDailyCost(v.label, v.price);
                    const units = Math.max(1, v.units || 1);
                    const photo = imageUrl(v.image || productImage, 160);
                    const member = Boolean(isMember && v.memberPrice && v.memberPrice < v.price);
                    const shownPrice = member ? v.memberPrice : v.price;
                    const savings = Math.max(0, Math.max(v.originalPrice || 0, v.price) - shownPrice);
                    const eachPrice = units > 1 ? shownPrice / units : 0;
                    return (
                        <button
                            key={v.id}
                            type="button"
                            disabled={soldOut}
                            onClick={() => onChange(v.id)}
                            aria-pressed={active}
                            className={cn(
                                'relative flex w-[44%] min-w-[9.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-lg border-2 bg-surface text-left transition-colors sm:w-auto sm:min-w-0 sm:shrink',
                                active ? 'border-primary bg-primary-soft shadow-sm' : 'border-line hover:border-primary/50',
                                soldOut && 'cursor-not-allowed opacity-50',
                            )}
                        >
                            <span className="flex flex-col items-center gap-2 px-3 pb-2.5 pt-3 sm:pt-4">
                                <Bottles units={units} src={photo} size={units > 3 ? 44 : 52} />
                                <span className="min-w-0 text-center">
                                    <span className={cn('block text-small font-semibold', active ? 'text-primary' : 'text-ink')}>{v.label}</span>
                                    {v.netQuantity && <span className="block text-caption text-muted">{v.netQuantity}</span>}
                                </span>
                            </span>
                            <span className="mt-auto flex flex-col items-center gap-0.5 border-t border-line px-3 py-2.5">
                                <span className="flex flex-wrap items-baseline justify-center gap-x-1.5">
                                    <span className={cn('inline-flex items-center gap-1 font-display text-h4', member && 'text-primary')}>{member && <Crown size={13} aria-label="Chikit Club price" />}{formatPrice(shownPrice)}</span>
                                    {member && <span className="text-caption text-muted line-through">{formatPrice(v.price)}</span>}
                                    {v.originalPrice > Math.max(v.price, shownPrice) && <span className="text-caption text-subtle line-through">{formatPrice(v.originalPrice)}</span>}
                                </span>
                                <span className="flex flex-col items-center gap-0.5 text-center">
                                    {eachPrice > 0 && !soldOut && <span className="text-caption text-muted">{formatPrice(eachPrice)} each</span>}
                                    {!eachPrice && perDay && !soldOut && <span className="text-caption text-muted">≈ {formatPrice(perDay)}/day</span>}
                                    {savings > 0 && !soldOut && <span className="text-caption font-semibold text-success">Save {formatPrice(savings)}</span>}
                                    {!isMember && v.memberPrice && !soldOut && <span className="mt-0.5 flex flex-col items-center text-center text-caption font-medium leading-tight text-accent-ink"><span className="inline-flex items-center gap-1 font-semibold"><Crown size={11} aria-hidden="true" /> {formatPrice(v.memberPrice)}</span><span>Chikit Club price</span></span>}
                                    {soldOut && <span className="text-caption font-medium text-danger">Out of stock</span>}
                                </span>
                            </span>
                            {v.tag && !soldOut && (
                                <span className={cn('block px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide', active ? 'bg-primary text-white' : 'bg-accent-tint text-accent-ink')}>{v.tag}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
