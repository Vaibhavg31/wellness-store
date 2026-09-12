import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Copy,
    MapPin,
    MessageCircle,
    Package,
    Phone,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { formatIndianAddress } from '@/utils/formatAddress';
import { loginUrl } from '@/utils/authRedirect';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderJourney from '@/components/orders/OrderJourney';
import OrderLineItems from '@/components/orders/OrderLineItems';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import {
    formatOrderDate,
    normalizeStatus,
    paymentLabel,
    shortOrderId,
} from '@/constants/orders';
import { useToast } from '@/contexts/ToastContext';

export default function OrderDetailPage() {
    const { id } = useParams();
    const { token, isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const { getWhatsAppUrl } = useWhatsApp();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated || !token || !id) {
            setLoading(false);
            return;
        }
        api.get(`/api/orders/${id}`, token)
            .then(setOrder)
            .catch((err) => setError(err instanceof Error ? err.message : 'Order not found'))
            .finally(() => setLoading(false));
    }, [isAuthenticated, token, id]);

    const copyOrderId = () => {
        if (!order?.id) return;
        navigator.clipboard.writeText(order.id).then(() => {
            showToast('Order ID copied');
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
                <Package size={40} className="text-wine/30 mb-4" />
                <h1 className="font-serif text-3xl mb-3">Sign in to view this order</h1>
                <Link to={loginUrl(`/orders/${id}`)}><Button variant="gold">Sign In</Button></Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-wine/30 border-t-wine rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
                <Package size={40} className="text-soft-brown/30 mb-4" />
                <h1 className="font-serif text-2xl mb-2">Order not found</h1>
                <p className="text-soft-brown text-sm mb-6">{error || 'This order may not exist or belongs to another account.'}</p>
                <Link to="/orders"><Button variant="outline">Back to orders</Button></Link>
            </div>
        );
    }

    const status = normalizeStatus(order.status);
    const s = order.shipping || {};
    const delivered = status === 'delivered';

    return (
        <div className="pb-24 px-4 sm:px-6 lg:px-8 min-h-screen bg-cream">
            <div className="max-w-3xl mx-auto pt-4 sm:pt-8">
                <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-soft-brown hover:text-wine mb-6 transition-colors">
                    <ArrowLeft size={16} /> All orders
                </Link>

                {delivered && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 rounded-2xl bg-gradient-to-r from-wine/10 via-gold/10 to-blush/20 border border-gold/30 p-5 text-center"
                    >
                        <Sparkles size={24} className="text-gold mx-auto mb-2" />
                        <p className="font-serif text-xl text-charcoal">Your pieces have arrived</p>
                        <p className="text-sm text-soft-brown mt-1">Thank you for choosing Krivea. We hope they bring you joy.</p>
                    </motion.div>
                )}

                <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-soft-brown mb-1">Order</p>
                        <div className="flex items-center gap-2">
                            <h1 className="font-mono text-lg text-charcoal">{shortOrderId(order.id)}</h1>
                            <button
                                type="button"
                                onClick={copyOrderId}
                                className="p-1.5 rounded-lg hover:bg-warm-beige/60 text-soft-brown"
                                aria-label="Copy order ID"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                        <p className="text-sm text-soft-brown mt-1">{formatOrderDate(order.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={order.status} audience="user" className="text-sm px-3 py-1" />
                </div>

                <div className="mb-8">
                    <OrderJourney order={order} />
                </div>

                <div className="grid gap-4 mb-8">
                    <section className="bg-ivory rounded-2xl border border-border/40 p-5 sm:p-6">
                        <p className="text-xs tracking-[0.2em] uppercase text-soft-brown mb-4">Items</p>
                        <OrderLineItems items={order.items} />
                        <div className="mt-4 pt-4 border-t border-border/30 space-y-2 text-sm">
                            <div className="flex justify-between text-soft-brown">
                                <span>Subtotal</span>
                                <span>{formatPrice(order.subtotal)}</span>
                            </div>
                            {(order.discountAmount > 0 || order.couponCode) && (
                                <div className="flex justify-between text-emerald">
                                    <span>
                                        Coupon
                                        {order.couponCode ? ` (${order.couponCode})` : ''}
                                    </span>
                                    <span>−{formatPrice(order.discountAmount || 0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-soft-brown">
                                <span>Delivery</span>
                                <span>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Complimentary'}</span>
                            </div>
                            <div className="flex justify-between font-serif text-xl text-charcoal pt-1">
                                <span>Total</span>
                                <span>{formatPrice(order.total)}</span>
                            </div>
                            <p className="text-xs text-soft-brown pt-1">{paymentLabel(order)}</p>
                        </div>
                    </section>

                    <section className="bg-ivory rounded-2xl border border-border/40 p-5 sm:p-6">
                        <p className="text-xs tracking-[0.2em] uppercase text-soft-brown mb-4 flex items-center gap-2">
                            <MapPin size={14} /> Delivery address
                        </p>
                        <p className="font-medium text-charcoal">{s.name}</p>
                        <p className="text-sm text-charcoal/80 mt-1 whitespace-pre-line leading-relaxed">
                            {formatIndianAddress(s, { multiline: true }) || '—'}
                        </p>
                        {s.phone && (
                            <p className="text-sm text-soft-brown mt-3 flex items-center gap-2">
                                <Phone size={14} /> {s.phone}
                            </p>
                        )}
                    </section>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/shop" className="flex-1">
                        <Button variant="gold" className="w-full">Continue Shopping</Button>
                    </Link>
                    <a
                        href={getWhatsAppUrl(`Hi, I have a question about my order ${order.id}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                    >
                        <Button variant="outline" className="w-full gap-2">
                            <MessageCircle size={16} /> Need help?
                        </Button>
                    </a>
                </div>
            </div>
        </div>
    );
}
