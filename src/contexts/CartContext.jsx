import { createContext, useContext, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useLocalStorage } from '@/hooks';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '@/constants';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const CartContext = createContext(null);
const AUTO_SKIP_KEY = 'chikit-auto-coupon-skipped';

function maxQtyFor(product, requested) {
    const stock = typeof product?.stock === 'number' ? product.stock : Infinity;
    if (stock <= 0) return 0;
    return Math.min(Math.max(0, requested), stock);
}

/**
 * Products with pack-size/duration variants (e.g. "1/3/6 Month Supply") need
 * a specific variant selected before they can be priced or stocked — callers
 * that already picked one (ProductDetailPage) pass `product.variantId`;
 * callers that don't (ProductCard's quick-add) fall back to the default.
 * Returns `product` unchanged when it has no variants at all.
 */
function resolveCartProduct(product) {
    if (!product?.hasVariants || !Array.isArray(product.variants) || product.variants.length === 0) {
        return product;
    }
    const variant = (product.variantId && product.variants.find((v) => v.id === product.variantId))
        || product.variants.find((v) => v.isDefault)
        || product.variants[0];

    return {
        ...product,
        variantId: variant.id,
        variantLabel: variant.label,
        title: `${product.title} — ${variant.label}`,
        price: variant.price,
        originalPrice: variant.originalPrice,
        discount: variant.discount,
        stock: variant.stock,
        images: variant.image ? [variant.image, ...(product.images || [])] : product.images,
    };
}

const sameLine = (a, b) =>
    a.id === b.id
    && (a.variantId || null) === (b.variantId || null)
    && (a.bundleId || null) === (b.bundleId || null);

/**
 * A bundle's discount is spread across its items proportionally to each
 * item's own price, so the sum of line prices always equals the bundle's
 * total — mirrors BundleRepository::priceForProduct on the backend exactly,
 * which is what actually gets charged; this is only for display/local state.
 */
function bundleItemUnitPrice(bundle, productId) {
    const item = bundle.items?.find((i) => i.productId === productId);
    if (!item) return 0;
    const { subtotal, bundlePrice } = bundle.pricing || {};
    if (!subtotal) return item.product.price;
    return Math.round(item.product.price * (bundlePrice / subtotal) * 100) / 100;
}

export function CartProvider({ children }) {
    const [items, setItems] = useLocalStorage('chikit-cart', []);
    const [couponCode, setCouponCode] = useLocalStorage('chikit-coupon', '');
    const [couponState, setCouponState] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [cartPulse, setCartPulse] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

    const openCartDrawer = useCallback(() => setIsDrawerOpen(true), []);
    const closeCartDrawer = useCallback(() => setIsDrawerOpen(false), []);

    const clearAutoSkip = useCallback(() => {
        autoApplySkipRef.current = false;
        sessionStorage.removeItem(AUTO_SKIP_KEY);
    }, []);

    const setAutoSkip = useCallback(() => {
        autoApplySkipRef.current = true;
        sessionStorage.setItem(AUTO_SKIP_KEY, '1');
    }, []);

    const addToCart = useCallback((rawProduct, quantity = 1) => {
        const product = resolveCartProduct(rawProduct);
        const qty = maxQtyFor(product, quantity);
        if (qty <= 0) return false;

        let added = false;
        setItems((prev) => {
            const existing = prev.find((item) => sameLine(item.product, product));
            if (existing) {
                const next = maxQtyFor(product, existing.quantity + quantity);
                added = next > existing.quantity;
                return prev.map((item) => {
                    if (!sameLine(item.product, product)) return item;
                    return { ...item, product: { ...item.product, ...product }, quantity: next };
                }).filter((item) => item.quantity > 0);
            }
            added = true;
            return [...prev, { product, quantity: qty }];
        });
        if (added) setCartPulse((n) => n + 1);
        return added;
    }, [setItems]);

    /**
     * Adds every product in a bundle as one atomic action, each line priced
     * at its share of the bundle discount and tagged with bundleId so it's
     * grouped and removed together in the cart UI — never merges with a
     * plain (non-bundle) line of the same product. Bundle lines have a fixed
     * quantity (no per-line +/- stepper) since a bundle is one unit; adding
     * the same bundle twice is a no-op (use the stepper on the plain
     * product instead if more units are wanted).
     */
    const addBundleToCart = useCallback((bundle) => {
        if (!bundle?.items?.length) return false;
        if (items.some((item) => item.product.bundleId === bundle.id)) return false;
        if (bundle.items.some((bi) => (bi.product.stock ?? 0) < bi.quantity)) return false;

        const newLines = bundle.items.map((bi) => ({
            product: {
                id: bi.productId,
                title: bi.product.title,
                images: [bi.product.image],
                category: '',
                price: bundleItemUnitPrice(bundle, bi.productId),
                originalPrice: bi.product.price,
                stock: bi.product.stock,
                bundleId: bundle.id,
                bundleTitle: bundle.title,
            },
            quantity: bi.quantity,
        }));

        setItems((prev) => [...prev, ...newLines]);
        setCartPulse((n) => n + 1);
        return true;
    }, [items, setItems]);

    const removeBundleFromCart = useCallback((bundleId) => {
        setItems((prev) => prev.filter((item) => item.product.bundleId !== bundleId));
    }, [setItems]);

    const isBundleInCart = useCallback(
        (bundleId) => items.some((item) => item.product.bundleId === bundleId),
        [items],
    );

    const syncPrices = useCallback(async () => {
        const current = items;
        if (current.length === 0) return;

        // Bundle lines are priced as a share of the bundle's discount, not
        // the plain product price — re-fetching /api/products/:id here would
        // silently overwrite that discount with the full price. Checkout
        // re-validates bundle pricing/stock authoritatively anyway, so it's
        // safe to leave these as-is for a soft cart-display refresh.
        const syncable = current.filter((item) => !item.product.bundleId);
        if (syncable.length === 0) return;

        const results = await Promise.allSettled(
            syncable.map((item) => api.get(`/api/products/${item.product.id}`))
        );
        const resultByLine = new Map(syncable.map((item, i) => [item, results[i]]));

        setItems((prev) => prev
            .map((item) => {
                if (item.product.bundleId) return item;
                const result = resultByLine.get(item);
                if (!result || result.status !== 'fulfilled' || !result.value) return item;
                const fresh = result.value;
                // A variant line must re-price off that specific variant, not
                // the product's own (default-variant) price/stock — a fresh
                // fetch otherwise silently swaps a "3 Month" line to "1 Month"
                // pricing.
                const freshVariant = item.product.variantId && Array.isArray(fresh.variants)
                    ? fresh.variants.find((v) => v.id === item.product.variantId)
                    : null;
                if (item.product.variantId && !freshVariant) {
                    // That variant no longer exists — drop the line rather
                    // than silently re-price it against the wrong option.
                    return { ...item, quantity: 0 };
                }
                const source = freshVariant || fresh;
                return {
                    ...item,
                    product: {
                        ...item.product,
                        price: source.price,
                        originalPrice: source.originalPrice,
                        discount: source.discount,
                        stock: source.stock,
                    },
                    quantity: maxQtyFor(source, item.quantity),
                };
            })
            .filter((item) => item.quantity > 0));
    }, [items, setItems]);

    const removeFromCart = useCallback((productId, { variantId = null, bundleId = null } = {}) => {
        setItems((prev) => prev.filter((item) => !sameLine(item.product, { id: productId, variantId, bundleId })));
    }, [setItems]);

    const updateQuantity = useCallback((productId, quantity, { variantId = null, bundleId = null } = {}) => {
        if (quantity <= 0) {
            removeFromCart(productId, { variantId, bundleId });
            return;
        }
        setItems((prev) => prev.map((item) => {
            if (!sameLine(item.product, { id: productId, variantId, bundleId })) return item;
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

    const isInCart = useCallback((productId, { variantId = null, bundleId = null } = {}) =>
        items.some((item) => sameLine(item.product, { id: productId, variantId, bundleId })), [items]);

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
        addBundleToCart,
        removeBundleFromCart,
        isBundleInCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncPrices,
        itemCount,
        cartPulse,
        isDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
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
        addBundleToCart,
        removeBundleFromCart,
        isBundleInCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncPrices,
        itemCount,
        cartPulse,
        isDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
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
