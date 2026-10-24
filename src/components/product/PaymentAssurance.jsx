import { Banknote, Lock } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';

/** One quiet line that answers "can I pay my way, and is it safe?" (shoppers abandon when payment options or trust are unclear). */
export default function PaymentAssurance({ className }) {
    const { content } = useSiteContent();
    const { codEnabled, onlinePaymentEnabled } = content.payments ?? {};
    if (!codEnabled && !onlinePaymentEnabled) return null;
    return (
        <ul className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 text-caption text-muted ${className ?? ''}`}>
            {onlinePaymentEnabled && <li className="inline-flex items-center gap-1.5"><Lock size={14} className="text-success" aria-hidden="true" /> Secure payment: UPI, cards, netbanking</li>}
            {codEnabled && <li className="inline-flex items-center gap-1.5"><Banknote size={14} className="text-success" aria-hidden="true" /> Cash on delivery available</li>}
        </ul>
    );
}
