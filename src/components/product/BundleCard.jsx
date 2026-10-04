import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gift, Plus, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatPrice, cn } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';

/** "Buy these together and save" offer: item thumbnails, combined price vs. separate, one-click add. */
export default function BundleCard({ bundle, compact = false }) {
    const { addBundleToCart, isBundleInCart } = useCart();
    const { showToast } = useToast();
    const [justAdded, setJustAdded] = useState(false);

    const { pricing, items } = bundle;
    const inCart = isBundleInCart(bundle.id) || justAdded;
    const outOfStock = items.some((i) => (i.product.stock ?? 0) < i.quantity);

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
        <div className={cn('flex h-full flex-col rounded-lg border border-line bg-surface', compact ? 'p-4' : 'p-5 sm:p-6')}>
            <div className="mb-3 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-ink"><Gift size={18} aria-hidden="true" /></span>
                <div className="min-w-0">
                    <h3 className="truncate font-sans text-body font-semibold">{bundle.title}</h3>
                    {bundle.subtitle && <p className="truncate text-caption text-muted">{bundle.subtitle}</p>}
                </div>
            </div>

            {bundle.description && <p className="mb-4 line-clamp-2 text-small text-muted">{bundle.description}</p>}

            <ul className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
                {items.map((item, i) => (
                    <li key={item.productId} className="flex shrink-0 items-center gap-2">
                        {i > 0 && <Plus size={14} className="text-subtle" aria-hidden="true" />}
                        <Link to={`/product/${item.productId}`} title={item.product.title} className="block size-16 overflow-hidden rounded-md border border-line bg-canvas-alt">
                            <img src={imageUrl(item.product.image)} alt={item.product.title} width="64" height="64" loading="lazy" className="size-full object-cover" />
                        </Link>
                    </li>
                ))}
            </ul>

            <div className="mt-auto">
                <p className="mb-4 flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-h3 text-ink">{formatPrice(pricing.bundlePrice)}</span>
                    {pricing.discountAmount > 0 && (
                        <>
                            <span className="text-small text-muted line-through">{formatPrice(pricing.subtotal)}</span>
                            <Badge variant="tint">Save {pricing.savingsPercent}%</Badge>
                        </>
                    )}
                </p>
                <Button onClick={handleAdd} disabled={outOfStock || inCart} className="w-full">
                    {inCart ? <><Check size={16} /> In your bag</> : outOfStock ? 'Out of stock' : <><ShoppingBag size={16} /> Add bundle</>}
                </Button>
            </div>
        </div>
    );
}
