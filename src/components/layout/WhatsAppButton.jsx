import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { PREVIEW_PATH } from '@/utils/productPreview';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useScrollPosition } from '@/hooks';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { cn } from '@/utils/formatPrice';

const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True while a form field has focus, so the button never sits on what is being typed (or on a phone keyboard). */
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

// Pages with their own buy / pay / save bar at the bottom of a phone screen. There the floating button stays off on
// phones (the product page has its own "ask us on WhatsApp" line) and shows on desktop as usual.
const HAS_BOTTOM_BAR = /^\/(product\/|offers\/|club|cart|checkout|login|forgot-password|reset-password|verify-email|account|orders|wishlist)/;

/**
 * The floating "Chat on WhatsApp" button, bottom right.
 *  - Link: https://wa.me/<number>?text=<message>, both from Admin → Content → Store details. Hidden while the number is the placeholder.
 *  - Phones: sits above the bottom tab bar (--tabbar-h), steps aside while scrolling down or typing, waits until the
 *    visitor scrolls past the home hero, and stays off on pages with a bottom action bar.
 *  - Desktop: always there, 24px from the corner.
 */
export default function WhatsAppButton() {
    const { pathname } = useLocation();
    const { available, getWhatsAppUrl } = useWhatsApp();
    const typing = useFieldFocused();
    const scrollingDown = useScrollDirection({ offset: 200 }) === 'down';
    const pastHero = useScrollPosition(320);

    if (!available || pathname.startsWith(ADMIN_PATH) || pathname.startsWith(PREVIEW_PATH)) return null;

    const tuckOnPhone = scrollingDown || (pathname === '/' && !pastHero);

    return (
        <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp (opens in a new tab)"
            title="Chat with us on WhatsApp"
            tabIndex={typing ? -1 : 0}
            className={cn(
                'group fixed right-4 z-40 grid size-12 place-items-center sm:size-14 rounded-full bg-[#25D366] text-white sm:right-6',
                'shadow-[0_8px_24px_-6px_rgba(18,140,70,0.55)] ring-[3px] ring-white',
                'transition-[transform,opacity,box-shadow,background-color] duration-300 ease-out',
                'hover:-translate-y-0.5 hover:bg-[#1ebe5b] hover:shadow-[0_12px_28px_-6px_rgba(18,140,70,0.6)] active:translate-y-0 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2',
                HAS_BOTTOM_BAR.test(pathname)
                    ? 'bottom-6 max-lg:hidden'
                    : 'bottom-[calc(max(var(--tabbar-h,0px),env(safe-area-inset-bottom,0px))+1rem)] lg:bottom-6',
                typing && 'pointer-events-none translate-y-4 opacity-0',
                tuckOnPhone && 'max-lg:pointer-events-none max-lg:translate-y-4 max-lg:opacity-0',
            )}
        >
            {/* The glyph's bubble tail sits low-left, so it is nudged 1px to look centred in the circle. */}
            <WhatsAppIcon size={26} className="size-[26px] -translate-x-px translate-y-px transition-transform duration-300 group-hover:scale-110 sm:size-[30px]" />
        </a>
    );
}
