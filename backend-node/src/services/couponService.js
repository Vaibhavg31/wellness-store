import { CouponRepository } from '../repositories/couponRepository.js';
import { OrderRepository } from '../repositories/orderRepository.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';

/** Mirrors backend/lib/CouponService.php exactly (discount math, eligibility, audience rules). */
export class CouponService {
    static TYPES = ['percent', 'flat', 'free_delivery'];
    static AUDIENCES = ['everyone', 'new_customers', 'returning_customers'];

    constructor() {
        this.coupons = new CouponRepository();
        this.orders = new OrderRepository();
        this.settings = new SettingsRepository();
    }

    static normalizeCode(code) {
        return String(code).toUpperCase().trim();
    }

    async deliverySettings() {
        const settings = await this.settings.get();
        const delivery = settings.delivery || {};
        return { fee: Number(delivery.fee ?? 99), freeThreshold: Number(delivery.freeThreshold ?? 1999) };
    }

    /**
     * Coupons only reduce regular-priced products. Lines already priced by an offer (Buy 1 Get 1, Pick & Mix) or a bundle are
     * left out, so a deal is never discounted twice. "Eligible" is what is left for a coupon to discount (the whole bag by default).
     */
    static eligibleSubtotalOf(items) {
        const sum = (items || []).filter((i) => !i.bundleId && !i.offerId).reduce((t, i) => t + Number(i.price) * Number(i.quantity), 0);
        return Math.round(sum * 100) / 100;
    }

    static cleanAmounts(subtotal, eligibleSubtotal) {
        const full = Math.round(Math.max(0, Number(subtotal) || 0) * 100) / 100;
        const eligible = Number(eligibleSubtotal);
        if (eligibleSubtotal === undefined || eligibleSubtotal === null || !Number.isFinite(eligible)) return { full, eligible: full };
        return { full, eligible: Math.round(Math.min(full, Math.max(0, eligible)) * 100) / 100 };
    }

    async resolveAutoApply(rawSubtotal, userId = null, rawEligible = undefined) {
        const { full: subtotal, eligible } = CouponService.cleanAmounts(rawSubtotal, rawEligible);
        if (subtotal <= 0) return null;

        let best = null;
        let bestSavings = -1;

        for (const coupon of await this.coupons.getAutoApply()) {
            if ((await this.eligibilityError(coupon, subtotal, userId, eligible)) !== null) continue;

            const breakdown = await this.calculateBreakdown(subtotal, coupon, eligible);
            let savings = Number(breakdown.discountAmount || 0);
            if (breakdown.freeDeliveryFromCoupon && breakdown.deliveryFee <= 0) {
                const delivery = await this.deliverySettings();
                savings += delivery.fee;
            }

            if (savings > bestSavings) {
                bestSavings = savings;
                best = {
                    valid: true,
                    message: this.successMessage(coupon, breakdown),
                    coupon: this.publicCouponShape(coupon),
                    breakdown,
                    autoApplied: true,
                };
            }
        }

        return best;
    }

    async validate(code, rawSubtotal, userId = null, rawEligible = undefined) {
        const { full: subtotal, eligible } = CouponService.cleanAmounts(rawSubtotal, rawEligible);
        const normalized = CouponService.normalizeCode(code);
        if (!normalized) return { valid: false, message: 'Enter a coupon code' };

        const coupon = await this.coupons.findByCode(normalized);
        if (!coupon) return { valid: false, message: 'That code is not valid. Please check it and try again.' };

        const error = await this.eligibilityError(coupon, subtotal, userId, eligible);
        if (error !== null) return { valid: false, message: error };

        const breakdown = await this.calculateBreakdown(subtotal, coupon, eligible);
        return { valid: true, message: this.successMessage(coupon, breakdown), coupon: this.publicCouponShape(coupon), breakdown };
    }

    async calculateBreakdown(rawSubtotal, coupon, rawEligible = undefined) {
        const delivery = await this.deliverySettings();
        const { full: subtotal, eligible } = CouponService.cleanAmounts(rawSubtotal, rawEligible);

        const type = coupon.type || 'percent';
        const value = Number(coupon.value || 0);
        const maxDiscount = Number(coupon.maxDiscount || 0);

        let discountAmount = 0;
        let uncapped = 0;
        const freeDeliveryFromThreshold = subtotal >= delivery.freeThreshold;
        const freeDeliveryFromCoupon = type === 'free_delivery';

        if (type === 'percent') {
            discountAmount = Math.round((eligible * value / 100) * 100) / 100;
            uncapped = discountAmount;
            if (maxDiscount > 0) discountAmount = Math.min(discountAmount, maxDiscount);
            discountAmount = Math.min(discountAmount, eligible);
        } else if (type === 'flat') {
            discountAmount = Math.min(value, eligible);
        }

        let deliveryFee = delivery.fee;
        if (freeDeliveryFromThreshold || freeDeliveryFromCoupon) deliveryFee = 0;

        const total = Math.round(Math.max(0, subtotal - discountAmount + deliveryFee) * 100) / 100;

        return {
            subtotal,
            discountAmount: Math.round(discountAmount * 100) / 100,
            deliveryFee: Math.round(deliveryFee * 100) / 100,
            total,
            freeDeliveryFromThreshold,
            freeDeliveryFromCoupon,
            couponType: type,
            couponValue: value,
            // What the coupon touched: it discounts the eligible part only, up to maxDiscount. The storefront shows this plainly.
            eligibleSubtotal: eligible,
            excludedSubtotal: Math.round((subtotal - eligible) * 100) / 100,
            maxDiscount,
            capped: type === 'percent' && maxDiscount > 0 && uncapped > maxDiscount,
        };
    }

    async enrichWithStats(coupon) {
        const stats = await this.statsForCoupon(coupon.code || '');
        return { ...coupon, stats };
    }

    async statsForCoupon(code) {
        const normalized = CouponService.normalizeCode(code);
        const stats = await this.orders.statsForCoupon(normalized);

        let totalDiscountGiven = stats.totalDiscountGiven;
        if (stats.freeDeliveryOrdersMissingSavedAmount > 0) {
            totalDiscountGiven += stats.freeDeliveryOrdersMissingSavedAmount * (await this.deliverySettings()).fee;
        }

        return {
            totalOrders: stats.totalOrders,
            uniqueCustomers: stats.uniqueCustomers,
            totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
            totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
        };
    }

    async recordUsage(couponId) { return this.coupons.incrementUsage(couponId); }
    async releaseUsage(couponId) { return this.coupons.decrementUsage(couponId); }

    async eligibilityError(coupon, subtotal, userId, eligibleSubtotal = subtotal) {
        if (!coupon.isEnabled) return 'This coupon is no longer active';

        const now = Date.now();
        const startsAt = String(coupon.startsAt || '').trim();
        if (startsAt) {
            const startTs = new Date(startsAt).getTime();
            if (!Number.isNaN(startTs) && now < startTs) return 'This coupon is not active yet';
        }

        const expiresAt = String(coupon.expiresAt || '').trim();
        if (expiresAt) {
            const endTs = new Date(expiresAt).getTime();
            if (!Number.isNaN(endTs) && now > endTs) return 'This coupon has expired';
        }

        const type = coupon.type || 'percent';
        const reduces = type === 'percent' || type === 'flat';
        if (reduces && subtotal > 0 && eligibleSubtotal <= 0) {
            return 'Coupons work on regular-priced products only. Everything in your bag is already on an offer or bundle price.';
        }
        // The minimum counts only what the coupon can discount (a free-delivery coupon looks at the whole bag).
        const minOrder = Number(coupon.minOrderAmount || 0);
        const counted = reduces ? eligibleSubtotal : subtotal;
        if (minOrder > 0 && counted < minOrder) {
            const gap = Math.ceil(minOrder - counted);
            return reduces && subtotal > eligibleSubtotal
                ? `Add ₹${gap} more of regular-priced products to use this coupon (offer and bundle items do not count).`
                : `Add ₹${gap} more to use this coupon. It needs an order of at least ₹${Math.round(minOrder)}.`;
        }

        const maxUses = Number(coupon.maxUses || 0);
        const usageCount = Number(coupon.usageCount || 0);
        if (maxUses > 0 && usageCount >= maxUses) return 'This coupon has reached its usage limit';

        if (userId) {
            const maxPerUser = Number(coupon.maxUsesPerUser || 0);
            if (maxPerUser > 0) {
                const userUses = await this.countUserUses(coupon.code || '', userId);
                if (userUses >= maxPerUser) return 'You have already used this coupon';
            }
        }

        return this.audienceError(coupon, userId);
    }

    /**
     * Whether a coupon is still worth showing this shopper in "Coupons for you": not expired, not used up, not already used the most times
     * they may, and meant for them (a first-order coupon is hidden once they have ordered). The bag is not looked at here, so a coupon that
     * only needs a bigger bag still shows, with what is missing. A guest who would need to sign in still sees it.
     */
    async listableFor(coupon, userId) {
        const reason = await this.eligibilityError(coupon, 1e9, userId, 1e9);
        return !reason || (!userId && reason.startsWith('Sign in'));
    }

    async audienceError(coupon, userId) {
        const audience = coupon.audience || 'everyone';
        if (audience === 'everyone') return null;

        const signedIn = Boolean(userId);

        if (audience === 'new_customers') {
            if (signedIn && (await this.orders.countNonCancelledOrders(userId)) > 0) {
                return 'This offer is for new customers only';
            }
            return null;
        }

        if (audience === 'returning_customers') {
            if (!signedIn) return "Sign in to use this offer — it's for returning customers";
            const minOrders = Math.max(1, Number(coupon.minPreviousOrders ?? 1));
            if ((await this.orders.countNonCancelledOrders(userId)) < minOrders) {
                return minOrders > 1 ? `This offer unlocks after ${minOrders} orders with us` : 'This offer is for returning customers only';
            }
            return null;
        }

        return null;
    }

    async countUserUses(code, userId) {
        return this.orders.countUsagesOfCouponByUser(CouponService.normalizeCode(code), userId, '');
    }

    successMessage(coupon, breakdown) {
        const type = coupon.type || 'percent';
        const value = Number(coupon.value || 0);

        if (type === 'free_delivery') return 'Free delivery applied!';
        const saved = Math.round(breakdown.discountAmount);
        if (type === 'flat') return `You save ₹${saved} with this coupon`;
        if (breakdown.discountAmount > 0) {
            return breakdown.capped
                ? `${Math.round(value)}% off, capped at ₹${Math.round(breakdown.maxDiscount)}. You save ₹${saved}`
                : `${Math.round(value)}% off. You save ₹${saved}`;
        }
        return 'Coupon applied successfully';
    }

    publicCouponShape(coupon) {
        return {
            id: coupon.id || '',
            code: coupon.code || '',
            title: coupon.title || '',
            description: coupon.description || '',
            type: coupon.type || 'percent',
            value: Number(coupon.value || 0),
            minOrderAmount: Number(coupon.minOrderAmount || 0),
            maxDiscount: Number(coupon.maxDiscount || 0),
            label: CouponService.labelFor(coupon),
        };
    }

    static labelFor(coupon) {
        const type = coupon.type || 'percent';
        const value = Number(coupon.value || 0);
        return type === 'free_delivery' ? 'Free Delivery' : type === 'flat' ? `₹${Math.round(value)} OFF` : `${Math.round(value)}% OFF`;
    }

    publicListShape(coupon) {
        const type = coupon.type || 'percent';
        const value = Number(coupon.value || 0);
        const label = CouponService.labelFor(coupon);

        return {
            id: coupon.id || '',
            code: coupon.code || '',
            title: coupon.title || '',
            description: coupon.description || '',
            type,
            value,
            label,
            minOrderAmount: Number(coupon.minOrderAmount || 0),
            maxDiscount: Number(coupon.maxDiscount || 0),
        };
    }
}
