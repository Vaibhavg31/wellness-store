import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';
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

    if (pathname.startsWith(ADMIN_PATH)) return null;

    return (
        <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            tabIndex={fieldFocused ? -1 : 0}
            className={cn(
                'safe-area-pb fixed bottom-4 right-4 z-40 grid size-12 place-items-center rounded-full bg-success text-white shadow-md sm:bottom-6 sm:right-6 sm:size-14',
                'transition-[opacity,transform] duration-300 hover:scale-105',
                fieldFocused && 'pointer-events-none translate-y-4 opacity-0',
            )}
        >
            <MessageCircle size={24} aria-hidden="true" />
        </a>
    );
}
