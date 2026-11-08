import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, FileText, MapPin, MessageCircle, Package, Phone, RotateCcw, Sparkles, Star, Truck, Undo2, XCircle } from 'lucide-react';
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
import OrderReasonDialog, { useOrderReasons } from '@/components/orders/OrderReasonDialog';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/hooks/useApi';
import { reorderItems, reorderSummaryMessage } from '@/utils/reorder';
import { RETURN_STATUS_LABELS, displayStatus, formatOrderDate, isAwaitingPayment, isTerminalStatus, normalizeStatus, paymentLabel, shortOrderId } from '@/constants/orders';
import PaymentDue from '@/components/checkout/PaymentDue';
import { useToast } from '@/contexts/ToastContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { deliveryWindow } from '@/utils/delivery';
import { copyText } from '@/utils/copyText';
import { openInvoice } from '@/utils/invoice';

const card = 'rounded-lg border border-line bg-surface p-5 sm:p-6';

export default function OrderDetailPage() {
    const { id } = useParams();
    const { token, isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const { available: whatsappOn, getWhatsAppUrl } = useWhatsApp();
    const { addToCart } = useCart();
    const { content } = useSiteContent();
    const { products } = useProducts();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dialog, setDialog] = useState(null); // 'cancel' | 'return'
    const rules = useOrderReasons();

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

    const copyOrderId = async () => {
        if (!order?.id) return;
        const ok = await copyText(order.id);
        showToast(ok ? 'Order ID copied' : 'Could not copy the order ID', ok ? 'success' : 'error');
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
    const eta = !isTerminalStatus(order.status) ? deliveryWindow(content.extras.delivery, new Date(order.createdAt)) : null;
    const status = normalizeStatus(order.status);
    const awaitingPayment = isAwaitingPayment(order);
    const productById = new Map((products || []).map((p) => [p.id, p]));
    const codAllowed = content.payments?.codEnabled !== false && (order.items || []).every((i) => productById.get(i.productId)?.codEnabled !== false);
    // Cancel until the parcel ships (an unpaid order is cancelled from its payment card); a return after delivery, within the window.
    const canCancel = !awaitingPayment && (['placed', 'confirmed'].includes(status) || order.status === 'packed');
    const paidOnline = order.payment === 'razorpay' && order.paymentStatus === 'paid';
    const refundText = {
        refunded: `Your refund${order.refundAmount ? ` of ${formatPrice(order.refundAmount)}` : ''} has been sent to your original payment method.${order.refundedAt ? ` (${formatOrderDate(order.refundedAt, { time: false })})` : ''} Banks usually show it within 5 to 7 working days.`,
        pending: 'Your refund is on its way to your original payment method. It usually shows up within 5 to 7 working days.',
        processing: 'Your refund is on its way to your original payment method. It usually shows up within 5 to 7 working days.',
        failed: 'We are sorting out your refund and will contact you shortly.',
    }[order.refundStatus] || (paidOnline && ['cancelled', 'returned'].includes(status) ? 'Your refund is being processed. It reaches your original payment method in 5 to 7 working days.' : '');
    const windowDays = rules?.returnWindowDays ?? 7;
    const deliveredEntry = [...(order.statusHistory || [])].reverse().find((h) => normalizeStatus(h.status) === 'delivered');
    const deliveredOn = new Date(deliveredEntry?.at || order.updatedAt || order.createdAt).getTime();
    const daysLeft = Math.ceil(windowDays - (Date.now() - deliveredOn) / 86400000);
    const canReturn = delivered && !order.returnStatus && daysLeft > 0;
    const reviewable = delivered ? [...new Map(order.items.filter((i) => i.productId).map((i) => [i.productId, i])).values()] : [];

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
                    <OrderStatusBadge status={displayStatus(order)} audience="user" className="px-3 py-1 text-small" />
                </div>

                {eta && !awaitingPayment && (
                    <p className="mb-4 flex items-center gap-2 rounded-lg bg-primary-soft px-4 py-3 text-small text-ink">
                        <Truck size={16} className="shrink-0 text-primary" aria-hidden="true" /> Expected delivery: <strong>{eta}</strong>
                    </p>
                )}

                {awaitingPayment && (
                    <div className="mb-8">
                        <PaymentDue
                            order={order}
                            token={token}
                            codAllowed={codAllowed}
                            onPaid={(o) => { setOrder(o); showToast(o.payment === 'cod' ? 'Your order is confirmed: pay when it arrives' : 'Payment received. Your order is confirmed', 'success'); }}
                            onChanged={setOrder}
                            onCancelled={(o) => { setOrder(o); showToast('Order cancelled', 'success'); }}
                        />
                    </div>
                )}

                <div className="mb-8"><OrderJourney order={order} /></div>

                {status === 'cancelled' && (order.cancelReason || order.cancelledBy) && (
                    <section className={`${card} mb-8`} aria-labelledby="order-cancelled">
                        <h2 id="order-cancelled" className="mb-2 flex items-center gap-2 font-sans text-h4"><XCircle size={18} className="text-danger" aria-hidden="true" /> Cancelled</h2>
                        <p className="text-small text-muted">
                            {order.payment === 'razorpay' && order.paymentStatus === 'failed'
                                ? ({ customer: 'You cancelled this order before paying.', admin: 'This order was cancelled by Chikit before it was paid.' }[order.cancelledBy] || 'The payment for this order did not come through in time, so it was cancelled and nothing will be sent.')
                                : order.cancelledBy === 'customer' ? 'You cancelled this order.' : 'This order was cancelled by Chikit.'}
                            {order.cancelReason && !(order.paymentStatus === 'failed' && order.cancelReason === 'Payment not completed') ? <> Reason: <strong className="text-ink">{order.cancelReason}</strong>.</> : null}
                        </p>
                        {order.cancelNote && <p className="mt-1 text-small text-muted">“{order.cancelNote}”</p>}
                        {order.payment === 'razorpay' && order.paymentStatus === 'failed' && <p className="mt-3 text-small text-muted">If any money left your account for this order, it is refunded automatically to the same account within 5 to 7 working days.</p>}
                        {refundText && <p className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-small text-ink">{refundText}</p>}
                    </section>
                )}

                {status !== 'cancelled' && refundText && (
                    <p className="mb-8 rounded-lg bg-primary-soft px-4 py-3 text-small text-ink" role="status">{refundText}</p>
                )}

                {order.returnStatus && (
                    <section className={`${card} mb-8`} aria-labelledby="order-return">
                        <h2 id="order-return" className="mb-2 flex items-center gap-2 font-sans text-h4"><Undo2 size={18} aria-hidden="true" /> {RETURN_STATUS_LABELS[order.returnStatus] ?? 'Return'}</h2>
                        <p className="text-small text-muted">Reason: <strong className="text-ink">{order.returnReason}</strong>{order.returnNote ? ` (${order.returnNote})` : ''}</p>
                        {(() => {
                            const last = [...(order.statusHistory || [])].reverse().find((h) => h.status === `return_${order.returnStatus}`);
                            return last?.note && order.returnStatus !== 'requested' ? <p className="mt-2 rounded-lg bg-canvas-alt px-3 py-2 text-small text-ink">Message from Chikit: {last.note}</p> : null;
                        })()}
                        {order.returnStatus === 'requested' && <p className="mt-2 text-small text-muted">We have your request and will get back to you soon.</p>}
                        {order.returnStatus === 'rejected' && <p className="mt-2 text-small text-muted">Need to talk it through? Use “Need help?” below and we will sort it out.</p>}
                    </section>
                )}

                {reviewable.length > 0 && (
                    <section className={`${card} mb-8`} aria-labelledby="order-review">
                        <h2 id="order-review" className="mb-1 flex items-center gap-2 font-sans text-h4"><Star size={18} aria-hidden="true" /> How did it go?</h2>
                        <p className="mb-4 text-small text-muted">Your review helps others choose well.</p>
                        <ul className="space-y-2">
                            {reviewable.map((item) => (
                                <li key={item.productId} className="flex items-center justify-between gap-3">
                                    <span className="min-w-0 truncate text-small text-ink">{item.title}</span>
                                    <Link to={`/product/${item.productId}`} className="shrink-0 text-small font-medium text-primary hover:underline">Write a review</Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

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

                {(canCancel || canReturn) && (
                    <section className={`${card} mb-8`} aria-labelledby="order-changes">
                        <h2 id="order-changes" className="mb-1 font-sans text-h4">{canCancel ? 'Changed your mind?' : 'Something not right?'}</h2>
                        <p className="mb-4 text-small text-muted">{canCancel ? 'You can cancel this order until it ships. Stock and any coupon you used are released straight away.' : `You can ask for a return within ${windowDays} days of delivery (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left).`}</p>
                        <Button variant="outline" onClick={() => setDialog(canCancel ? 'cancel' : 'return')}>{canCancel ? <><XCircle size={16} aria-hidden="true" /> Cancel order</> : <><Undo2 size={16} aria-hidden="true" /> Return this order</>}</Button>
                    </section>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button to="/shop" className="w-full flex-1">Continue shopping</Button>
                    {whatsappOn && <Button href={getWhatsAppUrl(`Hi, I have a question about my order ${order.id}`)} target="_blank" rel="noopener noreferrer" variant="outline" className="flex-1"><MessageCircle size={16} aria-hidden="true" /> Need help?</Button>}
                    <Button variant="outline" className="flex-1" onClick={() => openInvoice(order, content)}><FileText size={16} aria-hidden="true" /> Invoice</Button>
                </div>
            </div>
            <OrderReasonDialog mode={dialog || 'cancel'} order={order} token={token} isOpen={Boolean(dialog)} onClose={() => setDialog(null)} onDone={setOrder} showToast={showToast} />
        </div>
    );
}
