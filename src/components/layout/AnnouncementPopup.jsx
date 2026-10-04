import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Gift, PartyPopper, Sparkles, Copy, Check } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useProduct } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

const TYPE_ICON = {
    coupon: Gift,
    festival: PartyPopper,
    product: Sparkles,
    info: Sparkles,
};

/** A short, storage-key-safe fingerprint of the popup's content — so
 *  editing the popup in Content Manager shows it again even to visitors
 *  who already dismissed the old one, instead of it staying silently
 *  suppressed by a stale dismissal flag. */
function contentKey(popup) {
    const raw = `${popup.type}|${popup.title}|${popup.message}`;
    try {
        return btoa(unescape(encodeURIComponent(raw))).slice(0, 32);
    } catch {
        return raw.slice(0, 32);
    }
}

function wasDismissed(key, frequency) {
    try {
        if (frequency === 'every_visit') return false;
        const store = frequency === 'once' ? localStorage : sessionStorage;
        return store.getItem(`popup_dismissed_${key}`) === '1';
    } catch {
        return false;
    }
}

function markDismissed(key, frequency) {
    try {
        if (frequency === 'every_visit') return;
        const store = frequency === 'once' ? localStorage : sessionStorage;
        store.setItem(`popup_dismissed_${key}`, '1');
    } catch {
        // Storage blocked (private mode, etc.) — worst case it reappears next visit.
    }
}

function CouponRow({ code }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard API unavailable — the code is still visible to copy by hand.
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-dashed border-turmeric/50 bg-turmeric/10 px-4 py-3 text-left transition-colors hover:bg-turmeric/15"
        >
            <span className="font-display text-lg tracking-wide text-ink">{code}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy code'}
            </span>
        </button>
    );
}

/**
 * Site-wide on-load announcement popup — off by default; an admin turns it
 * on and fills it in from Content Manager (Homepage -> Announcement Popup).
 * Shows once per session/visit/ever depending on `frequency`, after
 * `delaySeconds`, and re-appears for anyone who already dismissed it if the
 * admin changes the content (see contentKey).
 */
export default function AnnouncementPopup() {
    const { content } = useSiteContent();
    const popup = content.popup;
    const [visible, setVisible] = useState(false);

    const productId = popup?.type === 'product' ? popup.productId : null;
    const { product } = useProduct(productId);

    useEffect(() => {
        if (!popup?.enabled) return undefined;

        const key = contentKey(popup);
        if (wasDismissed(key, popup.frequency)) return undefined;

        const timer = setTimeout(() => setVisible(true), Math.max(0, (popup.delaySeconds ?? 2) * 1000));
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [popup?.enabled, popup?.type, popup?.title, popup?.message, popup?.frequency, popup?.delaySeconds]);

    if (!popup?.enabled) return null;

    const dismiss = () => {
        setVisible(false);
        markDismissed(contentKey(popup), popup.frequency);
    };

    const Icon = TYPE_ICON[popup.type] ?? Sparkles;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <div
                        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
                        onClick={dismiss}
                        aria-hidden="true"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={popup.title}
                        className="relative w-full max-w-sm rounded-2xl bg-cream shadow-2xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.92, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <button
                            type="button"
                            onClick={dismiss}
                            aria-label="Close"
                            className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink/5 text-ink/60 hover:bg-ink/10 hover:text-ink transition-colors"
                        >
                            <X size={16} />
                        </button>

                        {popup.image ? (
                            <img src={imageUrl(popup.image)} alt="" className="w-full h-40 object-cover" />
                        ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-emerald to-[#431A43] flex items-center justify-center">
                                <Icon size={32} className="text-turmeric-light" />
                            </div>
                        )}

                        <div className="p-6">
                            <h3 className="font-display text-2xl text-ink leading-tight mb-2">{popup.title}</h3>
                            <p className="text-sm text-slate font-light leading-relaxed mb-5">{popup.message}</p>

                            {popup.type === 'coupon' && popup.couponCode && (
                                <div className="mb-5">
                                    <CouponRow code={popup.couponCode} />
                                </div>
                            )}

                            {popup.type === 'product' && product && (
                                <Link
                                    to={`/product/${product.id}`}
                                    onClick={dismiss}
                                    className="mb-5 flex items-center gap-3 rounded-xl border border-border/40 bg-white/60 p-3 hover:border-turmeric/50 transition-colors"
                                >
                                    <img
                                        src={imageUrl(product.images?.[0])}
                                        alt=""
                                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-sand/50"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-sm text-ink font-medium truncate">{product.title}</span>
                                        <span className="block text-sm text-turmeric-dark">{formatPrice(product.price)}</span>
                                    </span>
                                </Link>
                            )}

                            {popup.ctaLabel && popup.ctaHref && (
                                <Link
                                    to={popup.ctaHref}
                                    onClick={dismiss}
                                    className="block w-full text-center rounded-xl bg-emerald text-cream font-medium py-3 hover:bg-emerald/90 transition-colors"
                                >
                                    {popup.ctaLabel}
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
