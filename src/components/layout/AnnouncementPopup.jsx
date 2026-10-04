import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { X, Gift, PartyPopper, Sparkles, Copy, Check, LayoutGrid, Frown } from 'lucide-react';
import Button from '@/components/ui/Button';
import SpinWheel from '@/components/popup/SpinWheel';
import { useDialog } from '@/hooks/useDialog';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useProduct } from '@/hooks/useApi';
import { usePublicCoupons } from '@/hooks/usePublicCoupons';
import { api, imageUrl } from '@/services/api';
import { isWithinSchedule, popupAllowedOn } from '@/utils/popupSchedule';
import { spinCooldownActive, writeSpin } from '@/utils/spinStorage';
import { formatPrice } from '@/utils/formatPrice';

const TYPE_ICON = { coupon: Gift, festival: PartyPopper, product: Sparkles, category: LayoutGrid, info: Sparkles, spin: Gift };

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
        <button type="button" onClick={copy} className="flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed border-accent bg-accent-tint px-4 py-3 text-left transition-colors hover:bg-accent-tint/70">
            <span className="font-mono text-lead font-semibold tracking-wide text-ink">{code}</span>
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-primary-deep">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy code'}
            </span>
        </button>
    );
}

/** Dots that burst outwards once, for a win. Transform + opacity only. */
const CONFETTI = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const distance = 70 + (i % 3) * 22;
    return { dx: Math.round(Math.cos(angle) * distance), dy: Math.round(Math.sin(angle) * distance), delay: (i % 5) * 40, color: ['bg-primary', 'bg-accent', 'bg-primary-tint', 'bg-success'][i % 4] };
});

function Confetti() {
    return (
        <div className="pointer-events-none absolute left-1/2 top-12 size-0" aria-hidden="true">
            {CONFETTI.map((c, i) => (
                <span key={i} className={`absolute left-0 top-0 size-2 animate-confetti rounded-full ${c.color}`} style={{ '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, animationDelay: `${c.delay}ms` }} />
            ))}
        </div>
    );
}

/* ---------- Heroes: the top of the card, specific to each popup type ---------- */

function Hero({ popup, product, category, couponInfo }) {
    const Icon = TYPE_ICON[popup.type] ?? Sparkles;

    if (popup.image) {
        return <img src={imageUrl(popup.image)} alt="" width="384" height="176" className="h-44 w-full object-cover" />;
    }
    if (popup.type === 'product' && product?.images?.[0]) {
        return (
            <div className="relative">
                <img src={imageUrl(product.images[0], 600)} alt="" width="384" height="224" className="h-56 w-full bg-canvas-alt object-cover" />
                <span className="absolute bottom-3 left-3 rounded-full bg-surface px-3 py-1 text-small font-semibold text-primary-deep shadow-sm">{formatPrice(product.price)}</span>
            </div>
        );
    }
    if (popup.type === 'category' && category?.image) {
        return (
            <div className="relative">
                <img src={imageUrl(category.image, 600)} alt="" width="384" height="192" className="h-48 w-full bg-canvas-alt object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" aria-hidden="true" />
                <span className="absolute bottom-3 left-4 font-display text-h3 text-white">{category.label}</span>
            </div>
        );
    }
    if (popup.type === 'coupon') {
        return (
            <div className="relative grid h-32 place-items-center overflow-hidden bg-accent-tint text-center">
                <span className="absolute -left-6 -top-6 size-24 rounded-full bg-accent/30" aria-hidden="true" />
                <span className="absolute -bottom-8 -right-4 size-28 rounded-full bg-accent/25" aria-hidden="true" />
                <div className="relative">
                    <Gift size={22} className="mx-auto mb-1 text-accent-ink" aria-hidden="true" />
                    <p className="font-display text-h2 leading-none text-ink">{couponInfo?.label ?? 'Special offer'}</p>
                </div>
            </div>
        );
    }
    if (popup.type === 'festival') {
        return (
            <div className="relative grid h-32 place-items-center overflow-hidden bg-gradient-to-br from-primary to-primary-deep text-white">
                <span className="absolute left-6 top-4 size-3 rounded-full bg-accent" aria-hidden="true" />
                <span className="absolute bottom-5 right-10 size-4 rounded-full bg-accent/80" aria-hidden="true" />
                <span className="absolute right-6 top-6 size-2 rounded-full bg-white/70" aria-hidden="true" />
                <span className="absolute bottom-4 left-12 size-2 rounded-full bg-white/60" aria-hidden="true" />
                <PartyPopper size={40} aria-hidden="true" />
            </div>
        );
    }
    return (
        <div className="grid h-24 place-items-center bg-primary-tint text-primary">
            <Icon size={32} aria-hidden="true" />
        </div>
    );
}

/* ---------- Spin flow ---------- */

function pickLocally(segments) {
    const pool = segments.map((s, index) => ({ s, index })).filter(({ s }) => s.weight > 0);
    const total = pool.reduce((sum, { s }) => sum + s.weight, 0);
    let roll = Math.random() * total;
    const picked = pool.find(({ s }) => (roll -= s.weight) < 0) ?? pool[0];
    return { index: picked.index, label: picked.s.label, win: Boolean(picked.s.couponId), code: picked.s.couponId ? 'YOUR-CODE' : '' };
}

function SpinBody({ popup, segments, preview, onDismiss }) {
    const [result, setResult] = useState(null);

    const spin = async () => {
        if (preview) return pickLocally(segments); // admin preview: nothing is sent or stored
        return api.post('/api/spin', {});
    };
    const done = (outcome) => {
        if (!preview) writeSpin(outcome);
        setResult(outcome);
    };

    if (result) {
        return (
            <div className="relative p-6 text-center" role="status">
                {result.win ? (
                    <>
                        <Confetti />
                        <span className="mx-auto mb-3 grid size-14 animate-pop place-items-center rounded-full bg-accent-tint text-accent-ink"><Gift size={26} aria-hidden="true" /></span>
                        <h2 className="mb-1 text-h3">You won {result.label}!</h2>
                        <p className="mb-5 text-small text-muted">Copy this code and use it at checkout.</p>
                        <div className="mb-5"><CouponRow code={result.code} /></div>
                        <Link to={popup.ctaHref || '/shop'} onClick={onDismiss} className="block"><Button className="w-full">{popup.ctaLabel || 'Start shopping'}</Button></Link>
                    </>
                ) : (
                    <>
                        <span className="mx-auto mb-3 grid size-14 animate-pop place-items-center rounded-full bg-canvas-alt text-muted"><Frown size={26} aria-hidden="true" /></span>
                        <h2 className="mb-1 text-h3">Better luck next time</h2>
                        <p className="mb-5 text-small text-muted">No prize on this spin, but there is plenty to explore. Come back for another try soon.</p>
                        <Link to="/shop" onClick={onDismiss} className="block"><Button variant="outline" className="w-full">Continue shopping</Button></Link>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="px-6 pb-6 pt-8 text-center">
            <h2 className="mb-1 text-h3">{popup.title}</h2>
            <p className="mb-6 text-small text-muted">{popup.message}</p>
            <SpinWheel segments={segments} onSpin={spin} onDone={done} />
        </div>
    );
}

/* ---------- The dialog ---------- */

/** The popup card itself; also used by the admin "Preview popup" button. */
export function PopupDialog({ popup, product = null, category = null, segments = [], preview = false, onDismiss }) {
    const panelRef = useDialog(true, onDismiss);
    const coupons = usePublicCoupons();
    const isSpin = popup.type === 'spin';
    const couponInfo = popup.type === 'coupon' ? coupons.find((c) => c.code === popup.couponCode) : null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto px-4 py-6">
            <div className="fixed inset-0 animate-fade-in bg-ink/60" onClick={onDismiss} aria-hidden="true" />
            <div ref={panelRef} role="dialog" aria-modal="true" aria-label={popup.title} tabIndex={-1} className="relative my-auto w-full max-w-sm animate-fade-up overflow-hidden rounded-xl bg-surface shadow-lg focus:outline-none">
                <button type="button" onClick={onDismiss} aria-label="Close" className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-xs hover:bg-surface">
                    <X size={16} />
                </button>

                {isSpin ? (
                    <SpinBody popup={popup} segments={segments} preview={preview} onDismiss={onDismiss} />
                ) : (
                    <>
                        <Hero popup={popup} product={product} category={category} couponInfo={couponInfo} />
                        <div className="p-6">
                            <h2 className="mb-2 text-h3">{popup.title}</h2>
                            <p className="mb-5 text-small text-muted">{popup.message}</p>

                            {popup.type === 'coupon' && popup.couponCode && (
                                <div className="mb-5">
                                    <CouponRow code={popup.couponCode} />
                                    {couponInfo && <p className="mt-2 text-center text-caption text-muted">{couponInfo.description}{couponInfo.minOrderAmount > 0 ? ` · orders above ${formatPrice(couponInfo.minOrderAmount)}` : ''}</p>}
                                </div>
                            )}

                            {popup.type === 'product' && product && (
                                <Link to={`/product/${product.id}`} onClick={onDismiss} className="mb-5 block rounded-lg border border-line p-3 transition-colors hover:border-primary">
                                    <span className="block truncate text-small font-medium text-ink">{product.title}</span>
                                    <span className="block text-caption text-muted">Tap to view details</span>
                                </Link>
                            )}

                            {popup.type === 'category' && category && !category.image && (
                                <Link to={`/category/${category.slug}`} onClick={onDismiss} className="mb-5 block rounded-lg border border-line p-3 transition-colors hover:border-primary">
                                    <span className="block truncate text-small font-medium text-ink">{category.label}</span>
                                    <span className="block text-caption text-muted">Browse the collection</span>
                                </Link>
                            )}

                            {popup.ctaLabel && popup.ctaHref && (
                                <Link to={popup.ctaHref} onClick={onDismiss} className="block">
                                    <Button className="w-full">{popup.ctaLabel}</Button>
                                </Link>
                            )}
                        </div>
                    </>
                )}
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
    const segments = content.extras.spin.segments;
    const popup = { ...content.popup, categorySlug: options.categorySlug };
    const [visible, setVisible] = useState(false);
    const [category, setCategory] = useState(null);
    const { product } = useProduct(popup.type === 'product' ? popup.productId : null);

    const spinUnavailable = popup.type === 'spin' && (segments.length < 2 || spinCooldownActive(content.extras.spin.cooldownDays));
    // routeOk: the popup may be on screen right now. canStart: it may newly appear (a used-up spin may not, but a
    // result the visitor is still looking at stays up until they close it).
    const routeOk = Boolean(popup.enabled)
        && popupAllowedOn(pathname, options.pages, ADMIN_PATH)
        && isWithinSchedule(options.startsAt, options.endsAt);
    const canStart = routeOk && !spinUnavailable;

    useEffect(() => {
        if (!routeOk || popup.type !== 'category' || !popup.categorySlug) return undefined;
        let cancelled = false;
        api.get('/api/categories')
            .then((list) => { if (!cancelled) setCategory(list.find((c) => c.slug === popup.categorySlug) ?? null); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [routeOk, popup.type, popup.categorySlug]);

    const key = contentKey(popup);
    useEffect(() => {
        if (!routeOk) {
            setVisible(false);
            return undefined;
        }
        if (visible || !canStart || wasDismissed(key, popup.frequency)) return undefined;
        const timer = setTimeout(() => setVisible(true), Math.max(0, (popup.delaySeconds ?? 2) * 1000));
        return () => clearTimeout(timer);
    }, [routeOk, canStart, visible, key, popup.frequency, popup.delaySeconds]);

    if (!routeOk || !visible) return null;

    const dismiss = () => {
        setVisible(false);
        markDismissed(key, popup.frequency);
    };

    return <PopupDialog popup={popup} product={product} category={category} segments={segments} onDismiss={dismiss} />;
}
