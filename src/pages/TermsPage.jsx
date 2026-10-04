import { Link } from 'react-router-dom';
import LegalPage from '@/components/ui/LegalPage';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';

export default function TermsPage() {
    const { content } = useSiteContent();
    const { brandName, delivery } = content;

    return (
        <LegalPage
            title="Terms of Service"
            path="/terms"
            summary="Terms of service for shopping at Chikit: orders, payments, shipping, returns and refunds."
            updated="August 2026"
            sections={[
                {
                    title: 'Acceptance of terms',
                    body: <p>By accessing or using the {brandName} website, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>,
                },
                {
                    title: 'Orders & payment',
                    body: <p>All orders are subject to availability and confirmation. We accept Cash on Delivery (COD) and online payments via Razorpay (UPI, cards and net banking). Prices are listed in Indian Rupees (₹) and include applicable taxes unless stated otherwise.</p>,
                },
                {
                    title: 'Shipping & delivery',
                    body: <p>Delivery times vary by location. Free delivery applies on orders above {formatPrice(delivery.freeThreshold)}. A delivery fee of {formatPrice(delivery.fee)} applies to orders below this threshold.</p>,
                },
                {
                    title: 'Returns & refunds',
                    body: <p>We offer a {delivery.returnDays}-day hassle-free return policy on unworn items in original packaging. To start a return, contact our support team with your order number.</p>,
                },
                {
                    title: 'Intellectual property',
                    body: <p>All content on this website, including images, text, logos and designs, is the property of {brandName} and may not be reproduced without written permission.</p>,
                },
                {
                    title: 'Contact',
                    body: <p>Questions about these terms? Visit our <Link to="/contact" className="text-primary underline">contact page</Link>.</p>,
                },
            ]}
        />
    );
}
