import { Sparkles } from 'lucide-react';
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

export default function VariantPicker({ variants, activeId, onChange }) {
    return (
        <fieldset>
            <legend className="mb-3 text-small font-semibold text-ink">Choose a pack</legend>
            <div className="grid gap-3 sm:grid-cols-3">
                {variants.map((v) => {
                    const active = v.id === activeId;
                    const soldOut = v.stock <= 0;
                    const savings = v.originalPrice > v.price ? v.originalPrice - v.price : 0;
                    const perDay = estimateDailyCost(v.label, v.price);
                    return (
                        <button
                            key={v.id}
                            type="button"
                            disabled={soldOut}
                            onClick={() => onChange(v.id)}
                            aria-pressed={active}
                            className={cn(
                                'relative flex flex-col rounded-lg border-2 p-4 text-left transition-colors',
                                active ? 'border-primary bg-primary-soft' : 'border-line hover:border-primary/50',
                                soldOut && 'cursor-not-allowed opacity-50',
                            )}
                        >
                            {v.isDefault && !soldOut && (
                                <span className="absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                                    <Sparkles size={11} aria-hidden="true" /> Recommended
                                </span>
                            )}
                            <span className="flex items-center gap-2">
                                {v.image && <img src={imageUrl(v.image)} alt="" width="36" height="36" className="size-9 rounded-md border border-line object-cover" />}
                                <span className={cn('text-small font-semibold', active ? 'text-primary' : 'text-ink')}>{v.label}</span>
                            </span>
                            {v.netQuantity && <span className="mt-1 text-caption text-muted">{v.netQuantity}</span>}
                            <span className="mt-3 flex flex-wrap items-baseline gap-x-1.5 border-t border-line pt-3">
                                <span className="font-display text-h4">{formatPrice(v.price)}</span>
                                {v.originalPrice > v.price && <span className="text-caption text-muted line-through">{formatPrice(v.originalPrice)}</span>}
                            </span>
                            {savings > 0 && !soldOut && <span className="mt-1 text-caption font-medium text-success">Save {formatPrice(savings)}</span>}
                            {perDay && !soldOut && <span className="text-caption text-muted">≈ {formatPrice(perDay)}/day</span>}
                            {soldOut && <span className="mt-2 text-caption font-medium text-danger">Out of stock</span>}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
