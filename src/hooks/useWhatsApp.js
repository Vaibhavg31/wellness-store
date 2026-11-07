import { useCallback } from 'react';
import { WHATSAPP_DEFAULT_MESSAGE, WHATSAPP_NUMBER } from '@/constants';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { buildWhatsAppUrl, isUsableWhatsAppNumber } from '@/utils/whatsapp';

/**
 * The store's WhatsApp chat: the number and greeting come from Admin → Content → Store details. `available` is false while
 * the number is still the placeholder, and every WhatsApp button and link hides itself until a real number is saved.
 */
export function useWhatsApp() {
    const { content } = useSiteContent();
    const phone = content.contact?.whatsappNumber || WHATSAPP_NUMBER;
    const defaultMessage = content.contact?.whatsappDefaultMessage || WHATSAPP_DEFAULT_MESSAGE;
    const available = isUsableWhatsAppNumber(phone);

    const getWhatsAppUrl = useCallback(
        (message) => buildWhatsAppUrl(message ?? defaultMessage, phone),
        [defaultMessage, phone],
    );

    return { phone, defaultMessage, available, getWhatsAppUrl };
}
