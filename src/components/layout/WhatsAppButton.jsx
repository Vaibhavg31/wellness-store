import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';

const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True while any text field on the page has focus — the bubble hides for
 * that stretch instead of sitting on top of whatever field the visitor is
 * about to type into (confirmed overlapping the Contact form's message
 * field and, before a size/position pass, the checkout sign-in gate's
 * total). A fixed corner widget can't know a page's layout in advance, so
 * rather than chase every page that happens to end near the fold, it gets
 * out of the way for the one moment that actually matters: someone using a
 * field near it. */
function useFieldFocused() {
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        const isField = (el) => el instanceof HTMLElement && FIELD_TAGS.has(el.tagName);
        const onFocusIn = (e) => { if (isField(e.target)) setFocused(true); };
        const onFocusOut = (e) => { if (isField(e.target)) setFocused(false); };
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);
        return () => {
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
        };
    }, []);
    return focused;
}

function WhatsAppIcon({ size = 28 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

export default function WhatsAppButton() {
    const location = useLocation();
    const isAdmin = location.pathname.startsWith(ADMIN_PATH);
    const { getWhatsAppUrl } = useWhatsApp();
    const fieldFocused = useFieldFocused();

    // Decoupled from the focus-hide toggle on purpose: the 1.2s delay is
    // only for the very first appearance, not something that should replay
    // (or, worse, apply in reverse) every time a field blurs and this
    // button comes back.
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setReady(true), 1200);
        return () => clearTimeout(timer);
    }, []);

    if (isAdmin) return null;

    const href = getWhatsAppUrl();
    const show = ready && !fieldFocused;

    return (
        <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.75, y: show ? 0 : 16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ pointerEvents: show ? 'auto' : 'none' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="fixed z-[45] bottom-4 right-3 sm:bottom-6 sm:right-6 flex items-center gap-2 group safe-area-pb"
            aria-label="Chat on WhatsApp"
            aria-hidden={!show}
        >
            {/* Pulse ring */}
            <span
                className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none"
                style={{ animationDuration: '2.5s' }}
                aria-hidden="true"
            />

            <span className="relative flex items-center justify-center w-12 h-12 sm:w-[3.75rem] sm:h-[3.75rem] rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#20BD5A] transition-colors">
                <WhatsAppIcon size={22} />
            </span>

            <span className="hidden sm:flex absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-ink text-cream text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                Chat on WhatsApp
            </span>
        </motion.a>
    );
}
