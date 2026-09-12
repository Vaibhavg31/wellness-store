import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LogOut, Package, ShoppingBag, Heart, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import UserAvatar from '@/components/ui/UserAvatar';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderJourney from '@/components/orders/OrderJourney';
import SavedAddresses from '@/components/account/SavedAddresses';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import { loginUrl } from '@/utils/authRedirect';
import { formatOrderDate, isTerminalStatus, shortOrderId } from '@/constants/orders';

export default function AccountPage() {
    const { user, token, isAuthenticated } = useAuth();
    const { signOut, isSigningOut } = useCustomerSession();
    const { itemCount: cartCount } = useCart();
    const { itemCount: wishlistCount } = useWishlist();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            setLoading(false);
            return;
        }
        api.get('/api/orders', token)
            .then(setOrders)
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [isAuthenticated, token]);

    const recentOrders = orders.slice(0, 2);
    const activeOrders = orders.filter((o) => !isTerminalStatus(o.status));

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
                <UserIcon size={40} className="text-wine/30 mb-4" />
                <h1 className="font-serif text-3xl mb-3">Your Account</h1>
                <p className="text-soft-brown mb-6 max-w-sm">
                    Sign in to view orders. You can browse, add to cart & wishlist without signing in.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link to={loginUrl('/account')}><Button variant="gold">Sign In</Button></Link>
                    <Link to="/shop"><Button variant="outline">Continue Shopping</Button></Link>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-cream pt-2 sm:pt-4">
            <div className="max-w-4xl mx-auto">
                <EmailVerificationBanner className="mb-6" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <UserAvatar user={user} size="lg" signedIn className="border-2 border-gold/30" />
                        <div>
                            <h1 className="font-serif text-2xl md:text-3xl text-charcoal">
                                Hello, {user?.name || user?.email?.split('@')[0] || 'there'}
                            </h1>
                            <p className="text-sm text-soft-brown">{user?.email}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={signOut} disabled={isSigningOut} className="gap-2 self-start">
                        <LogOut size={16} />
                        {isSigningOut ? 'Signing out…' : 'Sign Out'}
                    </Button>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mb-10">
                    <Link to="/cart" className="flex items-center gap-4 p-5 bg-ivory rounded-xl border border-border/40 hover:border-wine/20 transition-colors">
                        <ShoppingBag size={22} className="text-wine" />
                        <div>
                            <p className="font-medium text-charcoal">My Bag</p>
                            <p className="text-xs text-soft-brown">{cartCount} items saved</p>
                        </div>
                    </Link>
                    <Link to="/wishlist" className="flex items-center gap-4 p-5 bg-ivory rounded-xl border border-border/40 hover:border-wine/20 transition-colors">
                        <Heart size={22} className="text-wine" />
                        <div>
                            <p className="font-medium text-charcoal">My Wishlist</p>
                            <p className="text-xs text-soft-brown">{wishlistCount} saved items</p>
                        </div>
                    </Link>
                    <Link to="/orders" className="flex items-center gap-4 p-5 bg-ivory rounded-xl border border-border/40 hover:border-wine/20 transition-colors">
                        <Package size={22} className="text-wine" />
                        <div>
                            <p className="font-medium text-charcoal">My Orders</p>
                            <p className="text-xs text-soft-brown">
                                {activeOrders.length > 0
                                    ? `${activeOrders.length} in progress`
                                    : `${orders.length} total`}
                            </p>
                        </div>
                    </Link>
                </div>

                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Package size={20} className="text-wine" />
                            <h2 className="font-serif text-xl text-charcoal">Recent Orders</h2>
                        </div>
                        {orders.length > 0 && (
                            <Link to="/orders" className="text-sm text-wine hover:text-wine-light inline-flex items-center gap-1">
                                View all <ChevronRight size={16} />
                            </Link>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-2 border-wine/30 border-t-wine rounded-full animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-ivory rounded-2xl p-10 text-center border border-border/40">
                            <Package size={32} className="text-wine/20 mx-auto mb-4" />
                            <p className="text-charcoal font-medium mb-2">No orders yet</p>
                            <p className="text-soft-brown text-sm mb-6">When you place an order, track its journey here.</p>
                            <Link to="/shop"><Button variant="gold">Start Shopping</Button></Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/orders/${order.id}`}
                                    className="block bg-ivory rounded-2xl p-5 border border-border/40 hover:border-wine/20 transition-colors group"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                        <div>
                                            <p className="font-mono text-sm text-charcoal">{shortOrderId(order.id)}</p>
                                            <p className="text-xs text-soft-brown">{formatOrderDate(order.createdAt)}</p>
                                        </div>
                                        <OrderStatusBadge status={order.status} audience="user" />
                                    </div>
                                    {!isTerminalStatus(order.status) && (
                                        <div className="mb-3">
                                            <OrderJourney order={order} variant="compact" />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                                        <p className="font-serif text-lg text-charcoal">{formatPrice(order.total)}</p>
                                        <span className="text-sm text-wine inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Details <ChevronRight size={14} />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <SavedAddresses />
            </div>
        </div>
    );
}
