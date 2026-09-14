import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, Shield, User, Gift, MapPin, CreditCard, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import Button from '@/components/ui/Button';
import SectionTitle from '@/components/ui/SectionTitle';
import CouponInput from '@/components/checkout/CouponInput';
import ActiveCoupons from '@/components/checkout/ActiveCoupons';
import PriceBreakdown from '@/components/checkout/PriceBreakdown';
import { loginUrl } from '@/utils/authRedirect';

const CHECKOUT_STEPS = [
    { label: 'Bag', icon: ShoppingBag },
    { label: 'Address', icon: MapPin },
    { label: 'Payment', icon: CreditCard },
];

/** Purely visual progress strip — orients the shopper inside the checkout
 * flow instead of dropping them straight into a bare line-item list. */
function CheckoutSteps({ activeIndex = 0 }) {
    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8" aria-hidden="true">
            {CHECKOUT_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i < activeIndex;
                const active = i === activeIndex;
                return (
                    <div key={step.label} className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                            <span
                                className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                                    active
                                        ? 'bg-forest border-forest text-cream'
                                        : done
                                            ? 'bg-forest/10 border-forest/30 text-forest'
                                            : 'bg-cream border-border/60 text-slate/60'
                                }`}
                            >
                                {done ? <Check size={14} /> : <Icon size={14} strokeWidth={1.75} />}
                            </span>
                            <span className={`type-eyebrow-sm hidden sm:inline ${active ? 'text-ink' : 'text-slate/60'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < CHECKOUT_STEPS.length - 1 && (
                            <span className={`w-6 sm:w-10 h-px ${done ? 'bg-forest/40' : 'bg-border'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, removeBundleFromCart, syncPrices } = useCart();
    const { isAuthenticated, user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        syncPrices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRemove = (productId, title, variantId) => {
        removeFromCart(productId, { variantId });
        showToast(`Removed "${title}" from bag`, 'info');
    };

    const handleRemoveBundle = (bundleId, bundleTitle) => {
        removeBundleFromCart(bundleId);
        showToast(`Removed bundle "${bundleTitle}" from bag`, 'info');
    };

    // Bundle lines are shown grouped under one card (added/removed as a
    // unit) instead of mixed in with plain product lines — a bundle is
    // conceptually one thing, not several unrelated cart rows.
    const entries = useMemo(() => {
        const seenBundles = new Set();
        const list = [];
        for (const item of items) {
            const bundleId = item.product.bundleId;
            if (!bundleId) {
                list.push({ type: 'single', item });
                continue;
            }
            if (seenBundles.has(bundleId)) continue;
            seenBundles.add(bundleId);
            list.push({
                type: 'bundle',
                bundleId,
                bundleTitle: item.product.bundleTitle,
                items: items.filter((i) => i.product.bundleId === bundleId),
            });
        }
        return list;
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-sand/60 flex items-center justify-center mx-auto mb-8">
                        <ShoppingBag size={32} className="text-emerald/40" strokeWidth={1} />
                    </div>
                    <h1 className="font-display text-3xl md:text-4xl font-light text-ink mb-4">Your Bag is Empty</h1>
                    <p className="text-slate font-light mb-10 leading-relaxed">
                        Browse freely and add items. No sign-in needed until checkout.
                    </p>
                    <Link to="/shop">
                        <Button variant="turmeric" size="lg">Explore Collection</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 bg-cream min-h-screen pt-2 sm:pt-4">
            <div className="max-w-5xl mx-auto">
                <CheckoutSteps activeIndex={0} />

                <SectionTitle
                    subtitle="Your Selection"
                    title="Shopping Bag"
                    description={`${items.length} ${items.length === 1 ? 'item' : 'items'} · saved on this device`}
                    className="mb-8 md:mb-10"
                />

                {isAuthenticated ? (
                    <div className="mb-6 px-4 py-3.5 rounded-xl bg-turmeric-light/20 border border-turmeric-light/40 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
                            <User size={15} className="text-forest" />
                        </div>
                        <p className="text-sm text-ink">
                            Hello, <span className="font-medium">{user?.name || user?.email}</span> — your bag is ready for checkout.
                        </p>
                    </div>
                ) : (
                    <div className="mb-6 p-4 rounded-xl bg-cream border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm text-ink">
                            Shopping as guest. Sign in only when you&apos;re ready to place your order.
                        </p>
                        <Link to={loginUrl('/checkout')}>
                            <Button variant="outline" size="sm">Sign In</Button>
                        </Link>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 lg:items-start">
                    <div className="lg:col-span-2 space-y-3">
                        <AnimatePresence mode="popLayout" initial={false}>
                        {entries.map((entry) => {
                            if (entry.type === 'bundle') {
                                const bundleTotal = entry.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
                                const bundleOriginal = entry.items.reduce((s, i) => s + i.product.originalPrice * i.quantity, 0);
                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -24, scale: 0.97, transition: { duration: 0.25 } }}
                                        key={`bundle-${entry.bundleId}`}
                                        className="p-4 sm:p-5 bg-cream rounded-xl border border-turmeric/40 soft-shadow"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-turmeric/15 flex items-center justify-center">
                                                    <Gift size={13} className="text-turmeric-ink" />
                                                </span>
                                                <p className="font-display text-base sm:text-lg text-ink truncate">
                                                    Bundle: {entry.bundleTitle}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveBundle(entry.bundleId, entry.bundleTitle)}
                                                className="p-1.5 rounded-lg text-slate hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                                aria-label="Remove bundle"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        <div className="space-y-2.5">
                                            {entry.items.map((item) => (
                                                <Link
                                                    key={item.product.id}
                                                    to={`/product/${item.product.id}`}
                                                    className="flex items-center gap-3 group"
                                                >
                                                    <img
                                                        src={imageUrl(item.product.images[0])}
                                                        alt={item.product.title}
                                                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-ink group-hover:text-emerald transition-colors truncate">
                                                            {item.product.title}
                                                        </p>
                                                        <p className="text-xs text-slate">Qty {item.quantity}</p>
                                                    </div>
                                                    <span className="text-sm text-ink flex-shrink-0">
                                                        {formatPrice(item.product.price * item.quantity)}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                                            <span className="text-xs text-slate">Bundle price</span>
                                            <div className="flex items-baseline gap-2">
                                                {bundleOriginal > bundleTotal && (
                                                    <span className="text-xs text-slate/50 line-through">{formatPrice(bundleOriginal)}</span>
                                                )}
                                                <span className="font-display text-base text-forest">{formatPrice(bundleTotal)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            const { item } = entry;
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -24, scale: 0.97, transition: { duration: 0.25 } }}
                                    key={item.product.variantId ? `${item.product.id}::${item.product.variantId}` : item.product.id}
                                    className="flex gap-4 p-4 sm:p-5 bg-cream rounded-xl border border-border/40 soft-shadow card-lift"
                                >
                                    <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                                        <img
                                            src={imageUrl(item.product.images[0])}
                                            alt={item.product.title}
                                            className="w-20 h-24 sm:w-24 sm:h-28 object-cover rounded-lg"
                                        />
                                    </Link>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <Link to={`/product/${item.product.id}`}>
                                                    <h3 className="font-display text-base sm:text-lg text-ink hover:text-emerald transition-colors line-clamp-2 leading-snug">
                                                        {item.product.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-xs text-slate capitalize mt-1 tracking-wide">
                                                    {item.product.category}
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-1 flex-shrink-0">
                                                <span className="font-display text-base sm:text-lg text-ink whitespace-nowrap">
                                                    {formatPrice(item.product.price * item.quantity)}
                                                </span>
                                                <button
                                                    onClick={() => handleRemove(item.product.id, item.product.title, item.product.variantId)}
                                                    className="p-1.5 rounded-lg text-slate hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    aria-label="Remove item"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center">
                                            <div className="inline-flex items-center rounded-full border border-border/60 bg-cream/50 overflow-hidden">
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1, { variantId: item.product.variantId })}
                                                    className="p-2 hover:bg-sand/60 transition-colors"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <span className="px-3 text-sm font-medium min-w-[2rem] text-center tabular-nums">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1, { variantId: item.product.variantId })}
                                                    disabled={typeof item.product.stock === 'number' && item.quantity >= item.product.stock}
                                                    className="p-2 hover:bg-sand/60 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        </AnimatePresence>
                    </div>

                    <div className="lg:col-span-1 space-y-5">
                        <ActiveCoupons variant="sidebar" />

                        <div className="sticky top-[calc(var(--site-header-h,7rem)+1rem)] z-10 p-5 sm:p-6 bg-cream rounded-xl border border-border/40 soft-shadow space-y-5">
                            <h3 className="font-display text-xl text-ink">Price Details</h3>

                            <CouponInput compact />

                            <PriceBreakdown />

                            <Link to="/checkout">
                                <Button variant="turmeric" size="lg" className="w-full">
                                    Proceed to Checkout
                                </Button>
                            </Link>

                            <div className="flex items-center justify-center gap-2 text-[10px] tracking-wide text-slate">
                                <Shield size={12} className="text-emerald" />
                                Secure checkout · COD available
                            </div>

                            <Link
                                to="/shop"
                                className="block text-center text-sm text-slate hover:text-emerald transition-colors"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
