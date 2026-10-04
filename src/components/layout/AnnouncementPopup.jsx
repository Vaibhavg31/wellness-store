import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { X, Gift, PartyPopper, Sparkles, Copy, Check, LayoutGrid } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useDialog } from '@/hooks/useDialog';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useProduct } from '@/hooks/useApi';
import { api, imageUrl } from '@/services/api';
import { isWithinSchedule, popupAllowedOn } from '@/utils/popupSchedule';
import { formatPrice } from '@/utils/formatPrice';

const TYPE_ICON = { coupon: Gift, festival: PartyPopper, product: Sparkles, category: LayoutGrid, info: Sparkles };

/** Fingerprint of the popup's content, so editing it re-shows it to visitors who dismissed the old one. */
function contentKey(popup) {
    const raw = [popup.type, popup.title, popup.message, popup.image, popup.couponCode, popup.productId, popup.categorySlug, popup.ctaHref].join('|');
    try {
        return btoa(unescape(encodeURIComponent(raw))).slice(0, 32);
    } catch {
        return raw.slice(0, 32);
    }
}

const storeFor = (frequency) => (frequency === 'once' ? localStorage : sessionStorage);

function wasDismissed(key, frequency) {
    try {
        return frequency !== 'every_visit' && storeFor(frequency).getItem(`popup_dismissed_${key}`) === '1';
    } catch {
        return false;
    }
}

function markDismissed(key, frequency) {
    try {
        if (frequency !== 'every_visit') storeFor(frequency).setItem(`popup_dismissed_${key}`, '1');
    } catch {
        /* storage blocked — popup may reappear next visit */
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
            /* clipboard unavailable — code stays visible to copy by hand */
        }
    };
    return (
        <button type="button" onClick={copy} className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-accent bg-accent-tint px-4 py-3 text-left transition-colors hover:bg-accent-tint/70">
            <span className="font-mono text-lead font-semibold tracking-wide text-ink">{code}</span>
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-primary">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy code'}
            </span>
        </button>
    );
}

/** The popup card itself; also used by the admin "Preview popup" button. */
export function PopupDialog({ popup, product = null, category = null, onDismiss }) {
    const panelRef = useDialog(true, onDismiss);
    const Icon = TYPE_ICON[popup.type] ?? Sparkles;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 animate-fade-in bg-ink/60" onClick={onDismiss} aria-hidden="true" />
            <div ref={panelRef} role="dialog" aria-modal="true" aria-label={popup.title} tabIndex={-1} className="relative w-full max-w-sm animate-fade-up overflow-hidden rounded-xl bg-surface shadow-lg focus:outline-none">
                <button type="button" onClick={onDismiss} aria-label="Close" className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-xs hover:bg-surface">
                    <X size={16} />
                </button>

                {popup.image ? (
                    <img src={imageUrl(popup.image)} alt="" width="384" height="160" className="h-40 w-full object-cover" />
                ) : (
                    <div className="grid h-24 place-items-center bg-primary-tint text-primary">
                        <Icon size={32} aria-hidden="true" />
                    </div>
                )}

                <div className="p-6">
                    <h2 className="mb-2 text-h3">{popup.title}</h2>
                    <p className="mb-5 text-small text-muted">{popup.message}</p>

                    {popup.type === 'coupon' && popup.couponCode && <div className="mb-5"><CouponRow code={popup.couponCode} /></div>}

                    {popup.type === 'product' && product && (
                        <Link to={`/product/${product.id}`} onClick={onDismiss} className="mb-5 flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:border-primary">
                            <img src={imageUrl(product.images?.[0])} alt="" width="48" height="48" className="size-12 shrink-0 rounded-md bg-canvas-alt object-cover" />
                            <span className="min-w-0">
                                <span className="block truncate text-small font-medium text-ink">{product.title}</span>
                                <span className="block text-small text-muted">{formatPrice(product.price)}</span>
                            </span>
                        </Link>
                    )}

                    {popup.type === 'category' && category && (
                        <Link to={`/category/${category.slug}`} onClick={onDismiss} className="mb-5 flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:border-primary">
                            {category.image && <img src={imageUrl(category.image, 120)} alt="" width="48" height="48" className="size-12 shrink-0 rounded-md bg-canvas-alt object-cover" />}
                            <span className="min-w-0">
                                <span className="block truncate text-small font-medium text-ink">{category.label}</span>
                                <span className="block text-small text-muted">Browse the collection</span>
                            </span>
                        </Link>
                    )}

                    {popup.ctaLabel && popup.ctaHref && (
                        <Link to={popup.ctaHref} onClick={onDismiss} className="block">
                            <Button className="w-full">{popup.ctaLabel}</Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

/**
 * Site-wide on-load announcement popup, managed from Content Manager.
 * Shows once per session / visit / ever depending on `frequency`, after `delaySeconds`, only inside its
 * start/end window and only on the pages the admin chose (never checkout, sign-in or admin).
 */
export default function AnnouncementPopup() {
    const { content } = useSiteContent();
    const { pathname } = useLocation();
    const options = content.extras.popup;
    const popup = { ...content.popup, categorySlug: options.categorySlug };
    const [visible, setVisible] = useState(false);
    const [category, setCategory] = useState(null);
    const { product } = useProduct(popup.type === 'product' ? popup.productId : null);

    const eligible = Boolean(popup.enabled)
        && popupAllowedOn(pathname, options.pages, ADMIN_PATH)
        && isWithinSchedule(options.startsAt, options.endsAt);

    useEffect(() => {
        if (!eligible || popup.type !== 'category' || !popup.categorySlug) return undefined;
        let cancelled = false;
        api.get('/api/categories')
            .then((list) => { if (!cancelled) setCategory(list.find((c) => c.slug === popup.categorySlug) ?? null); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [eligible, popup.type, popup.categorySlug]);

    const key = contentKey(popup);
    useEffect(() => {
        if (!eligible) {
            setVisible(false);
            return undefined;
        }
        if (wasDismissed(key, popup.frequency)) return undefined;
        const timer = setTimeout(() => setVisible(true), Math.max(0, (popup.delaySeconds ?? 2) * 1000));
        return () => clearTimeout(timer);
    }, [eligible, key, popup.frequency, popup.delaySeconds]);

    if (!eligible || !visible) return null;

    const dismiss = () => {
        setVisible(false);
        markDismissed(key, popup.frequency);
    };

    return <PopupDialog popup={popup} product={product} category={category} onDismiss={dismiss} />;
}
