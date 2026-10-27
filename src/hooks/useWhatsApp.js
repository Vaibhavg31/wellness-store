import { useCallback } from 'react';
import { WHATSAPP_DEFAULT_MESSAGE, WHATSAPP_NUMBER } from '@/constants';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { buildWhatsAppUrl } from '@/utils/whatsapp';

export function useWhatsApp() {
    const { content } = useSiteContent();
    const phone = content.contact?.whatsappNumber || WHATSAPP_NUMBER;
    const defaultMessage = content.contact?.whatsappDefaultMessage || WHATSAPP_DEFAULT_MESSAGE;

    const getWhatsAppUrl = useCallback(
        (message) => buildWhatsAppUrl(message ?? defaultMessage, phone),
        [defaultMessage, phone],
    );

    return { phone, defaultMessage, getWhatsAppUrl };
}
