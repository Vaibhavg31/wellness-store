import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Shield, User } from 'lucide-react';
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

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, syncPrices } = useCart();
    const { isAuthenticated, user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        syncPrices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRemove = (productId, title) => {
        removeFromCart(productId);
        showToast(`Removed "${title}" from bag`, 'info');
    };

    if (items.length === 0) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-warm-beige/60 flex items-center justify-center mx-auto mb-8">
                        <ShoppingBag size={32} className="text-emerald/40" strokeWidth={1} />
                    </div>
                    <h1 className="font-serif text-3xl md:text-4xl font-light text-charcoal mb-4">Your Bag is Empty</h1>
                    <p className="text-soft-brown font-light mb-10 leading-relaxed">
                        Browse freely and add items. No sign-in needed until checkout.
                    </p>
                    <Link to="/shop">
                        <Button variant="gold" size="lg">Explore Collection</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 bg-cream min-h-screen pt-2 sm:pt-4">
            <div className="max-w-5xl mx-auto">
                <SectionTitle
                    subtitle="Your Selection"
                    title="Shopping Bag"
                    description={`${items.length} ${items.length === 1 ? 'item' : 'items'} · saved on this device`}
                    className="mb-8 md:mb-10"
                />

                {isAuthenticated ? (
                    <div className="mb-6 px-4 py-3.5 rounded-xl bg-blush/20 border border-blush/40 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-wine/10 flex items-center justify-center flex-shrink-0">
                            <User size={15} className="text-wine" />
                        </div>
                        <p className="text-sm text-charcoal">
                            Hello, <span className="font-medium">{user?.name || user?.email}</span> — your bag is ready for checkout.
                        </p>
                    </div>
                ) : (
                    <div className="mb-6 p-4 rounded-xl bg-ivory border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm text-charcoal">
                            Shopping as guest. Sign in only when you&apos;re ready to place your order.
                        </p>
                        <Link to={loginUrl('/checkout')}>
                            <Button variant="outline" size="sm">Sign In</Button>
                        </Link>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 lg:items-start">
                    <div className="lg:col-span-2 space-y-3">
                        {items.map((item) => (
                            <div
                                key={item.product.id}
                                className="flex gap-4 p-4 sm:p-5 bg-ivory rounded-xl border border-border/40 luxury-shadow"
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
                                                <h3 className="font-serif text-base sm:text-lg text-charcoal hover:text-emerald transition-colors line-clamp-2 leading-snug">
                                                    {item.product.title}
                                                </h3>
                                            </Link>
                                            <p className="text-xs text-soft-brown capitalize mt-1 tracking-wide">
                                                {item.product.category}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-1 flex-shrink-0">
                                            <span className="font-serif text-base sm:text-lg text-charcoal whitespace-nowrap">
                                                {formatPrice(item.product.price * item.quantity)}
                                            </span>
                                            <button
                                                onClick={() => handleRemove(item.product.id, item.product.title)}
                                                className="p-1.5 rounded-lg text-soft-brown hover:text-red-500 hover:bg-red-50 transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center">
                                        <div className="inline-flex items-center rounded-full border border-border/60 bg-cream/50 overflow-hidden">
                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                className="p-2 hover:bg-warm-beige/60 transition-colors"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus size={13} />
                                            </button>
                                            <span className="px-3 text-sm font-medium min-w-[2rem] text-center tabular-nums">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                disabled={typeof item.product.stock === 'number' && item.quantity >= item.product.stock}
                                                className="p-2 hover:bg-warm-beige/60 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-1 space-y-5">
                        <ActiveCoupons variant="sidebar" />

                        <div className="sticky top-[calc(var(--site-header-h,7rem)+1rem)] z-10 p-5 sm:p-6 bg-ivory rounded-xl border border-border/40 luxury-shadow space-y-5">
                            <h3 className="font-serif text-xl text-charcoal">Price Details</h3>

                            <CouponInput compact />

                            <PriceBreakdown />

                            <Link to="/checkout">
                                <Button variant="gold" size="lg" className="w-full">
                                    Proceed to Checkout
                                </Button>
                            </Link>

                            <div className="flex items-center justify-center gap-2 text-[10px] tracking-wide text-soft-brown">
                                <Shield size={12} className="text-emerald" />
                                Secure checkout · COD available
                            </div>

                            <Link
                                to="/shop"
                                className="block text-center text-sm text-soft-brown hover:text-emerald transition-colors"
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
