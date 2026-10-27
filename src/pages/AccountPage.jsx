import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Heart, LogOut, Package, ShoppingBag, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import UserAvatar from '@/components/ui/UserAvatar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import SignInPrompt from '@/components/auth/SignInPrompt';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderJourney from '@/components/orders/OrderJourney';
import SavedAddresses from '@/components/account/SavedAddresses';
import RestockReminders from '@/components/account/RestockReminders';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import { formatOrderDate, isTerminalStatus, shortOrderId } from '@/constants/orders';

function QuickLink({ to, icon: Icon, title, hint }) {
    return (
        <Link to={to} className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md">
            <span className="grid size-11 place-items-center rounded-full bg-primary-tint text-primary"><Icon size={20} aria-hidden="true" /></span>
            <span>
                <span className="block font-medium text-ink">{title}</span>
                <span className="text-caption text-muted">{hint}</span>
            </span>
        </Link>
    );
}

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
        api.get('/api/orders', token).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
    }, [isAuthenticated, token]);

    if (!isAuthenticated) {
        return <SignInPrompt icon={UserIcon} title="Your account" description="Sign in to view orders. You can browse, add to bag and wishlist without signing in." redirect="/account" />;
    }

    const activeOrders = orders.filter((o) => !isTerminalStatus(o.status));

    return (
        <div className="container-page py-8 lg:py-12">
            <div className="mx-auto max-w-4xl">
                <EmailVerificationBanner className="mb-6" />

                <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                        <UserAvatar user={user} size="lg" signedIn />
                        <div>
                            <h1 className="text-h2">Hello, {user?.name || user?.email?.split('@')[0] || 'there'}</h1>
                            <p className="text-small text-muted">{user?.email}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={signOut} loading={isSigningOut} className="self-start"><LogOut size={16} aria-hidden="true" /> Sign out</Button>
                </div>

                <div className="mb-12 grid gap-4 sm:grid-cols-3">
                    <QuickLink to="/cart" icon={ShoppingBag} title="My bag" hint={`${cartCount} items saved`} />
                    <QuickLink to="/wishlist" icon={Heart} title="My wishlist" hint={`${wishlistCount} saved items`} />
                    <QuickLink to="/orders" icon={Package} title="My orders" hint={activeOrders.length > 0 ? `${activeOrders.length} in progress` : `${orders.length} total`} />
                </div>

                <RestockReminders orders={orders} />

                <section aria-labelledby="recent-orders">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 id="recent-orders" className="text-h3">Recent orders</h2>
                        {orders.length > 0 && <Link to="/orders" className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline">View all <ChevronRight size={16} aria-hidden="true" /></Link>}
                    </div>

                    {loading ? (
                        <div className="space-y-4"><Skeleton className="h-36 rounded-lg" /><Skeleton className="h-36 rounded-lg" /></div>
                    ) : orders.length === 0 ? (
                        <EmptyState icon={Package} title="No orders yet" description="When you place an order, track its journey here." actionLabel="Start shopping" actionHref="/shop" />
                    ) : (
                        <ul className="space-y-4">
                            {orders.slice(0, 2).map((order) => (
                                <li key={order.id}>
                                    <Link to={`/orders/${order.id}`} className="block rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="font-mono text-small text-ink">{shortOrderId(order.id)}</p>
                                                <p className="text-caption text-muted">{formatOrderDate(order.createdAt)}</p>
                                            </div>
                                            <OrderStatusBadge status={order.status} audience="user" />
                                        </div>
                                        {!isTerminalStatus(order.status) && <div className="mb-3"><OrderJourney order={order} variant="compact" /></div>}
                                        <p className="flex items-center justify-between border-t border-line pt-3">
                                            <span className="font-display text-h4">{formatPrice(order.total)}</span>
                                            <span className="inline-flex items-center gap-1 text-small font-medium text-primary">Details <ChevronRight size={14} aria-hidden="true" /></span>
                                        </p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <SavedAddresses />
            </div>
        </div>
    );
}
