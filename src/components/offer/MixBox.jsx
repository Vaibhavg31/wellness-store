import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { imageUrl } from '@/services/api';
import { mixTotal } from '@/utils/pricing';
import { formatPrice, cn } from '@/utils/formatPrice';

/** One product that can be dropped into the box (once). */
function PickTile({ product, picked, full, onToggle }) {
    const soldOut = typeof product.stock === 'number' && product.stock <= 0;
    const blocked = soldOut || (!picked && full);
    return (
        <article className={cn('flex flex-col overflow-hidden rounded-[1.5rem] bg-surface transition-all duration-200', picked ? 'shadow-md ring-2 ring-primary' : 'ring-1 ring-line hover:shadow-md')}>
            <div className="relative aspect-[4/5] bg-accent-tint">
                <img src={imageUrl(product.images?.[0], 480)} alt="" width="480" height="600" loading="lazy" className="size-full object-contain mix-blend-multiply" />
                {picked && <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-primary text-accent shadow-md"><Check size={16} aria-hidden="true" /></span>}
                {soldOut && <span className="absolute inset-x-3 bottom-3 rounded-full bg-surface/95 py-1.5 text-center text-caption font-bold text-ink">Sold out</span>}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3.5">
                <h3 className="line-clamp-2 font-sans text-small font-semibold leading-snug">{product.title}</h3>
                <p className="mt-auto flex items-baseline gap-2">
                    <span className="font-bold text-ink">{formatPrice(product.price)}</span>
                    {product.originalPrice > product.price && <span className="text-caption text-subtle line-through">{formatPrice(product.originalPrice)}</span>}
                </p>
                <button
                    type="button"
                    disabled={blocked}
                    onClick={() => onToggle(product)}
                    aria-pressed={picked}
                    className={cn('inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-small font-bold transition-colors', picked ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-accent text-primary-deep hover:bg-accent-hover', 'disabled:bg-disabled disabled:text-subtle')}
                >
                    {picked ? <><Check size={15} aria-hidden="true" /> In your box</> : <><Plus size={15} aria-hidden="true" /> Add to box</>}
                </button>
            </div>
        </article>
    );
}

/**
 * "Pick any N for one price": a grid of products with the box beside it (a sticky panel on a desktop, a compact bar on a phone). A
 * product goes in once; when the box is full it can be added to the bag at the offer price, or bought straight away.
 */
export default function MixBox({ offer, products }) {
    const { addMixBox } = useCart();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [picked, setPicked] = useState([]);
    const slots = offer.pickCount;
    const full = picked.length === slots;

    const listPrices = picked.map((p) => p.price);
    const plain = listPrices.reduce((sum, p) => sum + p, 0);
    const boxPrice = full ? mixTotal(listPrices, offer.price) : 0;
    const saving = full ? Math.max(0, plain - boxPrice) : 0;
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
            showToast(goToCheckout ? 'Box added. Proceeding to checkout' : `Your box is in the bag at ${formatPrice(boxPrice)}`, 'success');
            if (goToCheckout) navigate('/checkout');
        } else {
            showToast('Could not add this box. Please check the stock and try again.', 'error');
        }
    };

    const actions = (
        <div className="flex gap-2">
            <button type="button" disabled={!full} onClick={() => commit(false)} aria-label="Add the box to the bag" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary px-4 text-small font-bold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-line disabled:text-subtle disabled:hover:bg-transparent"><ShoppingBag size={17} aria-hidden="true" /> Add to bag</button>
            <button type="button" disabled={!full} onClick={() => commit(true)} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-6 text-small font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-subtle">Buy now</button>
        </div>
    );

    const totals = full ? (
        <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-small text-muted">Box total{saving > 0 && <> · <span className="font-bold text-success">you save {formatPrice(saving)}</span></>}</span>
            <span className="flex items-baseline gap-2">{saving > 0 && <span className="text-small text-subtle line-through">{formatPrice(plain)}</span>}<span className="font-display text-h3 leading-none text-primary">{formatPrice(boxPrice)}</span></span>
        </p>
    ) : (
        <p className="text-small text-muted"><strong className="text-ink">Pick {slots - picked.length} more</strong> to get any {slots} for {formatPrice(offer.price)}</p>
    );

    return (
        <div className="grid gap-8 pb-32 lg:grid-cols-[1fr_22rem] lg:items-start lg:pb-0 xl:grid-cols-[1fr_24rem]">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5">
                {products.map((product) => <li key={product.id}><PickTile product={product} picked={pickedIds.has(product.id)} full={full} onToggle={toggle} /></li>)}
            </ul>

            {/* Desktop: the box sits beside the products and stays in view while scrolling. */}
            <aside className="hidden rounded-[1.75rem] bg-surface p-6 shadow-md ring-1 ring-line lg:sticky lg:top-28 lg:block" aria-label="Your box">
                <div className="flex items-center justify-between">
                    <h2 className="font-sans text-h4 font-bold">Your box</h2>
                    <span className="rounded-full bg-accent px-3 py-1 text-caption font-bold text-primary-deep">{picked.length} of {slots}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas-alt" role="progressbar" aria-valuemin={0} aria-valuemax={slots} aria-valuenow={picked.length}><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(picked.length / slots) * 100}%` }} /></div>
                <ul className="mt-5 space-y-3">
                    {Array.from({ length: slots }, (_, i) => {
                        const p = picked[i];
                        return p ? (
                            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-accent-tint p-2.5">
                                <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface"><img src={imageUrl(p.images?.[0], 120)} alt="" width="56" height="56" className="size-full object-contain mix-blend-multiply" /></span>
                                <span className="min-w-0 flex-1"><span className="block truncate text-small font-semibold">{p.title}</span><span className="block text-caption text-muted">{formatPrice(p.price)}</span></span>
                                <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.title} from the box`} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-primary"><X size={16} aria-hidden="true" /></button>
                            </li>
                        ) : (
                            <li key={`empty-${i}`} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-line p-2.5 text-small text-subtle"><span className="grid size-14 place-items-center rounded-xl bg-canvas-alt font-display text-h4">{i + 1}</span> Choose a product</li>
                        );
                    })}
                </ul>
                <div className="mt-5 border-t border-line pt-4">{totals}</div>
                <div className="mt-4">{actions}</div>
            </aside>

            {/* Phone: a compact bar pinned to the bottom. */}
            <div className="safe-area-pb fixed inset-x-0 bottom-0 z-40 bg-primary-deep text-white shadow-[0_-12px_32px_rgb(36_10_38/0.35)] lg:hidden" role="region" aria-label="Your box">
                <div className="h-1 bg-white/15"><div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(picked.length / slots) * 100}%` }} /></div>
                <div className="space-y-3 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {Array.from({ length: slots }, (_, i) => {
                                const p = picked[i];
                                return p ? (
                                    <button key={p.id} type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.title} from the box`} className="relative size-11 overflow-hidden rounded-xl border-2 border-accent bg-accent-tint"><img src={imageUrl(p.images?.[0], 100)} alt="" width="44" height="44" className="size-full object-contain mix-blend-multiply" /></button>
                                ) : <span key={`e-${i}`} className="grid size-11 place-items-center rounded-xl border-2 border-dashed border-white/30 font-display text-white/50">{i + 1}</span>;
                            })}
                        </div>
                        <p className="text-right text-small leading-tight">
                            {full ? <><span className="block text-caption text-white/70">Box total</span><span className="font-display text-h4 text-accent">{formatPrice(boxPrice)}</span></> : <><span className="block font-bold">Pick {slots - picked.length} more</span><span className="block text-caption text-white/70">any {slots} for {formatPrice(offer.price)}</span></>}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" disabled={!full} onClick={() => commit(false)} aria-label="Add the box to the bag" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/40 text-small font-bold text-white disabled:border-white/15 disabled:text-white/35"><ShoppingBag size={17} aria-hidden="true" /> Add to bag</button>
                        <button type="button" disabled={!full} onClick={() => commit(true)} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-accent text-small font-bold text-primary-deep disabled:bg-white/15 disabled:text-white/35">Buy now</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
