import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { PREVIEW_PATH } from '@/utils/productPreview';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useScrollPosition } from '@/hooks';
import { cn } from '@/utils/formatPrice';

const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True while a form field has focus, so the floating button never covers what's being typed. */
function useFieldFocused() {
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        const isField = (el) => el instanceof HTMLElement && FIELD_TAGS.has(el.tagName);
        const onIn = (e) => isField(e.target) && setFocused(true);
        const onOut = (e) => isField(e.target) && setFocused(false);
        document.addEventListener('focusin', onIn);
        document.addEventListener('focusout', onOut);
        return () => {
            document.removeEventListener('focusin', onIn);
            document.removeEventListener('focusout', onOut);
        };
    }, []);
    return focused;
}

export default function WhatsAppButton() {
    const { pathname } = useLocation();
    const { getWhatsAppUrl } = useWhatsApp();
    const fieldFocused = useFieldFocused();
    const awayFromTop = useScrollPosition(320);
    // On phones the home hero's product bar sits right behind the bubble, so it appears once the visitor scrolls on.
    const waitOnPhone = pathname === '/' && !awayFromTop;

    const coversActions = /^\/(product\/|cart|checkout|login|forgot-password|reset-password|verify-email|account|orders|wishlist)/.test(pathname);

    if (pathname.startsWith(ADMIN_PATH) || pathname.startsWith(PREVIEW_PATH)) return null;

    return (
        <aside aria-label="Chat with us">
        <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            tabIndex={fieldFocused ? -1 : 0}
            className={cn(
                // On phones the bubble would sit on the buy buttons, the sign-in / checkout buttons and the bag's "+" buttons;
                // product pages already carry an inline "ask us on WhatsApp" prompt.
                coversActions ? 'max-lg:hidden bottom-6' : 'bottom-4 sm:bottom-6',
                'safe-area-pb fixed right-4 z-40 grid size-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg sm:right-6 sm:size-14',
                'transition-[opacity,transform] duration-300 hover:scale-105',
                fieldFocused && 'pointer-events-none translate-y-4 opacity-0',
                waitOnPhone && 'max-lg:pointer-events-none max-lg:translate-y-4 max-lg:opacity-0',
            )}
        >
            <WhatsAppIcon size={30} />
        </a>
        </aside>
    );
}
