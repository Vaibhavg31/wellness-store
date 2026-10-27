import { useEffect, useState } from 'react';
import { Tag, Copy, ChevronRight } from 'lucide-react';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import Drawer from '@/components/ui/Drawer';

function couponDescription(coupon) {
    if (coupon.type === 'free_delivery') {
        const min = coupon.minOrderAmount > 0 ? ` on orders above ${formatPrice(coupon.minOrderAmount)}` : '';
        return `Free delivery${min}`;
    }
    if (coupon.type === 'flat') {
        return `${formatPrice(coupon.value)} off${coupon.minOrderAmount > 0 ? ` above ${formatPrice(coupon.minOrderAmount)}` : ''}`;
    }
    const cap = coupon.maxDiscount > 0 ? ` (max ${formatPrice(coupon.maxDiscount)})` : '';
    return `${coupon.value}% off${coupon.minOrderAmount > 0 ? ` above ${formatPrice(coupon.minOrderAmount)}` : ''}${cap}`;
}

export default function ActiveCoupons({ className = '', variant = 'default' }) {
    const [coupons, setCoupons] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { applyCoupon } = useCart();
    const { showToast } = useToast();

    useEffect(() => {
        api.get('/api/coupons/public')
            .then(setCoupons)
            .catch(() => setCoupons([]));
    }, []);

    if (coupons.length === 0) return null;

    const copyAndApply = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            /* ignore */
        }
        const result = await applyCoupon(code);
        showToast(result.valid ? `Applied ${code}` : (result.message || 'Could not apply'), result.valid ? 'success' : 'error');
        if (result.valid) setDrawerOpen(false);
    };

    const isSidebar = variant === 'sidebar';
    const preview = coupons[0];

    const couponList = (
        <div className="grid grid-cols-1 gap-3">
            {coupons.map((coupon) => (
                <button
                    key={coupon.id}
                    type="button"
                    onClick={() => copyAndApply(coupon.code)}
                    className="text-left w-full p-3.5 rounded-xl border border-line/50 hover:border-primary/40 hover:bg-primary/5 transition-all group bg-canvas/50"
                >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-mono text-sm font-semibold text-primary tracking-wider truncate">
                            {coupon.code}
                        </p>
                        <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent-ink font-medium flex-shrink-0 whitespace-nowrap">
                            {coupon.label}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-ink leading-snug">{coupon.title}</p>
                    <p className="text-sm text-muted mt-0.5 leading-relaxed">{couponDescription(coupon)}</p>
                    <p className="text-xs text-muted mt-2 flex items-center gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Copy size={11} className="flex-shrink-0" /> Tap to apply
                    </p>
                </button>
            ))}
        </div>
    );

    const trigger = (
        <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center gap-3 text-left group"
        >
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Tag size={16} className="text-primary" />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block font-display text-base text-ink">Available Offers</span>
                <span className="block text-sm text-muted mt-0.5 truncate">
                    {coupons.length} offer{coupons.length !== 1 ? 's' : ''}
                    {preview ? ` · ${preview.label}` : ''}
                </span>
            </span>
            <ChevronRight
                size={18}
                className="flex-shrink-0 text-muted group-hover:text-primary transition-colors"
            />
        </button>
    );

    const drawer = (
        <Drawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Available Offers"
            subtitle="Tap a coupon to apply it to your order"
        >
            {couponList}
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
