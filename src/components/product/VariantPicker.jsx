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
 * Pack options as cards: each shows its bottles, name, price (and member price), what is saved, and a ribbon such as
 * "Super Saver". One column of rows on a phone, three cards across on a wide screen.
 */
export default function VariantPicker({ variants, activeId, onChange, productImage, isMember = false }) {
    return (
        <fieldset>
            <legend className="mb-3 text-small font-semibold text-ink">Choose your pack</legend>
            <div className="grid gap-3 max-sm:gap-2.5 sm:grid-cols-3">
                {variants.map((v) => {
                    const active = v.id === activeId;
                    const soldOut = v.stock <= 0;
                    const savings = v.originalPrice > v.price ? v.originalPrice - v.price : 0;
                    const perDay = estimateDailyCost(v.label, v.price);
                    const units = Math.max(1, v.units || 1);
                    const photo = imageUrl(v.image || productImage, 160);
                    const shownPrice = isMember && v.memberPrice ? v.memberPrice : v.price;
                    const eachPrice = units > 1 ? shownPrice / units : 0;
                    return (
                        <button
                            key={v.id}
                            type="button"
                            disabled={soldOut}
                            onClick={() => onChange(v.id)}
                            aria-pressed={active}
                            className={cn(
                                'relative flex flex-col overflow-hidden rounded-lg border-2 bg-surface text-left transition-colors',
                                active ? 'border-primary bg-primary-soft shadow-sm' : 'border-line hover:border-primary/50',
                                soldOut && 'cursor-not-allowed opacity-50',
                            )}
                        >
                            <span className="flex items-center gap-3 px-3 pb-2.5 pt-3 sm:flex-col sm:gap-2 sm:px-3 sm:pt-4">
                                <Bottles units={units} src={photo} size={units > 3 ? 44 : 52} />
                                <span className="min-w-0 sm:text-center">
                                    <span className={cn('block text-small font-semibold', active ? 'text-primary' : 'text-ink')}>{v.label}</span>
                                    {v.netQuantity && <span className="block text-caption text-muted">{v.netQuantity}</span>}
                                </span>
                            </span>
                            <span className="mt-auto flex items-end justify-between gap-2 border-t border-line px-3 py-2.5 sm:flex-col sm:items-center sm:gap-0.5">
                                <span className="flex flex-wrap items-baseline justify-center gap-x-1.5">
                                    <span className="font-display text-h4">{formatPrice(shownPrice)}</span>
                                    {(isMember && v.memberPrice ? v.price : v.originalPrice) > shownPrice && <span className="text-caption text-muted line-through">{formatPrice(isMember && v.memberPrice ? v.price : v.originalPrice)}</span>}
                                </span>
                                <span className="flex flex-col items-end gap-0.5 sm:items-center">
                                    {eachPrice > 0 && !soldOut && <span className="text-caption text-muted">{formatPrice(eachPrice)} each</span>}
                                    {!eachPrice && perDay && !soldOut && <span className="text-caption text-muted">≈ {formatPrice(perDay)}/day</span>}
                                    {savings > 0 && !soldOut && <span className="text-caption font-semibold text-success">Save {formatPrice(savings)}</span>}
                                    {!isMember && v.memberPrice && !soldOut && <span className="inline-flex items-center gap-1 text-caption font-medium text-accent-ink"><Crown size={11} aria-hidden="true" /> {formatPrice(v.memberPrice)} for members</span>}
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
