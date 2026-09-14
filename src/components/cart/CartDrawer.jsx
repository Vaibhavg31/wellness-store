import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Minus, Plus, ShoppingBag, Sparkles, Trash2, Truck, X } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import Button from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/utils/formatPrice';
import { api, imageUrl } from '@/services/api';
import { loginUrl } from '@/utils/authRedirect';

/**
 * Best admin-manageable offer to dangle in the drawer when nothing's
 * applied yet — reuses the exact same coupons an admin already manages in
 * Admin -> Coupons (code-entry ones only; auto-apply offers announce
 * themselves once eligible, they don't need a banner asking to "apply" a
 * code that isn't one). One confident nudge, not a coupon wall:
 *   - if the cart already clears a coupon's minimum, offer the
 *     highest-value one that's usable right now ("Apply" is a real click);
 *   - otherwise offer whichever one is *closest* to unlocking, framed the
 *     same way as the free-delivery bar ("add ₹X more") so the two nudges
 *     read as one consistent pattern instead of two different UI ideas.
 */
function pickBestOffer(coupons, subtotal) {
    if (!coupons.length) return null;
    const usable = coupons.filter((c) => subtotal >= (c.minOrderAmount || 0));
    if (usable.length > 0) {
        return { offer: usable.sort((a, b) => (b.value || 0) - (a.value || 0))[0], qualifies: true };
    }
    const closest = [...coupons].sort((a, b) => (a.minOrderAmount || 0) - (b.minOrderAmount || 0))[0];
    return { offer: closest, qualifies: false };
}

/**
 * The mini-cart: opened from the navbar's bag icon instead of navigating
 * straight to /cart, so adding to or adjusting the bag never costs the
 * shopper their place on the page they were browsing. Deliberately does NOT
 * auto-open on every "Add to Cart" — research on this pattern is mixed on
 * mobile (a heavy auto-opening drawer can hurt conversion there), and the
 * existing toast (see ToastContext.showCartToast) already confirms the add;
 * this drawer is for "let me look at my bag without leaving," reachable any
 * time via the cart icon.
 */
export default function CartDrawer() {
    const {
        items,
        isDrawerOpen,
        closeCartDrawer,
        updateQuantity,
        removeFromCart,
        itemCount,
        subtotal,
        showFreeDeliveryUpsell,
        amountUntilFreeDelivery,
        freeDeliveryProgress,
        couponCode,
        couponDetails,
        autoAppliedCoupon,
        applyCoupon,
        removeCoupon,
    } = useCart();
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();

    // Public, code-entry offers only — the same list Admin -> Coupons ->
    // "Show on website" already manages, so a new coupon shows up here (or
    // stops) the moment an admin toggles it, with no extra wiring anywhere.
    const [publicOffers, setPublicOffers] = useState([]);
    const [applyingCode, setApplyingCode] = useState(false);

    useEffect(() => {
        if (!isDrawerOpen) return;
        api.get('/api/coupons/public').then(setPublicOffers).catch(() => setPublicOffers([]));
    }, [isDrawerOpen]);

    const best = !couponCode ? pickBestOffer(publicOffers, subtotal) : null;

    const handleQuickApply = async (code) => {
        setApplyingCode(true);
        const result = await applyCoupon(code);
        showToast(result.message || (result.valid ? 'Coupon applied' : 'Could not apply coupon'), result.valid ? 'success' : 'error');
        setApplyingCode(false);
    };

    return (
        <Drawer
            isOpen={isDrawerOpen}
            onClose={closeCartDrawer}
            title="Your Bag"
            subtitle={itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : undefined}
        >
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16">
                    <ShoppingBag size={32} className="text-forest/25 mb-4" />
                    <p className="text-ink font-medium mb-1">Your bag is empty</p>
                    <p className="text-sm text-slate mb-6">Add something wellness-worthy to get started.</p>
                    <Link to="/shop" onClick={closeCartDrawer}>
                        <Button variant="turmeric">Browse Products</Button>
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    <div className="flex-1 -mx-1 px-1 space-y-4">
                        <AnimatePresence initial={false}>
                            {items.map((item) => {
                                const key = `${item.product.id}-${item.product.variantId || ''}-${item.product.bundleId || ''}`;
                                return (
                                    <motion.div
                                        key={key}
                                        layout
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="flex gap-3 pb-4 border-b border-border/40 last:border-0"
                                    >
                                        <img
                                            src={imageUrl(item.product.images?.[0])}
                                            alt=""
                                            className="w-16 h-16 rounded-xl object-cover bg-sand flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-ink font-medium line-clamp-2">{item.product.title}</p>
                                            {item.product.bundleTitle && (
                                                <p className="text-[11px] text-turmeric-ink mt-0.5">Part of {item.product.bundleTitle}</p>
                                            )}
                                            <div className="flex items-center justify-between mt-2">
                                                {item.product.bundleId ? (
                                                    <span className="text-xs text-slate">Qty {item.quantity}</span>
                                                ) : (
                                                    <div className="flex items-center gap-2 border border-border rounded-full px-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, { variantId: item.product.variantId })}
                                                            className="p-1 text-slate hover:text-ink"
                                                            aria-label="Decrease quantity"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="text-xs w-4 text-center font-medium">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, { variantId: item.product.variantId })}
                                                            className="p-1 text-slate hover:text-ink"
                                                            aria-label="Increase quantity"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-ink">{formatPrice(item.product.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                        {!item.product.bundleId && (
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.product.id, { variantId: item.product.variantId })}
                                                className="self-start p-1.5 text-slate/60 hover:text-red-500 transition-colors flex-shrink-0"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    <div className="flex-shrink-0 pt-4 mt-2 border-t border-border/60 space-y-4">
                        {couponCode ? (
                            <div className="rounded-lg bg-emerald/10 border border-emerald/25 px-3 py-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <BadgeCheck size={15} className="text-emerald flex-shrink-0" />
                                    <span className="text-xs text-ink min-w-0 truncate">
                                        <span className="font-mono font-semibold tracking-wide">{couponCode}</span> applied
                                        {couponDetails?.label ? ` — ${couponDetails.label}` : ''}
                                        {autoAppliedCoupon && <span className="text-slate"> · auto</span>}
                                    </span>
                                </div>
                                {!autoAppliedCoupon && (
                                    <button
                                        type="button"
                                        onClick={removeCoupon}
                                        className="p-1 text-slate/60 hover:text-red-500 transition-colors flex-shrink-0"
                                        aria-label="Remove coupon"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        ) : best?.offer && (
                            <div className="rounded-lg bg-turmeric/10 border border-turmeric/25 px-3 py-2.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Sparkles size={14} className="text-turmeric-ink flex-shrink-0" />
                                    <span className="text-xs text-ink min-w-0">
                                        {best.qualifies ? (
                                            <>Use <span className="font-mono font-semibold">{best.offer.code}</span> for {best.offer.label.toLowerCase()}</>
                                        ) : (
                                            <>Add <span className="font-medium">{formatPrice(best.offer.minOrderAmount - subtotal)}</span> more to unlock <span className="font-mono font-semibold">{best.offer.code}</span></>
                                        )}
                                    </span>
                                </div>
                                {best.qualifies && (
                                    <button
                                        type="button"
                                        onClick={() => handleQuickApply(best.offer.code)}
                                        disabled={applyingCode}
                                        className="text-[11px] font-semibold text-turmeric-ink border border-turmeric-ink/30 rounded-full px-2.5 py-1 hover:bg-turmeric-ink/10 disabled:opacity-40 flex-shrink-0 transition-colors"
                                    >
                                        {applyingCode ? '…' : 'Apply'}
                                    </button>
                                )}
                            </div>
                        )}

                        {showFreeDeliveryUpsell && (
                            <div className="rounded-lg bg-sand/60 border border-border/40 px-3 py-2.5 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-ink">
                                    <Truck size={12} className="text-turmeric-ink flex-shrink-0" />
                                    <span>Add <span className="font-medium">{formatPrice(amountUntilFreeDelivery)}</span> more for free delivery</span>
                                </div>
                                <div className="h-1 rounded-full bg-border/60 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-turmeric/70 to-turmeric transition-all duration-500"
                                        style={{ width: `${freeDeliveryProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate">Subtotal</span>
                            <span className="font-display text-lg text-ink">{formatPrice(subtotal)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Link to="/cart" onClick={closeCartDrawer}>
                                <Button variant="outline" className="w-full">View Bag</Button>
                            </Link>
                            <Link to={isAuthenticated ? '/checkout' : loginUrl('/checkout')} onClick={closeCartDrawer}>
                                <Button variant="turmeric" className="w-full">Checkout</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
