import { Link } from 'react-router-dom';
import LegalPage from '@/components/ui/LegalPage';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function PrivacyPage() {
    const { content } = useSiteContent();
    const { brandName, contact } = content;

    return (
        <LegalPage
            title="Privacy Policy"
            path="/privacy"
            summary="How Chikit collects, uses and protects your personal information when you shop with us."
            updated="August 2026"
            sections={[
                {
                    title: 'Information we collect',
                    body: <p>When you shop with {brandName}, we collect information you provide directly, such as your name, email address, phone number and shipping address, to process orders and communicate with you.</p>,
                },
                {
                    title: 'How we use your information',
                    body: <p>We use your information to fulfil orders, verify your identity at checkout, send order updates, respond to enquiries and, with your consent, share news about new products and offers.</p>,
                },
                {
                    title: 'Data security',
                    body: <p>We use appropriate technical and organisational measures to protect your personal data. Payment information is not stored on our servers; cash-on-delivery orders require no card details.</p>,
                },
                {
                    title: 'Your rights',
                    body: <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href={`mailto:${contact.email}`} className="text-primary underline">{contact.email}</a>.</p>,
                },
                {
                    title: 'Contact',
                    body: <p>For privacy-related questions, please reach out via our <Link to="/contact" className="text-primary underline">contact page</Link>.</p>,
                },
            ]}
        />
    );
}
