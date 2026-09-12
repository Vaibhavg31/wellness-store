import { createContext, useContext, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useLocalStorage } from '@/hooks';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '@/constants';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const CartContext = createContext(null);
const AUTO_SKIP_KEY = 'krivea-auto-coupon-skipped';

function maxQtyFor(product, requested) {
    const stock = typeof product?.stock === 'number' ? product.stock : Infinity;
    if (stock <= 0) return 0;
    return Math.min(Math.max(0, requested), stock);
}

export function CartProvider({ children }) {
    const [items, setItems] = useLocalStorage('krivea-cart', []);
    const [couponCode, setCouponCode] = useLocalStorage('krivea-coupon', '');
    const [couponState, setCouponState] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [cartPulse, setCartPulse] = useState(0);
    const [autoApplied, setAutoApplied] = useState(false);
    const manualCouponRef = useRef(false);
    const autoApplySkipRef = useRef(sessionStorage.getItem(AUTO_SKIP_KEY) === '1');
    const lastItemCountRef = useRef(0);
    // Shared sequence number so a slower, older validate/auto-apply response
    // (e.g. from rapid quantity changes) can never clobber a newer one's state.
    const couponRequestIdRef = useRef(0);
    const { content } = useSiteContent();
    const { token } = useAuth();
    const deliveryFeeAmount = content.delivery?.fee ?? DELIVERY_FEE;
    const freeThreshold = content.delivery?.freeThreshold ?? FREE_DELIVERY_THRESHOLD;

    const clearAutoSkip = useCallback(() => {
        autoApplySkipRef.current = false;
        sessionStorage.removeItem(AUTO_SKIP_KEY);
    }, []);

    const setAutoSkip = useCallback(() => {
        autoApplySkipRef.current = true;
        sessionStorage.setItem(AUTO_SKIP_KEY, '1');
    }, []);

    const addToCart = useCallback((product, quantity = 1) => {
        const qty = maxQtyFor(product, quantity);
        if (qty <= 0) return false;

        let added = false;
        setItems((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                const next = maxQtyFor(product, existing.quantity + quantity);
                added = next > existing.quantity;
                return prev.map((item) => {
                    if (item.product.id !== product.id) return item;
                    return { ...item, product: { ...item.product, ...product }, quantity: next };
                }).filter((item) => item.quantity > 0);
            }
            added = true;
            return [...prev, { product, quantity: qty }];
        });
        if (added) setCartPulse((n) => n + 1);
        return added;
    }, [setItems]);

    const syncPrices = useCallback(async () => {
        const current = items;
        if (current.length === 0) return;

        const results = await Promise.allSettled(
            current.map((item) => api.get(`/api/products/${item.product.id}`))
        );

        setItems((prev) => prev
            .map((item, i) => {
                const result = results[i];
                if (!result || result.status !== 'fulfilled' || !result.value) return item;
                const fresh = result.value;
                return {
                    ...item,
                    product: {
                        ...item.product,
                        price: fresh.price,
                        originalPrice: fresh.originalPrice,
                        discount: fresh.discount,
                        stock: fresh.stock,
                    },
                    quantity: maxQtyFor(fresh, item.quantity),
                };
            })
            .filter((item) => item.quantity > 0));
    }, [items, setItems]);

    const removeFromCart = useCallback((productId) => {
        setItems((prev) => prev.filter((item) => item.product.id !== productId));
    }, [setItems]);

    const updateQuantity = useCallback((productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setItems((prev) => prev.map((item) => {
            if (item.product.id !== productId) return item;
            return { ...item, quantity: maxQtyFor(item.product, quantity) };
        }).filter((item) => item.quantity > 0));
    }, [setItems, removeFromCart]);

    const clearCart = useCallback(() => {
        setItems([]);
        setCouponCode('');
        setCouponState(null);
        setAutoApplied(false);
        manualCouponRef.current = false;
        clearAutoSkip();
    }, [setItems, setCouponCode, clearAutoSkip]);

    const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items]);

    const baseDeliveryFee = subtotal >= freeThreshold ? 0 : deliveryFeeAmount;
    const discountAmount = couponState?.valid ? (couponState.breakdown?.discountAmount ?? 0) : 0;
    const deliveryFee = couponState?.valid
        ? (couponState.breakdown?.deliveryFee ?? baseDeliveryFee)
        : baseDeliveryFee;
    const total = couponState?.valid
        ? (couponState.breakdown?.total ?? subtotal + deliveryFee)
        : subtotal + baseDeliveryFee;

    const validateCoupon = useCallback(async (code, currentSubtotal = subtotal, { manual = false } = {}) => {
        const normalized = String(code || '').trim().toUpperCase();
        const requestId = ++couponRequestIdRef.current;

        if (!normalized) {
            setCouponState(null);
            setCouponCode('');
            setAutoApplied(false);
            return { valid: false, message: 'Enter a coupon code' };
        }

        setCouponLoading(true);
        try {
            const result = await api.post('/api/coupons/validate', { code: normalized, subtotal: currentSubtotal }, token || undefined);
            if (requestId !== couponRequestIdRef.current) return result; // superseded by a newer call — ignore

            if (result.valid) {
                setCouponCode(normalized);
                setCouponState(result);
                if (manual) {
                    manualCouponRef.current = true;
                    setAutoApplied(false);
                    clearAutoSkip();
                }
            } else {
                setCouponState(null);
                setCouponCode('');
                setAutoApplied(false);
            }
            return result;
        } catch (err) {
            if (requestId !== couponRequestIdRef.current) {
                return { valid: false, message: err instanceof Error ? err.message : 'Could not apply coupon' };
            }
            setCouponState(null);
            setCouponCode('');
            setAutoApplied(false);
            return { valid: false, message: err instanceof Error ? err.message : 'Could not apply coupon' };
        } finally {
            if (requestId === couponRequestIdRef.current) setCouponLoading(false);
        }
    }, [subtotal, token, setCouponCode, clearAutoSkip]);

    const applyCoupon = useCallback(async (code) => validateCoupon(code, subtotal, { manual: true }), [validateCoupon, subtotal]);

    const tryAutoApply = useCallback(async (currentSubtotal = subtotal) => {
        if (manualCouponRef.current || autoApplySkipRef.current || currentSubtotal <= 0) {
            return null;
        }

        const requestId = ++couponRequestIdRef.current;
        setCouponLoading(true);
        try {
            const result = await api.post('/api/coupons/auto-apply', { subtotal: currentSubtotal }, token || undefined);
            if (requestId !== couponRequestIdRef.current) return result; // superseded by a newer call — ignore

            if (result?.valid && result.coupon?.code) {
                const normalized = String(result.coupon.code).trim().toUpperCase();
                setCouponCode(normalized);
                setCouponState(result);
                setAutoApplied(true);
                return result;
            }
            return null;
        } catch {
            return null;
        } finally {
            if (requestId === couponRequestIdRef.current) setCouponLoading(false);
        }
    }, [subtotal, token, setCouponCode]);

    const removeCoupon = useCallback(() => {
        if (autoApplied) {
            setAutoSkip();
        } else {
            manualCouponRef.current = false;
        }
        setCouponCode('');
        setCouponState(null);
        setAutoApplied(false);
    }, [setCouponCode, autoApplied, setAutoSkip]);

    useEffect(() => {
        if (items.length === 0) {
            lastItemCountRef.current = 0;
            if (!couponCode) setCouponState(null);
            return;
        }

        if (items.length !== lastItemCountRef.current) {
            lastItemCountRef.current = items.length;
            if (autoApplySkipRef.current && !manualCouponRef.current) {
                clearAutoSkip();
            }
        }

        if (couponCode) {
            validateCoupon(couponCode, subtotal);
            return;
        }

        if (!manualCouponRef.current && !autoApplySkipRef.current) {
            tryAutoApply(subtotal);
        }
    }, [subtotal, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const isInCart = useCallback((productId) => items.some((item) => item.product.id === productId), [items]);

    const amountUntilFreeDelivery = Math.max(0, freeThreshold - subtotal);
    // Use the coupon-adjusted fee, not the pre-coupon base fee — otherwise a
    // free_delivery coupon shows "Delivery: FREE" right next to an upsell
    // nudging the customer to spend more to unlock free delivery.
    const showFreeDeliveryUpsell = deliveryFee > 0;
    const freeDeliveryProgress = freeThreshold > 0
        ? Math.min(100, Math.round((subtotal / freeThreshold) * 100))
        : 100;

    const value = useMemo(() => ({
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncPrices,
        itemCount,
        cartPulse,
        subtotal,
        deliveryFee,
        baseDeliveryFee,
        discountAmount,
        total,
        freeThreshold,
        amountUntilFreeDelivery,
        showFreeDeliveryUpsell,
        freeDeliveryProgress,
        isInCart,
        couponCode: couponState?.valid ? couponCode : '',
        couponDetails: couponState?.valid ? couponState.coupon : null,
        couponMessage: couponState?.message || '',
        couponLoading,
        autoAppliedCoupon: autoApplied,
        applyCoupon,
        removeCoupon,
    }), [
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncPrices,
        itemCount,
        cartPulse,
        subtotal,
        deliveryFee,
        baseDeliveryFee,
        discountAmount,
        total,
        freeThreshold,
        amountUntilFreeDelivery,
        showFreeDeliveryUpsell,
        freeDeliveryProgress,
        isInCart,
        couponState,
        couponCode,
        couponLoading,
        autoApplied,
        applyCoupon,
        removeCoupon,
    ]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context)
        throw new Error('useCart must be used within CartProvider');
    return context;
}
