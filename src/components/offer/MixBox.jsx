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
        <article className={cn('flex flex-col overflow-hidden rounded-lg border bg-surface transition-shadow', picked ? 'border-primary shadow-md ring-2 ring-primary' : 'border-line hover:shadow-md')}>
            <div className="relative aspect-[4/5] bg-canvas-alt">
                <img src={imageUrl(product.images?.[0], 480)} alt="" width="480" height="600" loading="lazy" className="size-full object-contain mix-blend-multiply" />
                {picked && <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-primary text-accent shadow-md"><Check size={16} aria-hidden="true" /></span>}
                {soldOut && <span className="absolute inset-x-3 bottom-3 rounded-full bg-surface/95 py-1.5 text-center text-caption font-semibold text-ink">Sold out</span>}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
                <h3 className="line-clamp-2 font-sans text-small font-medium leading-snug">{product.title}</h3>
                <p className="mt-auto flex items-baseline gap-2">
                    <span className="font-semibold text-ink">{formatPrice(product.price)}</span>
                    {product.originalPrice > product.price && <span className="text-caption text-muted line-through">{formatPrice(product.originalPrice)}</span>}
                </p>
                <button
                    type="button"
                    disabled={blocked}
                    onClick={() => onToggle(product)}
                    aria-pressed={picked}
                    className={cn(
                        'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border text-small font-semibold transition-colors',
                        picked ? 'border-primary bg-primary text-white hover:bg-primary-hover' : 'border-primary text-primary hover:bg-primary-soft',
                        'disabled:border-line disabled:bg-disabled disabled:text-subtle',
                    )}
                >
                    {picked ? <><Check size={15} aria-hidden="true" /> In your box</> : <><Plus size={15} aria-hidden="true" /> Add to box</>}
                </button>
            </div>
        </article>
    );
}

/**
 * "Pick any N for one price": a grid of products and a box bar pinned to the bottom with N slots. A product goes in once;
 * when the box is full it can be added to the bag at the offer price (or bought straight away).
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

    return (
        <div className="pb-40 sm:pb-32">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                {products.map((product) => (
                    <li key={product.id}><PickTile product={product} picked={pickedIds.has(product.id)} full={full} onToggle={toggle} /></li>
                ))}
            </ul>

            <div className="safe-area-pb fixed inset-x-0 bottom-0 z-40 bg-primary-deep text-white shadow-[0_-12px_32px_rgb(43_15_43/0.35)]" role="region" aria-label="Your box">
                <div className="h-1 bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={slots} aria-valuenow={picked.length} aria-label="Products picked">
                    <div className="h-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${(picked.length / slots) * 100}%` }} />
                </div>
                <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-2.5">
                        {Array.from({ length: slots }, (_, i) => {
                            const product = picked[i];
                            return product ? (
                                <button key={product.id} type="button" onClick={() => toggle(product)} aria-label={`Remove ${product.title} from the box`} className="group relative size-12 overflow-hidden rounded-xl border-2 border-accent bg-canvas-alt sm:size-16">
                                    <img src={imageUrl(product.images?.[0], 120)} alt="" width="64" height="64" className="size-full object-contain mix-blend-multiply" />
                                    <span className="absolute inset-0 grid place-items-center bg-primary-night/70 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><X size={16} aria-hidden="true" /></span>
                                </button>
                            ) : (
                                <span key={`empty-${i}`} className="grid size-12 place-items-center rounded-xl border-2 border-dashed border-white/30 font-display text-h4 text-white/50 sm:size-16">{i + 1}</span>
                            );
                        })}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3 sm:flex-none sm:justify-end sm:gap-5">
                        <p className="text-right leading-tight">
                            {full ? (
                                <>
                                    <span className="block text-caption text-white/75">Box total{saving > 0 && <> · <span className="font-semibold text-accent">you save {formatPrice(saving)}</span></>}</span>
                                    <span className="flex items-baseline justify-end gap-2">
                                        {saving > 0 && <span className="text-small text-white/60 line-through">{formatPrice(plain)}</span>}
                                        <span className="font-display text-h3 text-accent">{formatPrice(boxPrice)}</span>
                                    </span>
                                </>
                            ) : (
                                <span className="block text-small font-semibold text-white">Pick {slots - picked.length} more <span className="block text-caption font-normal text-white/70">any {slots} for {formatPrice(offer.price)}</span></span>
                            )}
                        </p>
                        <div className="flex gap-2">
                            <button type="button" disabled={!full} onClick={() => commit(false)} aria-label="Add the box to the bag" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-4 text-small font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/35 disabled:hover:bg-transparent"><ShoppingBag size={17} aria-hidden="true" /><span className="max-sm:hidden">Add to bag</span></button>
                            <button type="button" disabled={!full} onClick={() => commit(true)} className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-small font-semibold text-primary-deep transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35">Buy now</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
