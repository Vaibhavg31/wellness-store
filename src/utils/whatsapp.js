import { WHATSAPP_DEFAULT_MESSAGE, WHATSAPP_NUMBER } from '@/constants';

/** Only the digits of a phone number ("+91 98765-43210" → "919876543210"). */
export const whatsappDigits = (phone) => String(phone ?? '').replace(/\D/g, '');

/**
 * True for a number WhatsApp can open a chat with: 10 to 15 digits, and not the all-zero placeholder the store starts
 * with (+91 00000 00000), which would open a chat with nobody.
 */
export function isUsableWhatsAppNumber(phone) {
    const digits = whatsappDigits(phone);
    if (!/^\d{10,15}$/.test(digits)) return false;
    return !/^(?:91)?0+$/.test(digits);
}

/** A WhatsApp chat link with the message already typed (the visitor only taps Send): https://wa.me/<number>?text=<message>. */
export function buildWhatsAppUrl(message = WHATSAPP_DEFAULT_MESSAGE, phone = WHATSAPP_NUMBER) {
    const text = encodeURIComponent((message || WHATSAPP_DEFAULT_MESSAGE).trim());
    const digits = whatsappDigits(phone);
    return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

/** Opens a WhatsApp chat with an optional pre-filled message. */
export function whatsappUrl(message, phone) {
    return buildWhatsAppUrl(message, phone);
}

export function openWhatsApp(message, phone) {
    window.open(buildWhatsAppUrl(message, phone), '_blank', 'noopener,noreferrer');
}
