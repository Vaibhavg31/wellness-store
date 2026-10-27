import { Link } from 'react-router-dom';
import LegalPage from '@/components/ui/LegalPage';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';

export default function ShippingPolicyPage() {
    const { content } = useSiteContent();
    const { delivery, contact, brandName } = content;

    return (
        <LegalPage
            title="Shipping Policy"
            updated="October 2026"
            path="/shipping-policy"
            summary={`How ${brandName} ships your order: delivery charges, free-delivery threshold, order tracking and what to do if something goes wrong.`}
            sections={[
                {
                    title: 'Where we deliver',
                    body: <p>We deliver across India. Enter your pincode on any product page to confirm we deliver to your area before you order.</p>,
                },
                {
                    title: 'Delivery charges',
                    body: <p>Delivery is <strong>free on orders above {formatPrice(delivery.freeThreshold)}</strong>. A delivery fee of {formatPrice(delivery.fee)} applies to smaller orders. The exact amount is always shown in your bag and at checkout before you pay.</p>,
                },
                {
                    title: 'Processing and delivery time',
                    body: <p>Orders are packed and handed to our delivery partner after they are confirmed. Delivery time depends on your location and the courier. You can follow your order&apos;s progress at any time from <Link to="/orders" className="text-primary underline">My orders</Link>.</p>,
                },
                {
                    title: 'Cash on delivery',
                    body: <p>Where available, you can pay by cash on delivery. Please keep the exact amount ready and check the parcel is sealed before accepting it.</p>,
                },
                {
                    title: 'Damaged or missing items',
                    body: <p>If your parcel arrives damaged or an item is missing, please contact us within {delivery.returnDays} days of delivery with your order number and photos so we can make it right. See our <Link to="/refund-policy" className="text-primary underline">Returns &amp; Refund Policy</Link>.</p>,
                },
                {
                    title: 'Need help?',
                    body: <p>Reach us via the <Link to="/contact" className="text-primary underline">contact page</Link>{contact?.email ? <> or at <a href={`mailto:${contact.email}`} className="text-primary underline">{contact.email}</a></> : null}.</p>,
                },
            ]}
        />
    );
}
