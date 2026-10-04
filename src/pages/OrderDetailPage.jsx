import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, MapPin, MessageCircle, Package, Phone, RotateCcw, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { formatIndianAddress } from '@/utils/formatAddress';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import EmptyState from '@/components/ui/EmptyState';
import SignInPrompt from '@/components/auth/SignInPrompt';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderJourney from '@/components/orders/OrderJourney';
import OrderLineItems from '@/components/orders/OrderLineItems';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/hooks/useApi';
import { reorderItems, reorderSummaryMessage } from '@/utils/reorder';
import { formatOrderDate, normalizeStatus, paymentLabel, shortOrderId } from '@/constants/orders';
import { useToast } from '@/contexts/ToastContext';

const card = 'rounded-lg border border-line bg-surface p-5 sm:p-6';

export default function OrderDetailPage() {
    const { id } = useParams();
    const { token, isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const { getWhatsAppUrl } = useWhatsApp();
    const { addToCart } = useCart();
    const { products } = useProducts();
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
        if (order?.id) navigator.clipboard.writeText(order.id).then(() => showToast('Order ID copied'));
    };

    const buyAgain = () => {
        const result = reorderItems(order, products, addToCart);
        showToast(reorderSummaryMessage(result), result.addedCount > 0 ? 'success' : 'error');
    };

    if (!isAuthenticated) {
        return <SignInPrompt icon={Package} title="Sign in to view this order" description="Orders are private to the account they were placed with." redirect={`/orders/${id}`} />;
    }

    if (loading) {
        return <div className="container-page max-w-3xl space-y-4 py-12"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
    }

    if (error || !order) {
        return (
            <div className="container-page py-16">
                <EmptyState as="h1" icon={Package} title="Order not found" description={error || 'This order may not exist or belongs to another account.'} actionLabel="Back to orders" actionHref="/orders" />
            </div>
        );
    }

    const delivered = normalizeStatus(order.status) === 'delivered';
    const shipping = order.shipping || {};

    return (
        <div className="container-page py-8 lg:py-12">
            <div className="mx-auto max-w-3xl">
                <Breadcrumbs className="mb-6" crumbs={[{ label: 'Account', href: '/account' }, { label: 'Orders', href: '/orders' }, { label: shortOrderId(order.id) }]} />

                {delivered && (
                    <div className="mb-6 rounded-lg bg-success-tint p-5 text-center" role="status">
                        <Sparkles size={24} className="mx-auto mb-2 text-success" aria-hidden="true" />
                        <p className="font-display text-h4">Your order has arrived</p>
                        <p className="mt-1 text-small text-muted">Thank you for choosing us. We hope you feel the difference.</p>
                    </div>
                )}

                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="eyebrow mb-1">Order</p>
                        <div className="flex items-center gap-1">
                            <h1 className="font-mono text-h3">{shortOrderId(order.id)}</h1>
                            <button type="button" onClick={copyOrderId} className="grid size-9 place-items-center rounded-full text-muted hover:bg-canvas-alt hover:text-ink" aria-label="Copy order ID"><Copy size={16} /></button>
                        </div>
                        <p className="mt-1 text-small text-muted">{formatOrderDate(order.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={order.status} audience="user" className="px-3 py-1 text-small" />
                </div>

                <div className="mb-8"><OrderJourney order={order} /></div>

                <div className="mb-8 grid gap-4">
                    <section className={card} aria-labelledby="order-items">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 id="order-items" className="font-sans text-h4">Items</h2>
                            <button type="button" onClick={buyAgain} className="inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"><RotateCcw size={14} aria-hidden="true" /> Buy again</button>
                        </div>
                        <OrderLineItems items={order.items} />
                        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-small">
                            <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
                            {(order.discountAmount > 0 || order.couponCode) && (
                                <div className="flex justify-between text-success"><dt>Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>−{formatPrice(order.discountAmount || 0)}</dd></div>
                            )}
                            <div className="flex justify-between text-muted"><dt>Delivery</dt><dd>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Free'}</dd></div>
                            <div className="flex justify-between pt-1 font-display text-h4 text-ink"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
                            <p className="pt-1 text-caption text-muted">{paymentLabel(order)}</p>
                        </dl>
                    </section>

                    <section className={card} aria-labelledby="order-address">
                        <h2 id="order-address" className="mb-4 flex items-center gap-2 font-sans text-h4"><MapPin size={18} aria-hidden="true" /> Delivery address</h2>
                        <p className="font-medium text-ink">{shipping.name}</p>
                        <p className="mt-1 whitespace-pre-line text-small text-muted">{formatIndianAddress(shipping, { multiline: true }) || '—'}</p>
                        {shipping.phone && <p className="mt-3 flex items-center gap-2 text-small text-muted"><Phone size={14} aria-hidden="true" /> {shipping.phone}</p>}
                    </section>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link to="/shop" className="flex-1"><Button className="w-full">Continue shopping</Button></Link>
                    <a href={getWhatsAppUrl(`Hi, I have a question about my order ${order.id}`)} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full"><MessageCircle size={16} aria-hidden="true" /> Need help?</Button>
                    </a>
                </div>
            </div>
        </div>
    );
}
