import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function PromoBanner() {
    const { content } = useSiteContent();
    const promo = content.promo;
    const ref = useRef(null);
    const [dismissed, setDismissed] = useState(() => {
        try {
            return sessionStorage.getItem('krivea-promo-dismissed') === '1';
        } catch {
            return false;
        }
    });

    const hidden = !promo?.enabled || dismissed || content.sections?.promoBanner === false;

    // Navbar renders `fixed` and reads this to sit *below* this bar instead
    // of underneath it — the two used to occupy the same viewport rows, with
    // this bar's higher z-index silently hiding the navbar's own top strip.
    // This is this bar's height MINUS how far the page has scrolled, not a
    // flat height: this bar is normal-flow, not fixed, so it scrolls away
    // like ordinary content — the reserved gap above the navbar has to
    // shrink at the same rate, closing the moment this bar would have
    // scrolled out of view, or the navbar would sit stranded below a gap
    // of blank space (with page content visible through it) for the rest
    // of the scroll. useLayoutEffect so the first paint has no offset jump.
    useLayoutEffect(() => {
        const setVar = (px) => document.documentElement.style.setProperty('--promo-banner-h', `${px}px`);
        if (hidden || !ref.current) {
            setVar(0);
            return undefined;
        }
        const el = ref.current;
        let rawHeight = el.offsetHeight;
        let ticking = false;

        const applyGap = () => {
            setVar(Math.max(0, rawHeight - window.scrollY));
            ticking = false;
        };
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(applyGap);
        };
        const onResize = () => {
            rawHeight = el.offsetHeight;
            applyGap();
        };

        applyGap();
        const ro = new ResizeObserver(onResize);
        ro.observe(el);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', onScroll);
        };
    }, [hidden]);

    useEffect(() => () => document.documentElement.style.setProperty('--promo-banner-h', '0px'), []);

    if (hidden) {
        return null;
    }

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem('krivea-promo-dismissed', '1');
        } catch { /* ignore */ }
    };

    return (
        <motion.div
            ref={ref}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="relative z-[60] bg-gradient-to-r from-forest via-forest-deep to-forest text-cream text-center type-announce sm:text-sm py-2.5 px-10"
        >
            <Link to={promo.href || '/shop'} className="hover:text-turmeric-light transition-colors inline-block">
                {promo.text}{' '}
                <span className="font-semibold text-turmeric tracking-wide">{promo.code}</span>
                {promo.suffix ? ` ${promo.suffix}` : ''}
            </Link>
            <button
                type="button"
                onClick={dismiss}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cream/50 hover:text-cream"
                aria-label="Dismiss offer"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}
