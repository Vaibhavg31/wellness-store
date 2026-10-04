import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Shared behaviour for modal surfaces: locks body scroll, closes on Escape,
 * traps Tab focus inside the panel and restores focus to the opener on close.
 * Returns a ref for the dialog panel.
 */
export function useDialog(isOpen, onClose) {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const opener = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const panel = panelRef.current;
        const focusables = () => (panel ? [...panel.querySelectorAll(FOCUSABLE)] : []);
        (focusables()[0] ?? panel)?.focus();

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key !== 'Tab') return;
            const items = focusables();
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            opener?.focus?.();
        };
    }, [isOpen, onClose]);

    return panelRef;
}
