import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Crown, Plus, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import Price from '@/components/ui/Price';
import { imageUrl } from '@/services/api';
import { mixBoxPricing } from '@/utils/pricing';
import { formatPrice, cn } from '@/utils/formatPrice';

/** One product that can go into the box (once): its picture, its price and an add / remove button. */
function PickTile({ product, picked, full, onToggle, isMember }) {
    const soldOut = typeof product.stock === 'number' && product.stock <= 0;
    const blocked = soldOut || (!picked && full);
    return (
        <article className={cn('relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface transition-[box-shadow,border-color] duration-200', picked ? 'border-primary shadow-md ring-2 ring-primary' : 'border-line hover:shadow-md', blocked && !picked && 'opacity-60')}>
            <div className="relative aspect-[4/5] bg-canvas-alt">
                <img src={imageUrl(product.images?.[0], 480)} alt="" width="480" height="600" loading="lazy" className="size-full object-contain mix-blend-multiply" />
                {picked && <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-primary text-accent shadow-md"><Check size={16} strokeWidth={3} aria-hidden="true" /></span>}
                {soldOut && <span className="absolute inset-x-3 bottom-3 rounded-full bg-surface/95 py-1.5 text-center text-caption font-semibold text-ink">Sold out</span>}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                <h3 className="line-clamp-2 font-sans text-small font-medium leading-snug">{product.title}</h3>
                <Price price={product.price} originalPrice={product.originalPrice} className="mt-auto" />
                <button
                    type="button"
                    disabled={blocked}
                    onClick={() => onToggle(product)}
                    aria-pressed={picked}
                    className={cn(
                        'inline-flex h-11 items-center justify-center gap-1.5 rounded-full border text-small font-semibold transition-colors',
                        picked ? 'border-primary bg-primary text-white hover:bg-primary-hover' : 'border-primary text-primary hover:bg-primary-soft',
                        'disabled:border-line disabled:bg-disabled disabled:text-subtle',
                    )}
                >
                    {picked ? <><Check size={15} aria-hidden="true" /> In your box</> : full && !soldOut ? 'Box is full' : <><Plus size={15} aria-hidden="true" /> Add to box</>}
                </button>
                {isMember && product.memberPrice > 0 && product.memberPrice < product.price && !picked && (
                    <p className="-mt-0.5 text-center text-caption text-muted">Club price {formatPrice(product.memberPrice)} on its own</p>
                )}
            </div>
        </article>
    );
}

/** A slot in the box: the product in it, or the empty place to fill. */
function Slot({ product, index, onRemove, compact = false }) {
    if (!product) {
        return (
            <li className={cn('flex items-center gap-3 rounded-xl border-2 border-dashed border-line text-muted', compact ? 'size-12 justify-center' : 'p-3')}>
                <span className={cn('grid shrink-0 place-items-center rounded-full bg-canvas-alt font-display text-small font-semibold', compact ? 'size-7' : 'size-9')}>{index + 1}</span>
                {!compact && <span className="text-small">Pick product {index + 1}</span>}
            </li>
        );
    }
    if (compact) {
        return (
            <li>
                <button type="button" onClick={() => onRemove(product)} aria-label={`Remove ${product.title} from the box`} className="relative block size-12 overflow-hidden rounded-xl border-2 border-primary bg-canvas-alt">
                    <img src={imageUrl(product.images?.[0], 120)} alt="" width="48" height="48" className="size-full object-contain mix-blend-multiply" />
                    <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-white"><X size={10} aria-hidden="true" /></span>
                </button>
            </li>
        );
    }
    return (
        <li className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
            <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-canvas-alt"><img src={imageUrl(product.images?.[0], 120)} alt="" width="48" height="48" className="size-full object-contain mix-blend-multiply" /></span>
            <span className="min-w-0 flex-1">
                <span className="line-clamp-1 block text-small font-medium text-ink">{product.title}</span>
                <span className="block text-caption text-muted">{formatPrice(product.price)}</span>
            </span>
            <button type="button" onClick={() => onRemove(product)} aria-label={`Remove ${product.title} from the box`} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-tint hover:text-danger"><X size={16} aria-hidden="true" /></button>
        </li>
    );
}

/**
 * "Pick any N for one price", as a short guided flow: choose N products (each once), watch the box fill and the price work itself
 * out, then add the box to the bag. On a computer the box is a panel beside the products; on a phone it is a bar above the tab bar.
 * What the shopper pays is what checkout charges: everyone pays the box price (never more than the products one by one), and a
 * Club member pays whichever is lower for them, the box price or their Club prices (see mixBoxPricing).
 */
export default function MixBox({ offer, products }) {
    const { addMixBox, isMember, openCartDrawer } = useCart();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [picked, setPicked] = useState([]);
    const slots = offer.pickCount;
    const full = picked.length === slots;
    const remaining = slots - picked.length;

    const lists = picked.map((p) => p.price);
    const members = picked.map((p) => p.memberPrice);
    const worth = lists.reduce((sum, p) => sum + p, 0);
    const pricing = useMemo(() => (full ? mixBoxPricing(lists, members, offer.price, isMember) : null), [full, picked, offer.price, isMember]); // eslint-disable-line react-hooks/exhaustive-deps
    const pay = pricing ? pricing.units.reduce((sum, p) => sum + p, 0) : 0;
    const saving = full ? Math.max(0, worth - pay) : 0;
    // A guest whose Club prices would beat the box is told what joining would make this box cost.
    const clubOffer = useMemo(() => {
        if (!full || isMember) return null;
        const member = mixBoxPricing(lists, members, offer.price, true);
        return member.byClub ? member.clubTotal : null;
    }, [full, isMember, picked, offer.price]); // eslint-disable-line react-hooks/exhaustive-deps
    const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);

    const toggle = (product) => {
        setPicked((current) => {
            if (current.some((p) => p.id === product.id)) return current.filter((p) => p.id !== product.id);
            if (current.length >= slots) return current;
            return [...current, product];
        });
    };

    const commit = (goToCheckout) => {
        if (!full) return;
        if (addMixBox(offer, picked)) {
            setPicked([]);
            if (goToCheckout) navigate('/checkout');
            else { showToast('Your box is in the bag', 'success'); openCartDrawer(); }
        } else {
            showToast('Could not add this box. Please check the stock and try again.', 'error');
        }
    };

    const message = full
        ? (pricing.byClub ? 'Priced at your Chikit Club prices, which beat the box price.' : saving <= 0 ? `These picks cost less than ${formatPrice(offer.price)}, so you pay their normal prices. Add a pricier pick to save more.` : isMember ? 'The box price is your best price for these picks.' : 'Your box is ready.')
        : `Pick ${remaining} more to unlock ${formatPrice(offer.price)}`;

    const panelBody = (
        <>
            <ul className="space-y-2.5">
                {Array.from({ length: slots }, (_, i) => <Slot key={picked[i]?.id ?? `empty-${i}`} product={picked[i]} index={i} onRemove={toggle} />)}
            </ul>

            <div className="mt-5 space-y-2 border-t border-line pt-4 text-small">
                <p className="flex items-baseline justify-between"><span className="text-muted">{full ? 'Worth, bought one by one' : 'Worth so far'}</span><span className={cn(full && saving > 0 && 'text-muted line-through')}>{formatPrice(worth)}</span></p>
                {full ? (
                    <>
                        <p className="flex items-baseline justify-between"><span className="font-semibold text-ink">{pricing.byClub ? 'Your Club prices' : 'Box price'}</span><span className="font-display text-h3 text-primary">{formatPrice(pay)}</span></p>
                        {saving > 0 && <p className="flex items-baseline justify-between font-semibold text-success"><span>You save</span><span>{formatPrice(saving)}</span></p>}
                    </>
                ) : (
                    <p className="flex items-baseline justify-between"><span className="font-semibold text-ink">Box price</span><span className="font-display text-h3 text-primary">{formatPrice(offer.price)}</span></p>
                )}
            </div>

            <p className={cn('mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-caption leading-snug', full ? 'bg-success-tint text-ink' : 'bg-accent-tint text-ink')}>
                {full ? <Check size={15} className="mt-px shrink-0 text-success" aria-hidden="true" /> : <ArrowRight size={15} className="mt-px shrink-0 text-accent-ink" aria-hidden="true" />}
                <span>{message}</span>
            </p>
            {clubOffer != null && (
                <Link to="/club" className="mt-2 flex items-start gap-2 rounded-xl bg-accent px-3 py-2.5 text-caption leading-snug text-primary-deep hover:bg-accent-hover">
                    <Crown size={15} className="mt-px shrink-0 text-primary" aria-hidden="true" />
                    <span><strong>Join the Club, free, and this box costs {formatPrice(clubOffer)}.</strong> Your Club prices beat the box price on these picks.</span>
                </Link>
            )}

            <div className="mt-4 grid gap-2">
                <button type="button" disabled={!full} onClick={() => commit(false)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-small font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-subtle"><ShoppingBag size={17} aria-hidden="true" /> {full ? `Add box to bag · ${formatPrice(pay)}` : `Pick ${remaining} more`}</button>
                <button type="button" disabled={!full} onClick={() => commit(true)} className="inline-flex h-11 items-center justify-center rounded-full border border-primary text-small font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-line disabled:text-subtle disabled:hover:bg-transparent">Buy now</button>
            </div>
        </>
    );

    return (
        <div className="pb-36 lg:pb-0">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-10">
                <div>
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                        <div>
                            <p className="text-caption font-semibold uppercase tracking-[0.16em] text-accent-ink">Step 1</p>
                            <h2 className="mt-1 text-h3">Choose any {slots} products</h2>
                        </div>
                        <p className="text-small text-muted"><strong className="font-semibold text-ink">{picked.length} of {slots}</strong> picked. Each product once.</p>
                    </div>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {products.map((product) => (
                            <li key={product.id}><PickTile product={product} picked={pickedIds.has(product.id)} full={full} onToggle={toggle} isMember={isMember} /></li>
                        ))}
                    </ul>
                </div>

                <aside className="hidden rounded-2xl border border-line bg-surface p-5 shadow-sm lg:sticky lg:top-28 lg:block xl:p-6" aria-label="Your box">
                    <p className="text-caption font-semibold uppercase tracking-[0.16em] text-accent-ink">Step 2</p>
                    <h2 className="mb-4 mt-1 font-sans text-h4">Your box <span className="text-muted">({picked.length}/{slots})</span></h2>
                    {panelBody}
                </aside>
            </div>

            {/* Phone: a compact bar above the tab bar. */}
            <div className="fixed inset-x-0 bottom-[var(--tabbar-h,0px)] z-40 border-t border-line bg-surface shadow-[0_-12px_32px_rgb(43_15_43/0.14)] lg:hidden" role="region" aria-label="Your box">
                <div className="h-1 bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={slots} aria-valuenow={picked.length} aria-label="Products picked">
                    <div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${(picked.length / slots) * 100}%` }} />
                </div>
                <div className="space-y-2.5 px-4 pb-3 pt-2.5">
                    <div className="flex items-baseline justify-between gap-3 leading-tight">
                        {full ? (
                            <>
                                <p className="text-small font-semibold text-success">{saving > 0 ? `You save ${formatPrice(saving)}` : 'Your box is ready'}</p>
                                <p className="flex items-baseline gap-1.5">{saving > 0 && <span className="text-caption text-muted line-through">{formatPrice(worth)}</span>}<span className="font-display text-h4 text-primary">{formatPrice(pay)}</span></p>
                            </>
                        ) : (
                            <>
                                <p className="text-small font-semibold text-ink">Pick {remaining} more</p>
                                <p className="text-caption text-muted">any {slots} for <strong className="text-ink">{formatPrice(offer.price)}</strong></p>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <ul className="flex shrink-0 items-center gap-1.5">
                            {Array.from({ length: slots }, (_, i) => <Slot key={picked[i]?.id ?? `bar-${i}`} product={picked[i]} index={i} onRemove={toggle} compact />)}
                        </ul>
                        <button type="button" disabled={!full} onClick={() => commit(false)} className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-small font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-subtle"><ShoppingBag size={16} aria-hidden="true" /> Add box to bag</button>
                    </div>
                </div>
                {clubOffer != null && <Link to="/club" className="flex items-center justify-center gap-1.5 bg-accent px-4 py-1.5 text-caption font-semibold text-primary-deep"><Crown size={13} aria-hidden="true" /> Join the Club, free: this box costs {formatPrice(clubOffer)}</Link>}
            </div>
        </div>
    );
}
