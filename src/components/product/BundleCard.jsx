import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gift, Plus, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';

/**
 * A "Buy these together and save" offer card. Shows every item in the
 * bundle (as a plus-joined thumbnail row), the combined price vs. what
 * buying separately would cost, and a single one-click "Add Bundle" action —
 * no per-item picking, so it's as fast as a single add-to-cart.
 */
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
        <div className={`rounded-2xl border border-turmeric/30 bg-gradient-to-b from-turmeric/5 to-transparent overflow-hidden ${compact ? '' : 'p-5 sm:p-6'}`}>
            <div className={compact ? 'p-4' : ''}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-turmeric/15 flex items-center justify-center">
                        <Gift size={14} className="text-turmeric-ink" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-display text-base sm:text-lg text-ink truncate">{bundle.title}</p>
                        {bundle.subtitle && <p className="text-xs text-slate truncate">{bundle.subtitle}</p>}
                    </div>
                </div>

                {bundle.description && (
                    <p className="text-sm text-slate font-light leading-relaxed mb-4 line-clamp-2">{bundle.description}</p>
                )}

                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-thin">
                    {items.map((item, i) => (
                        <div key={item.productId} className="flex items-center gap-2 flex-shrink-0">
                            {i > 0 && <Plus size={14} className="text-slate/50 flex-shrink-0" />}
                            <Link
                                to={`/product/${item.productId}`}
                                className="block w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-border/50 bg-white flex-shrink-0"
                                title={item.product.title}
                            >
                                <img src={imageUrl(item.product.image)} alt={item.product.title} className="w-full h-full object-cover" />
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-baseline gap-2 mb-4">
                    <span className="font-display text-xl sm:text-2xl text-forest">{formatPrice(pricing.bundlePrice)}</span>
                    {pricing.discountAmount > 0 && (
                        <>
                            <span className="text-sm text-slate/50 line-through">{formatPrice(pricing.subtotal)}</span>
                            <span className="px-2 py-0.5 rounded-full bg-forest/10 text-forest text-xs font-medium">
                                Save {pricing.savingsPercent}%
                            </span>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={outOfStock || inCart}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-full type-eyebrow-sm font-medium transition-colors disabled:opacity-60 shadow-md ${
                        inCart ? 'bg-emerald text-cream' : 'bg-forest text-cream hover:bg-forest-light'
                    }`}
                >
                    {outOfStock ? (
                        'Bundle Unavailable'
                    ) : inCart ? (
                        <><Check size={14} strokeWidth={2} /> Bundle Added</>
                    ) : (
                        <><ShoppingBag size={14} strokeWidth={1.5} /> Add Bundle to Cart</>
                    )}
                </button>
            </div>
        </div>
    );
}
