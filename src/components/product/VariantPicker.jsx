import { Crown } from 'lucide-react';
import { openClubSheet } from '@/components/commerce/ClubSheet';
import { formatPrice, cn } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';

/** The bottles in a pack: one round photo per unit (up to four), overlapping, so "3 bottles" looks like three. */
function Bottles({ units, src }) {
    const shown = Math.min(Math.max(units, 1), 4);
    return (
        <span className="hidden shrink-0 items-center -space-x-4 sm:flex" aria-hidden="true">
            {Array.from({ length: shown }, (_, i) => (
                <img key={i} src={src} alt="" width="48" height="48" loading="lazy" className="size-12 rounded-full border-2 border-surface bg-accent-tint object-cover shadow-xs" style={{ zIndex: shown - i }} />
            ))}
        </span>
    );
}

/**
 * Pack options as a list of choices (1, 2 or 3 bottles). Each row shows the bottles, the name, a tag such as "Best value", the price
 * the shopper pays (the Club price for a member), what is saved, and, for a guest, what the Club would take off.
 */
export default function VariantPicker({ variants, activeId, onChange, productImage, isMember = false, title }) {
    return (
        <fieldset>
            <legend className="mb-3 text-small font-bold text-ink">Choose your pack</legend>
            <div className="space-y-2.5" role="radiogroup">
                {variants.map((v) => {
                    const active = v.id === activeId;
                    const soldOut = v.stock <= 0;
                    const units = Math.max(1, v.units || 1);
                    const member = isMember && v.memberPrice > 0 && v.memberPrice < v.price;
                    const shown = member ? v.memberPrice : v.price;
                    const mrp = v.originalPrice > shown ? v.originalPrice : 0;
                    const saving = mrp ? mrp - shown : 0;
                    const each = units > 1 ? shown / units : 0;
                    return (
                        <div
                            key={v.id}
                            role="radio"
                            aria-checked={active}
                            aria-disabled={soldOut}
                            tabIndex={soldOut ? -1 : 0}
                            onClick={() => !soldOut && onChange(v.id)}
                            onKeyDown={(e) => { if (!soldOut && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); onChange(v.id); } }}
                            className={cn('relative flex cursor-pointer items-center gap-3.5 rounded-[1.25rem] border-2 bg-surface p-3.5 transition-colors', active ? 'border-primary bg-primary-soft shadow-sm' : 'border-line hover:border-primary/40', soldOut && 'cursor-not-allowed opacity-50')}
                        >
                            <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', active ? 'border-primary' : 'border-line-strong')} aria-hidden="true">{active && <span className="size-2.5 rounded-full bg-primary" />}</span>
                            <Bottles units={units} src={imageUrl(v.image || productImage, 120)} />
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className={cn('text-small font-bold', active ? 'text-primary' : 'text-ink')}>{v.label}</span>
                                    {v.tag && !soldOut && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide', active ? 'bg-primary text-white' : 'bg-accent text-primary-deep')}>{v.tag}</span>}
                                </span>
                                <span className="mt-0.5 block text-caption text-muted">
                                    {v.netQuantity}{each > 0 && !soldOut ? ` · ${formatPrice(each)} each` : ''}
                                </span>
                                {!isMember && v.memberPrice > 0 && v.memberPrice < v.price && !soldOut && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); openClubSheet({ title, price: v.price, memberPrice: v.memberPrice }); }} className="mt-1 inline-flex items-center gap-1 text-caption font-bold text-accent-ink hover:underline">
                                        <Crown size={12} className="text-gold" aria-hidden="true" /> {formatPrice(v.memberPrice)} with Club
                                    </button>
                                )}
                            </span>
                            <span className="shrink-0 text-right">
                                <span className="flex items-center justify-end gap-1">{member && <Crown size={14} className="text-gold" aria-hidden="true" />}<span className={cn('font-display text-h4 leading-none', member && 'text-primary')}>{formatPrice(shown)}</span></span>
                                {mrp > 0 && <span className="mt-0.5 block text-caption text-subtle line-through">{formatPrice(mrp)}</span>}
                                {saving > 0 && !soldOut && <span className="block text-caption font-bold text-success">Save {formatPrice(saving)}</span>}
                                {soldOut && <span className="block text-caption font-bold text-danger">Out of stock</span>}
                            </span>
                        </div>
                    );
                })}
            </div>
        </fieldset>
    );
}
