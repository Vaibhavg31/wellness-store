import { useEffect, useState } from 'react';
import { Tag, ChevronRight, Check } from 'lucide-react';
import { api } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import Drawer from '@/components/ui/Drawer';
import { couponConditions, couponPreview, couponTerms } from '@/utils/couponPreview';

/** One line saying what this coupon would do for the bag right now. */
function Status({ preview, applied }) {
    if (applied) return <p className="mt-2 flex items-center gap-1.5 text-caption font-semibold text-success"><Check size={13} aria-hidden="true" /> Applied to your order</p>;
    if (preview.status === 'ready') return <p className="mt-2 text-caption font-semibold text-success">{preview.saves > 0 ? `You would save ${formatPrice(preview.saves)} on this bag` : 'Works on this bag'}</p>;
    if (preview.status === 'short') return <p className="mt-2 text-caption font-medium text-accent-ink">Add {formatPrice(preview.gap)} more of regular-priced products to use it</p>;
    if (preview.status === 'blocked') return <p className="mt-2 text-caption font-medium text-accent-ink">Everything in your bag is on an offer price, so no coupon applies</p>;
    return null;
}

/**
 * "Coupons for you": the public coupons, each with its rules in plain words and what it would save on the shopper's own bag.
 * Coupons that are not listed (campaign codes sent by email or message) are typed into the coupon box instead.
 */
export default function ActiveCoupons({ className = '', variant = 'default' }) {
    const [coupons, setCoupons] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { applyCoupon, couponCode, subtotal, eligibleSubtotal } = useCart();
    const { showToast } = useToast();

    useEffect(() => {
        api.get('/api/coupons/public')
            .then(setCoupons)
            .catch(() => setCoupons([]));
    }, []);

    if (coupons.length === 0) return null;

    const apply = async (code) => {
        const result = await applyCoupon(code);
        showToast(result.valid ? (result.message || `Applied ${code}`) : (result.message || 'Could not apply'), result.valid ? 'success' : 'error');
        if (result.valid) setDrawerOpen(false);
    };

    const isSidebar = variant === 'sidebar';
    const bag = { subtotal, eligibleSubtotal };
    // Best first: the ones that work on this bag, biggest saving first.
    const ranked = coupons
        .map((coupon) => ({ coupon, preview: couponPreview(coupon, bag) }))
        .sort((a, b) => (b.preview.status === 'ready') - (a.preview.status === 'ready') || (b.preview.saves || 0) - (a.preview.saves || 0));
    const usable = ranked.filter((r) => r.preview.status === 'ready').length;

    const couponList = (
        <ul className="grid grid-cols-1 gap-3">
            {ranked.map(({ coupon, preview }) => {
                const applied = couponCode === coupon.code;
                const canApply = preview.status === 'ready' || preview.status === 'idle';
                return (
                    <li key={coupon.id} className={cn('rounded-xl border bg-surface p-4 transition-colors', applied ? 'border-success bg-success-tint' : 'border-line', !canApply && !applied && 'opacity-80')}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate font-mono text-small font-semibold tracking-wider text-primary">{coupon.code}</p>
                                <p className="mt-1 text-small font-semibold leading-snug text-ink">{couponTerms(coupon)}</p>
                                {coupon.title && coupon.title !== coupon.code && <p className="mt-0.5 text-caption text-muted">{coupon.title}</p>}
                            </div>
                            <button
                                type="button"
                                disabled={applied || !canApply}
                                onClick={() => apply(coupon.code)}
                                className="inline-flex h-10 shrink-0 items-center rounded-full border border-primary px-4 text-small font-semibold text-primary transition-colors hover:bg-primary-soft disabled:border-line disabled:text-subtle disabled:hover:bg-transparent"
                            >
                                {applied ? 'Applied' : 'Apply'}
                            </button>
                        </div>
                        <ul className="mt-2 space-y-0.5 text-caption text-muted">
                            {couponConditions(coupon).map((line) => <li key={line}>{line}</li>)}
                        </ul>
                        <Status preview={preview} applied={applied} />
                    </li>
                );
            })}
        </ul>
    );

    const trigger = (
        <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="group flex w-full items-center gap-3 text-left"
        >
            <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Tag size={16} className="text-primary" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-display text-base text-ink">Coupons for you</span>
                <span className="mt-0.5 block truncate text-sm text-muted">
                    {usable > 0 ? `${usable} coupon${usable !== 1 ? 's' : ''} you can use now` : `${coupons.length} coupon${coupons.length !== 1 ? 's' : ''} available`}
                </span>
            </span>
            <ChevronRight size={18} className="flex-shrink-0 text-muted transition-colors group-hover:text-primary" aria-hidden="true" />
        </button>
    );

    const drawer = (
        <Drawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Coupons for you"
            subtitle="One coupon per order, on regular-priced products"
        >
            {couponList}
            <p className="mt-4 rounded-xl bg-canvas-alt px-4 py-3 text-caption leading-snug text-muted">
                Offer boxes, Buy 1 Get 1 pairs and bundles already have their own price, so a coupon does not apply to them.
                Got a code by email or message? Type it in the coupon box at checkout.
            </p>
        </Drawer>
    );

    if (isSidebar) {
        return (
            <>
                <section className={`bg-canvas rounded-xl border border-line/40 shadow-sm p-4 sm:p-5 ${className}`}>
                    {trigger}
                </section>
                {drawer}
            </>
        );
    }

    return (
        <>
            <section className={className}>
                {trigger}
            </section>
            {drawer}
        </>
    );
}
