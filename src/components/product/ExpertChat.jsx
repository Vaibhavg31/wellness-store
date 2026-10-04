import { MessageCircle } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';

/** Prefilled WhatsApp question about this product, plus the (admin-editable) health disclaimer. */
export default function ExpertChat({ product }) {
    const { content } = useSiteContent();
    const { getWhatsAppUrl } = useWhatsApp();
    const { expertChat, disclaimer } = content.extras;

    return (
        <>
            {expertChat && (
                <a
                    href={getWhatsAppUrl(`Hi Chikit, I have a question about ${product.title}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-small hover:border-primary"
                >
                    <MessageCircle size={20} className="shrink-0 text-primary" aria-hidden="true" />
                    <span><strong className="font-semibold text-ink">Not sure if it&apos;s right for you?</strong> <span className="text-muted">Ask our team on WhatsApp.</span></span>
                </a>
            )}
            {disclaimer && <p className="mt-6 text-caption text-subtle">{disclaimer}</p>}
        </>
    );
}
