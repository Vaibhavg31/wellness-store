import { WHATSAPP_DEFAULT_MESSAGE, WHATSAPP_NUMBER } from '@/constants';

/** Build a WhatsApp link with pre-filled message (user only taps Send). */
export function buildWhatsAppUrl(message = WHATSAPP_DEFAULT_MESSAGE, phone = WHATSAPP_NUMBER) {
    const text = (message || WHATSAPP_DEFAULT_MESSAGE).trim();
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) {
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    }
    return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`;
}

/** Opens WhatsApp chat with optional pre-filled message. */
export function whatsappUrl(message, phone) {
    return buildWhatsAppUrl(message, phone);
}

export function openWhatsApp(message, phone) {
    window.open(buildWhatsAppUrl(message, phone), '_blank', 'noopener,noreferrer');
}
