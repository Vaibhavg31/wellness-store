import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import VerifyAnimation from '@/components/ui/VerifyAnimation';

/** Confirmation shown in place of the checkout form once an order is placed. */
export default function OrderPlaced({ placed }) {
    const paidOnline = placed.payment === 'razorpay';
    return (
        <div className="container-page grid min-h-[70vh] place-items-center py-16">
            <div className="max-w-md animate-fade-up text-center" role="status">
                <VerifyAnimation size={88} className="mx-auto mb-6 text-success" />
                <h1 className="mb-3 text-h2">{paidOnline ? 'Payment successful' : 'Order confirmed'}</h1>
                <p className="mb-2 text-muted">Thank you, {placed.shipping?.name}. Your order is confirmed.</p>
                <p className="mb-8 text-small text-ink">Order ID: <strong className="font-mono">{placed.id}</strong></p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <Link to={`/orders/${placed.id}`}><Button>Track your order</Button></Link>
                    <Link to="/shop"><Button variant="outline">Continue shopping</Button></Link>
                </div>
            </div>
        </div>
    );
}
