import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatPrice, cn } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';

/**
 * "Buy these together and save" kit: the products shown large and side by side on one calm panel, the saving as the
 * single badge, then name, contents, combined price against buying separately, and a one-click add.
 */
export default function BundleCard({ bundle, variant = 'default' }) {
    const { addBundleToCart, isBundleInCart } = useCart();
    const { showToast } = useToast();
    const [justAdded, setJustAdded] = useState(false);

    const { pricing, items } = bundle;
    const inCart = isBundleInCart(bundle.id) || justAdded;
    const outOfStock = items.some((i) => (i.product.stock ?? 0) < i.quantity);
    const saves = pricing.discountAmount > 0;
    const compact = variant === 'compact';
    const feature = variant === 'feature';

    const handleAdd = () => {
        if (outOfStock || inCart) return;
        if (addBundleToCart(bundle)) {
            setJustAdded(true);
            showToast(`Added "${bundle.title}" bundle to your bag`, 'success');
        } else {
            showToast('Could not add this bundle — please check stock', 'error');
        }
    };

    return (
        <article className={cn('flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow duration-300 hover:shadow-md', compact && 'sm:flex-row')}>
            <div className={cn('relative flex min-h-[15rem] items-center bg-canvas px-4 pb-4 pt-12 sm:min-h-[16rem] sm:px-5', feature && 'lg:min-h-[24rem] lg:px-8', compact && 'sm:w-[40%] sm:shrink-0 sm:min-h-0 sm:px-3 sm:pt-10')}>
                {saves && <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-caption font-semibold text-white">Save {pricing.savingsPercent}%</span>}
                {compact ? (
                    <ul className="flex w-full items-center justify-center -space-x-5 py-2">
                        {items.slice(0, 4).map((item) => (
                            <li key={item.productId}>
                                <Link to={`/product/${item.productId}`} title={item.product.title} className="block size-20 overflow-hidden rounded-full bg-canvas-alt ring-4 ring-canvas sm:size-[5.5rem]">
                                    <img src={imageUrl(item.product.image)} alt={item.product.title} width="88" height="88" loading="lazy" className="size-full object-cover" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="flex w-full items-center justify-center gap-1.5">
                        {items.map((item, i) => (
                            <li key={item.productId} className="flex min-w-0 flex-1 items-center gap-1.5">
                                {i > 0 && <span className="-mx-3.5 z-10 grid size-6 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm" aria-hidden="true"><Plus size={14} strokeWidth={2.5} /></span>}
                                <Link to={`/product/${item.productId}`} title={item.product.title} className="block aspect-square min-w-0 flex-1 overflow-hidden rounded-md bg-canvas-alt">
                                    <img src={imageUrl(item.product.image)} alt={item.product.title} width="160" height="160" loading="lazy" className="size-full object-cover transition-transform duration-500 hover:scale-105" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className={cn('flex flex-1 flex-col p-5 sm:p-6', feature && 'lg:p-8')}>
                {bundle.subtitle && <p className="eyebrow mb-2">{bundle.subtitle}</p>}
                <h3 className={feature ? 'text-h3' : 'text-h4'}>{bundle.title}</h3>
                <p className="mt-2 text-small text-muted">
                    {items.map((item) => `${item.quantity > 1 ? `${item.quantity} × ` : ''}${item.product.title}`).join('  ·  ')}
                </p>

                <div className="mt-auto pt-5">
                    <p className="mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="font-display text-h3 text-ink">{formatPrice(pricing.bundlePrice)}</span>
                        {saves && (
                            <>
                                <span className="text-small text-muted line-through">{formatPrice(pricing.subtotal)}</span>
                                <span className="text-small font-semibold text-success">You save {formatPrice(Math.round(pricing.discountAmount))}</span>
                            </>
                        )}
                    </p>
                    <Button onClick={handleAdd} disabled={outOfStock || inCart} className="w-full">
                        {inCart ? <><Check size={16} /> In your bag</> : outOfStock ? 'Out of stock' : <><ShoppingBag size={16} /> Add bundle to bag</>}
                    </Button>
                </div>
            </div>
        </article>
    );
}
