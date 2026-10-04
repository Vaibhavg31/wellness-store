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
                <div className={cn('fixed top-[60%] z-40 flex -translate-y-1/2 flex-col items-center gap-2', right ? 'right-0 animate-edge-in-right' : 'left-0 animate-edge-in-left')}>
                    <button
                        type="button"
                        onClick={hide}
                        aria-label="Hide offer tab"
                        className={cn('grid size-7 place-items-center rounded-full bg-surface text-ink shadow-md hover:bg-canvas-alt', right ? 'mr-1' : 'ml-1')}
                    >
                        <X size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-haspopup="dialog"
                        className={cn(
                            'flex items-center gap-2 bg-primary px-2 py-3 text-caption font-semibold tracking-wide text-white shadow-lg transition-colors hover:bg-primary-hover sm:px-3 sm:py-4 sm:text-small',
                            right ? 'rounded-l-xl' : 'rounded-r-xl',
                        )}
                        style={{ writingMode: 'vertical-rl', transform: right ? 'rotate(180deg)' : undefined }}
                    >
                        <Gift size={16} aria-hidden="true" className={right ? '' : '-rotate-90'} />
                        {unlocked ? 'Your code' : offer.tabLabel}
                    </button>
                </div>
            )}
            {open && <OfferPanel offer={offer} onClose={() => setOpen(false)} onUnlocked={() => setUnlocked(true)} />}
        </>
    );
}
