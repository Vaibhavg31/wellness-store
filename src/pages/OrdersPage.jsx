import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Package, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { loginUrl } from '@/utils/authRedirect';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderJourney from '@/components/orders/OrderJourney';
import {
    formatOrderDate,
    isTerminalStatus,
    normalizeStatus,
    paymentLabel,
    shortOrderId,
} from '@/constants/orders';

function OrderCard({ order, index }) {
    const status = normalizeStatus(order.status);
    const firstItem = order.items?.[0];
    const itemCount = order.items?.length || 0;
    const active = !isTerminalStatus(order.status);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
        >
            <Link
                to={`/orders/${order.id}`}
                className="group block bg-ivory rounded-2xl border border-border/40 overflow-hidden hover:border-wine/20 hover:luxury-shadow-hover transition-all duration-300"
            >
                <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-soft-brown mb-1">Order</p>
                            <p className="font-mono text-sm text-charcoal">{shortOrderId(order.id)}</p>
                            <p className="text-xs text-soft-brown mt-1">{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <OrderStatusBadge status={order.status} audience="user" />
                    </div>

                    <div className="flex gap-3 mb-4">
                        {firstItem?.image && (
                            <div className="relative flex-shrink-0">
                                <img
                                    src={imageUrl(firstItem.image)}
                                    alt=""
                                    className="w-16 h-20 object-cover rounded-xl bg-warm-beige"
                                />
                                {itemCount > 1 && (
                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-wine text-ivory text-[10px] flex items-center justify-center font-medium">
                                        +{itemCount - 1}
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-charcoal font-medium line-clamp-2 group-hover:text-wine transition-colors">
                                {firstItem?.title || 'Your order'}
                            </p>
                            {itemCount > 1 && (
                                <p className="text-xs text-soft-brown mt-1">
                                    + {itemCount - 1} more piece{itemCount - 1 === 1 ? '' : 's'}
                                </p>
                            )}
                            <p className="font-serif text-xl text-charcoal mt-2">{formatPrice(order.total)}</p>
                        </div>
                    </div>

                    {active && (
                        <div className="mb-4">
                            <OrderJourney order={order} variant="compact" />
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                        <p className="text-xs text-soft-brown">{paymentLabel(order)}</p>
                        <span className="inline-flex items-center gap-1 text-sm text-wine font-medium group-hover:gap-2 transition-all">
                            Track order <ChevronRight size={16} />
                        </span>
                    </div>
                </div>

                {status === 'delivered' && (
                    <div className="px-5 py-2.5 bg-gradient-to-r from-gold/10 to-wine/5 border-t border-gold/20 text-xs text-gold-ink flex items-center gap-2">
                        <Sparkles size={12} />
                        Delivered. We hope you love your pieces
                    </div>
                )}
            </Link>
        </motion.div>
    );
}

export default function OrdersPage() {
    const { token, isAuthenticated } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

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

    const filtered = useMemo(() => {
        if (filter === 'all') return orders;
        if (filter === 'active') return orders.filter((o) => !isTerminalStatus(o.status));
        if (filter === 'delivered') return orders.filter((o) => normalizeStatus(o.status) === 'delivered');
        if (filter === 'cancelled') return orders.filter((o) => ['cancelled', 'returned'].includes(normalizeStatus(o.status)));
        return orders;
    }, [orders, filter]);

    const activeCount = orders.filter((o) => !isTerminalStatus(o.status)).length;

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
                <Package size={40} className="text-wine/30 mb-4" />
                <h1 className="font-serif text-3xl mb-3">Your Orders</h1>
                <p className="text-soft-brown mb-6 max-w-sm">
                    Sign in to track your Krivea pieces from our studio to your doorstep.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link to={loginUrl('/orders')}><Button variant="gold">Sign In</Button></Link>
                    <Link to="/shop"><Button variant="outline">Continue Shopping</Button></Link>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-cream pt-4 sm:pt-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-soft-brown hover:text-wine mb-4 transition-colors">
                        <ArrowLeft size={16} /> Back to account
                    </Link>
                    <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-2">Your Orders</h1>
                    <p className="text-soft-brown">
                        {activeCount > 0
                            ? `${activeCount} order${activeCount === 1 ? '' : 's'} on the way. Follow each journey below`
                            : 'Every piece has a story. Here are yours'}
                    </p>
                </div>

                {orders.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'active', label: 'In progress' },
                            { key: 'delivered', label: 'Delivered' },
                            { key: 'cancelled', label: 'Cancelled' },
                        ].map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilter(f.key)}
                                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                                    filter === f.key
                                        ? 'bg-wine text-ivory'
                                        : 'bg-ivory border border-border/40 text-soft-brown hover:text-charcoal'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-wine/30 border-t-wine rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-ivory rounded-2xl p-12 text-center border border-border/40">
                        <Package size={36} className="text-wine/20 mx-auto mb-4" />
                        <p className="text-charcoal font-medium mb-2">
                            {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
                        </p>
                        <p className="text-soft-brown text-sm mb-6">
                            {filter === 'all'
                                ? 'When you place an order, you\'ll see a live journey here.'
                                : 'Try a different filter to see other orders.'}
                        </p>
                        {filter === 'all' && (
                            <Link to="/shop"><Button variant="gold">Discover Collection</Button></Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((order, i) => (
                            <OrderCard key={order.id} order={order} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
