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

    async resolveAutoApply(subtotal, userId = null) {
        subtotal = Math.round(Math.max(0, subtotal) * 100) / 100;
        if (subtotal <= 0) return null;

        let best = null;
        let bestSavings = -1;

        for (const coupon of await this.coupons.getAutoApply()) {
            if ((await this.eligibilityError(coupon, subtotal, userId)) !== null) continue;

            const breakdown = await this.calculateBreakdown(subtotal, coupon);
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

    async validate(code, subtotal, userId = null) {
        const normalized = CouponService.normalizeCode(code);
        if (!normalized) return { valid: false, message: 'Enter a coupon code' };

        const coupon = await this.coupons.findByCode(normalized);
        if (!coupon) return { valid: false, message: 'Invalid coupon code' };

        const error = await this.eligibilityError(coupon, subtotal, userId);
        if (error !== null) return { valid: false, message: error };

        const breakdown = await this.calculateBreakdown(subtotal, coupon);
        return { valid: true, message: this.successMessage(coupon, breakdown), coupon: this.publicCouponShape(coupon), breakdown };
    }

    async calculateBreakdown(subtotal, coupon) {
        const delivery = await this.deliverySettings();
        subtotal = Math.round(Math.max(0, subtotal) * 100) / 100;

        const type = coupon.type || 'percent';
        const value = Number(coupon.value || 0);

        let discountAmount = 0;
        const freeDeliveryFromThreshold = subtotal >= delivery.freeThreshold;
        const freeDeliveryFromCoupon = type === 'free_delivery';

        if (type === 'percent') {
            discountAmount = Math.round((subtotal * value / 100) * 100) / 100;
            const maxDiscount = Number(coupon.maxDiscount || 0);
            if (maxDiscount > 0) discountAmount = Math.min(discountAmount, maxDiscount);
            discountAmount = Math.min(discountAmount, subtotal);
        } else if (type === 'flat') {
            discountAmount = Math.min(value, subtotal);
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

    async eligibilityError(coupon, subtotal, userId) {
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

        const minOrder = Number(coupon.minOrderAmount || 0);
        if (minOrder > 0 && subtotal < minOrder) return `Minimum order of ₹${Math.round(minOrder)} required for this coupon`;

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
        if (type === 'flat') return `₹${Math.round(value)} off applied!`;
        if (breakdown.discountAmount > 0) return `${Math.round(value)}% off applied. You save ₹${Math.round(breakdown.discountAmount)}`;
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
        };
    }

    publicListShape(coupon) {
        const type = coupon.type || 'percent';
        const value = Number(coupon.value || 0);
        const label = type === 'free_delivery' ? 'Free Delivery' : type === 'flat' ? `₹${Math.round(value)} OFF` : `${Math.round(value)}% OFF`;

        return {
            id: coupon.id || '',
            code: coupon.code || '',
            title: coupon.title || '',
            description: coupon.description || '',
            type,
            value,
            label,
            minOrderAmount: Number(coupon.minOrderAmount || 0),
        };
    }
}
