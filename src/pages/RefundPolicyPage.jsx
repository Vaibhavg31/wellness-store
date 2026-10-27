import { Link } from 'react-router-dom';
import LegalPage from '@/components/ui/LegalPage';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function RefundPolicyPage() {
    const { content } = useSiteContent();
    const { delivery, contact, brandName } = content;

    return (
        <LegalPage
            title="Returns & Refund Policy"
            updated="October 2026"
            path="/refund-policy"
            summary={`${brandName}'s ${delivery.returnDays}-day return window, how to cancel an order, and how refunds are issued.`}
            sections={[
                {
                    title: 'Cancelling an order',
                    body: <p>You can cancel an order before it is dispatched. Contact us as soon as possible with your order number and we will cancel it and refund any payment already made.</p>,
                },
                {
                    title: `Returns within ${delivery.returnDays} days`,
                    body: <p>If you are not satisfied, contact us within {delivery.returnDays} days of delivery. Because our products are consumables, items must be unopened and in their original packaging to be eligible, except where an item arrived damaged, defective or incorrect.</p>,
                },
                {
                    title: 'Damaged, defective or wrong items',
                    body: <p>Please share your order number and clear photos of the item and packaging. We will arrange a replacement or refund at no extra cost to you.</p>,
                },
                {
                    title: 'How refunds are issued',
                    body: <p>Approved refunds are returned to your original payment method (for online payments). For cash-on-delivery orders we will contact you to arrange the refund. Timelines after approval depend on your bank or payment provider.</p>,
                },
                {
                    title: 'How to start a return',
                    body: <p>Reach us through the <Link to="/contact" className="text-primary underline">contact page</Link>{contact?.email ? <> or at <a href={`mailto:${contact.email}`} className="text-primary underline">{contact.email}</a></> : null}, quoting your order number from <Link to="/orders" className="text-primary underline">My orders</Link>.</p>,
                },
            ]}
        />
    );
}
