import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ShoppingBag, Sparkles, Trash2, Truck, X } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/utils/formatPrice';
import { api, imageUrl } from '@/services/api';
import { loginUrl } from '@/utils/authRedirect';

/**
 * Best code-entry offer to suggest while nothing is applied: the highest-value
 * coupon the cart already qualifies for, otherwise the one closest to unlocking.
 */
function pickBestOffer(coupons, subtotal) {
    if (!coupons.length) return null;
    const usable = coupons.filter((c) => subtotal >= (c.minOrderAmount || 0));
    if (usable.length > 0) {
        return { offer: [...usable].sort((a, b) => (b.value || 0) - (a.value || 0))[0], qualifies: true };
    }
    const closest = [...coupons].sort((a, b) => (a.minOrderAmount || 0) - (b.minOrderAmount || 0))[0];
    return { offer: closest, qualifies: false };
}

const lineKey = ({ product }) => `${product.id}-${product.variantId || ''}-${product.bundleId || ''}`;

export default function CartDrawer() {
    const {
        items, isDrawerOpen, closeCartDrawer, updateQuantity, removeFromCart, itemCount, subtotal,
        showFreeDeliveryUpsell, amountUntilFreeDelivery, freeDeliveryProgress,
        couponCode, couponDetails, autoAppliedCoupon, applyCoupon, removeCoupon,
    } = useCart();
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const [publicOffers, setPublicOffers] = useState([]);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!isDrawerOpen) return;
        api.get('/api/coupons/public').then(setPublicOffers).catch(() => setPublicOffers([]));
    }, [isDrawerOpen]);

    const best = !couponCode ? pickBestOffer(publicOffers, subtotal) : null;

    const quickApply = async (code) => {
        setApplying(true);
        const result = await applyCoupon(code);
        showToast(result.message || (result.valid ? 'Coupon applied' : 'Could not apply coupon'), result.valid ? 'success' : 'error');
        setApplying(false);
    };

    return (
        <Drawer
            isOpen={isDrawerOpen}
            onClose={closeCartDrawer}
            title="Your bag"
            subtitle={itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : undefined}
        >
            {items.length === 0 ? (
                <EmptyState icon={ShoppingBag} title="Your bag is empty" description="Add something Ayurvedic to get started." actionLabel="Browse products" actionHref="/shop" />
            ) : (
                <div className="flex min-h-full flex-col">
                    <ul className="flex-1 divide-y divide-line">
                        {items.map((item) => (
                            <li key={lineKey(item)} className="flex gap-3 py-4 first:pt-0">
                                <img src={imageUrl(item.product.images?.[0])} alt="" width="64" height="64" className="size-16 shrink-0 rounded-md bg-canvas-alt object-cover" />
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-small font-medium text-ink">{item.product.title}</p>
                                    {item.product.bundleTitle && <p className="mt-0.5 text-caption text-accent-ink">Part of {item.product.bundleTitle}</p>}
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        {item.product.bundleId ? (
                                            <span className="text-caption text-muted">Qty {item.quantity}</span>
                                        ) : (
                                            <QuantityStepper
                                                value={item.quantity}
                                                max={item.product.stock ?? 99}
                                                onChange={(q) => updateQuantity(item.product.id, q, { variantId: item.product.variantId })}
                                                className="scale-90 origin-left"
                                            />
                                        )}
                                        <span className="text-small font-semibold text-ink">{formatPrice(item.product.price * item.quantity)}</span>
                                    </div>
                                </div>
                                {!item.product.bundleId && (
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(item.product.id, { variantId: item.product.variantId })}
                                        className="grid size-9 shrink-0 place-items-center self-start rounded-full text-muted hover:bg-danger-tint hover:text-danger"
                                        aria-label={`Remove ${item.product.title}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4 space-y-4 border-t border-line pt-4">
                        {couponCode ? (
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-success-tint px-3 py-2.5">
                                <span className="flex min-w-0 items-center gap-2 text-caption text-ink">
                                    <BadgeCheck size={16} className="shrink-0 text-success" />
                                    <span className="truncate">
                                        <strong className="font-mono">{couponCode}</strong> applied{couponDetails?.label ? ` — ${couponDetails.label}` : ''}
                                        {autoAppliedCoupon && <span className="text-muted"> · auto</span>}
                                    </span>
                                </span>
                                {!autoAppliedCoupon && (
                                    <button type="button" onClick={removeCoupon} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:text-danger" aria-label="Remove coupon">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ) : best?.offer && (
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-accent-tint px-3 py-2.5">
                                <span className="flex min-w-0 items-center gap-2 text-caption text-ink">
                                    <Sparkles size={16} className="shrink-0 text-accent-ink" />
                                    <span>
                                        {best.qualifies ? (
                                            <>Use <strong className="font-mono">{best.offer.code}</strong> for {best.offer.label.toLowerCase()}</>
                                        ) : (
                                            <>Add <strong>{formatPrice(best.offer.minOrderAmount - subtotal)}</strong> more to unlock <strong className="font-mono">{best.offer.code}</strong></>
                                        )}
                                    </span>
                                </span>
                                {best.qualifies && (
                                    <Button size="sm" variant="outline" onClick={() => quickApply(best.offer.code)} loading={applying} className="shrink-0">Apply</Button>
                                )}
                            </div>
                        )}

                        {showFreeDeliveryUpsell && (
                            <div className="space-y-2 rounded-lg bg-canvas-alt px-3 py-2.5">
                                <p className="flex items-center gap-2 text-caption text-ink">
                                    <Truck size={14} className="shrink-0 text-primary" />
                                    Add <strong>{formatPrice(amountUntilFreeDelivery)}</strong> more for free delivery
                                </p>
                                <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(freeDeliveryProgress)} aria-valuemin={0} aria-valuemax={100}>
                                    <div className="h-full origin-left rounded-full bg-primary transition-transform duration-500" style={{ transform: `scaleX(${freeDeliveryProgress / 100})` }} />
                                </div>
                            </div>
                        )}

                        <p className="flex items-baseline justify-between">
                            <span className="text-small text-muted">Subtotal</span>
                            <span className="font-display text-h4 text-ink">{formatPrice(subtotal)}</span>
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <Link to="/cart" onClick={closeCartDrawer}><Button variant="outline" className="w-full">View bag</Button></Link>
                            <Link to={isAuthenticated ? '/checkout' : loginUrl('/checkout')} onClick={closeCartDrawer}><Button className="w-full">Checkout</Button></Link>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
