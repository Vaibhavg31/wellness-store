import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Gift, X } from 'lucide-react';
import OfferPanel, { readUnlocked } from '@/components/offer/OfferPanel';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { popupAllowedOn } from '@/utils/popupSchedule';
import { cn } from '@/utils/formatPrice';

const HIDDEN_KEY = 'chikit-offer-tab-hidden';

const wasHidden = () => {
    try {
        return sessionStorage.getItem(HIDDEN_KEY) === '1';
    } catch {
        return false;
    }
};

/**
 * A slim tab pinned to the edge of every storefront page ("Get 10% OFF"). Tapping it opens the offer panel.
 * Admin controls the wording, side, delay, coupon and pages; the visitor can tuck it away for the session.
 * Once they have unlocked their code the tab reads "Your code" and reopens straight to it.
 */
export default function OfferTab() {
    const { content } = useSiteContent();
    const { pathname } = useLocation();
    const offer = content.extras.offerTab;
    const [ready, setReady] = useState(false);
    const [hidden, setHidden] = useState(wasHidden);
    const [open, setOpen] = useState(false);
    const [unlocked, setUnlocked] = useState(() => Boolean(readUnlocked()));

    const allowed = offer.enabled && Boolean(offer.couponId) && popupAllowedOn(pathname, offer.pages, ADMIN_PATH);

    useEffect(() => {
        if (!offer.enabled) return undefined;
        const timer = setTimeout(() => setReady(true), Math.max(0, offer.delaySeconds) * 1000);
        return () => clearTimeout(timer);
    }, [offer.enabled, offer.delaySeconds]);

    if (!allowed || !ready) return null;

    const hide = () => {
        setHidden(true);
        try {
            sessionStorage.setItem(HIDDEN_KEY, '1');
        } catch {
            /* the tab simply returns on the next page load */
        }
    };

    const right = offer.side === 'right';

    return (
        <>
            {!hidden && (
                <div className={cn(
                    // Phones: a compact pill at the bottom-left (clear of the chat button). Larger screens: the slim edge tab.
                    'fixed bottom-4 left-4 z-40 flex animate-fade-up items-center gap-1.5 sm:bottom-auto sm:top-[60%] sm:-translate-y-1/2 sm:flex-col sm:gap-2 sm:animate-none',
                    right ? 'sm:left-auto sm:right-0 sm:animate-edge-in-right' : 'sm:left-0 sm:animate-edge-in-left',
                )}>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-haspopup="dialog"
                        className={cn(
                            'flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-small font-semibold tracking-wide text-white shadow-lg transition-colors hover:bg-primary-hover',
                            'sm:order-2 sm:rounded-none sm:px-3 sm:py-4 sm:[writing-mode:vertical-rl]',
                            right ? 'sm:rotate-180 sm:rounded-l-xl' : 'sm:rounded-r-xl',
                        )}
                    >
                        <Gift size={16} aria-hidden="true" className={right ? '' : 'sm:-rotate-90'} />
                        {unlocked ? 'Your code' : offer.tabLabel}
                    </button>
                    <button
                        type="button"
                        onClick={hide}
                        aria-label="Hide offer tab"
                        className={cn('grid size-9 place-items-center rounded-full bg-surface text-ink shadow-md hover:bg-canvas-alt sm:order-1 sm:size-7', right ? 'sm:mr-1' : 'sm:ml-1')}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            {open && <OfferPanel offer={offer} onClose={() => setOpen(false)} onUnlocked={() => setUnlocked(true)} />}
        </>
    );
}
