import { Link } from 'react-router-dom';
import { Mail, PackageCheck, Truck } from 'lucide-react';
import Button from '@/components/ui/Button';
import VerifyAnimation from '@/components/ui/VerifyAnimation';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { deliveryWindow } from '@/utils/delivery';

/** Confirmation shown in place of the checkout form once an order is placed. */
export default function OrderPlaced({ placed }) {
    const { content } = useSiteContent();
    const paidOnline = placed.payment === 'razorpay';
    const eta = deliveryWindow(content.extras.delivery);
    const steps = [
        { icon: Mail, text: 'We confirm your order by email and WhatsApp.' },
        { icon: PackageCheck, text: 'Your order is packed and handed to the courier.' },
        { icon: Truck, text: eta ? `It reaches you by ${eta}.` : 'You can follow it live from your orders page.' },
    ];

    return (
        <div className="container-page grid min-h-[70vh] place-items-center py-16">
            <div className="max-w-md animate-fade-up text-center" role="status">
                <VerifyAnimation size={88} className="mx-auto mb-6 text-success" />
                <h1 className="mb-3 text-h2">{paidOnline ? 'Payment successful' : 'Order confirmed'}</h1>
                <p className="mb-2 text-muted">Thank you, {placed.shipping?.name}. Your order is confirmed.</p>
                <p className="mb-6 text-small text-ink">Order ID: <strong className="font-mono">{placed.id}</strong></p>

                <ol className="mb-8 space-y-3 rounded-lg border border-line bg-surface p-4 text-left">
                    <li className="eyebrow">What happens next</li>
                    {steps.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-start gap-3 text-small text-ink">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-tint text-primary"><Icon size={16} aria-hidden="true" /></span>
                            <span className="pt-1">{text}</span>
                        </li>
                    ))}
                </ol>

                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <Link to={`/orders/${placed.id}`}><Button>Track your order</Button></Link>
                    <Link to="/shop"><Button variant="outline">Continue shopping</Button></Link>
                </div>
            </div>
        </div>
    );
}
