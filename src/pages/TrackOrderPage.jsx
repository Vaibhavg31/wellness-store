import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import Seo from '@/components/seo/Seo';
import PageHeader from '@/components/ui/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderJourney from '@/components/orders/OrderJourney';
import OrderLineItems from '@/components/orders/OrderLineItems';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { formatOrderDate, paymentLabel, shortOrderId } from '@/constants/orders';

/** Public order lookup: order ID + the email or phone used on the order. No sign-in required. */
export default function TrackOrderPage() {
    const [form, setForm] = useState({ orderId: '', contact: '' });
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setOrder(null);
        try {
            setOrder(await api.post('/api/orders/track', form));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not look up your order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Seo title="Track Your Order" description="Track your Chikit order with your order ID and the email or phone number you used." path="/track-order" noindex />
            <PageHeader eyebrow="Order status" title="Track your order" description="No account needed — enter your order ID and the email or phone number you used at checkout." />
            <div className="container-page py-8 lg:py-12">
                <div className="mx-auto max-w-2xl">
                    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-surface p-5 sm:p-6" noValidate={false}>
                        <Input label="Order ID" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} placeholder="Found in your confirmation message" autoComplete="off" required />
                        <Input label="Email or phone number" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="The one used on the order" autoComplete="email" required />
                        {error && <p className="rounded-lg bg-danger-tint px-4 py-3 text-small text-danger" role="alert">{error}</p>}
                        <Button type="submit" size="lg" className="w-full" loading={loading}><PackageSearch size={18} aria-hidden="true" /> Track order</Button>
                        <p className="text-center text-caption text-muted">Have an account? <Link to="/orders" className="font-medium text-primary hover:underline">See all your orders</Link></p>
                    </form>

                    {order && (
                        <section aria-live="polite" className="mt-8 space-y-6" aria-label="Order status">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="eyebrow mb-1">Order</p>
                                    <h2 className="font-mono text-h3">{shortOrderId(order.id)}</h2>
                                    <p className="mt-1 text-small text-muted">{formatOrderDate(order.createdAt)}</p>
                                </div>
                                <OrderStatusBadge status={order.status} audience="user" className="px-3 py-1 text-small" />
                            </div>

                            <OrderJourney order={order} />

                            <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
                                <OrderLineItems items={order.items} />
                                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-small">
                                    <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
                                    {order.discountAmount > 0 && <div className="flex justify-between text-success"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>−{formatPrice(order.discountAmount)}</dd></div>}
                                    <div className="flex justify-between text-muted"><dt>Delivery</dt><dd>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Free'}</dd></div>
                                    <div className="flex justify-between pt-1 font-display text-h4 text-ink"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
                                    <p className="pt-1 text-caption text-muted">{paymentLabel(order)} · Delivering to {[order.shipping.city, order.shipping.state, order.shipping.pincode].filter(Boolean).join(', ')}</p>
                                </dl>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}
