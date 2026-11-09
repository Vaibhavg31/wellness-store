import { createContext, useContext, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useLocalStorage } from '@/hooks';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '@/constants';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { trackEvent } from '@/utils/analytics';
import { bogoUnitPrice, mixBoxPricing, repriceMixBoxes } from '@/utils/pricing';

const CartContext = createContext(null);
const AUTO_SKIP_KEY = 'chikit-auto-coupon-skipped';
const PENDING_COUPON_KEY = 'chikit-pending-coupon';

/** The part of the bag a coupon can discount: regular-priced lines (not Buy 1 Get 1, Pick & Mix or bundle lines, which carry their own deal). */
export const couponEligibleSubtotal = (items) => Math.round(items.filter(({ product }) => !product.bundleId && !product.offerId).reduce((sum, { product, quantity }) => sum + product.price * quantity, 0) * 100) / 100;

/** The most of one item a shopper can put in the bag (a Buy 1 Get 1 line counts the free ones too, so it holds twice as many units). */
export const MAX_PER_ITEM = 9;
const capFor = (product) => (product?.offerKind === 'bogo' ? MAX_PER_ITEM * 2 : MAX_PER_ITEM);

function maxQtyFor(product, requested) {
    const stock = typeof product?.stock === 'number' ? product.stock : Infinity;
    if (stock <= 0) return 0;
    return Math.min(Math.max(0, requested), stock, capFor(product));
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
        memberPrice: variant.memberPrice ?? null,
        images: variant.image ? [variant.image, ...(product.images || [])] : product.images,
    };
}

/**
 * A plain line (not a bundle, not on an offer page) is charged the Chikit Club member price for members and the shown
 * price for everyone else. Both are kept on the line so it flips the moment someone signs in or out.
 */
function withMembership(product, isMember) {
    if (product.bundleId || product.offerId) return product;
    const listPrice = product.listPrice ?? product.price;
    const price = isMember && product.memberPrice && product.memberPrice < listPrice ? product.memberPrice : listPrice;
    return { ...product, listPrice, price };
}

/** Buy 1 Get 1 pairs and Pick & Mix boxes move in whole units: pairs of two, boxes all together. */
const stepFor = (product) => (product.offerKind === 'bogo' ? 2 : 1);

const sameLine = (a, b) =>
    a.id === b.id
    && (a.variantId || null) === (b.variantId || null)
    && (a.bundleId || null) === (b.bundleId || null)
    && (a.offerId || null) === (b.offerId || null)
    && (a.offerGroup || null) === (b.offerGroup || null);

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
    // Why the coupon in the bag stopped applying (shown once, so it never just disappears without a word).
    const [couponNotice, setCouponNotice] = useState('');
    // "X is no longer available…": set when a refresh finds a product the shop removed (see syncPrices).
    const [bagNotice, setBagNotice] = useState('');
    const dismissBagNotice = useCallback(() => setBagNotice(''), []);
    const [cartPulse, setCartPulse] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [autoApplied, setAutoApplied] = useState(false);
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const manualCouponRef = useRef(false);
    const autoApplySkipRef = useRef(sessionStorage.getItem(AUTO_SKIP_KEY) === '1');
    const lastItemCountRef = useRef(0);
    // Shared sequence number so a slower, older validate/auto-apply response
    // (e.g. from rapid quantity changes) can never clobber a newer one's state.
    const couponRequestIdRef = useRef(0);
    const { content } = useSiteContent();
    const { token, user } = useAuth();
    const isMember = Boolean(token && user?.club?.member);
    const deliveryFeeAmount = content.delivery?.fee ?? DELIVERY_FEE;
    const freeThreshold = content.delivery?.freeThreshold ?? FREE_DELIVERY_THRESHOLD;

    const openCartDrawer = useCallback(() => {
        trackEvent('cart_open', { path: window.location.pathname });
        setIsDrawerOpen(true);
    }, []);
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
        const product = withMembership(resolveCartProduct(rawProduct), isMember);
        const qty = maxQtyFor(product, quantity);
        if (qty <= 0) return false;

        // Work out the result from the latest bag first (React runs state updaters later, so a flag set inside one
        // is not reliable to return), and keep the ref current so several adds in one tick all see each other.
        const prev = itemsRef.current;
        const existing = prev.find((item) => sameLine(item.product, product));
        let next;
        let added;
        let addedQty = qty;
        if (existing) {
            const nextQty = maxQtyFor(product, existing.quantity + quantity);
            added = nextQty > existing.quantity;
            addedQty = nextQty - existing.quantity;
            next = prev.map((item) => {
                if (!sameLine(item.product, product)) return item;
                return { ...item, product: { ...item.product, ...product }, quantity: nextQty };
            }).filter((item) => item.quantity > 0);
        } else {
            added = true;
            next = [...prev, { product, quantity: qty }];
        }
        if (added) {
            itemsRef.current = next;
            setItems(next);
            setCartPulse((n) => n + 1);
            trackEvent('add_to_cart', { productId: product.id, value: product.price * addedQty, qty: addedQty, label: product.variantLabel || undefined, path: window.location.pathname });
        }
        return added;
    }, [setItems, isMember]);

    // Sign in (or out) and the bag's plain lines switch to member (or normal) prices straight away.
    useEffect(() => {
        setItems((prev) => {
            // Plain lines take (or lose) the Chikit Club price; a Pick & Mix box is re-priced as the better of box price and Chikit Club prices.
            const next = repriceMixBoxes(prev.map((item) => ({ ...item, product: withMembership(item.product, isMember) })), isMember);
            return next.some((item, i) => item.product.price !== prev[i].product.price) ? next : prev;
        });
    }, [isMember, setItems]);

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
        newLines.forEach(({ product, quantity }) => trackEvent('add_to_cart', { productId: product.id, value: product.price * quantity, qty: quantity, label: 'bundle', path: window.location.pathname }));
        return true;
    }, [items, setItems]);

    const removeBundleFromCart = useCallback((bundleId) => {
        setItems((prev) => prev.filter((item) => item.product.bundleId !== bundleId));
    }, [setItems]);

    /**
     * "Buy 1 Get 1 Free": adds a pair (two units, each at half price, so the pair costs one). Adding again adds another pair.
     * Returns false when there is not enough stock for the pair.
     */
    const addBogoPair = useCallback((offer, rawProduct) => {
        const base = resolveCartProduct(rawProduct);
        const listPrice = base.price;
        const product = {
            ...base,
            listPrice,
            price: bogoUnitPrice(listPrice),
            originalPrice: Math.max(base.originalPrice || 0, listPrice),
            memberPrice: null,
            offerId: offer.id,
            offerKind: 'bogo',
            offerTitle: offer.title,
        };
        const prev = itemsRef.current;
        const existing = prev.find((item) => sameLine(item.product, product));
        const nextQty = (existing?.quantity ?? 0) + 2;
        if ((typeof product.stock === 'number' && nextQty > product.stock) || nextQty > capFor(product)) return false;
        const next = existing
            ? prev.map((item) => (sameLine(item.product, product) ? { ...item, quantity: nextQty } : item))
            : [...prev, { product, quantity: 2 }];
        itemsRef.current = next;
        setItems(next);
        setCartPulse((n) => n + 1);
        trackEvent('add_to_cart', { productId: product.id, value: product.price * 2, qty: 2, label: 'bogo', path: window.location.pathname });
        return true;
    }, [setItems]);

    /**
     * "Pick any N": adds the chosen products as one box priced as a whole. The lines are tied together by `offerGroup`
     * (removed together, never merged with a plain line). Returns false if the box is not exactly N different, in-stock products.
     */
    const addMixBox = useCallback((offer, rawProducts) => {
        const bases = rawProducts.map(resolveCartProduct);
        if (bases.length !== offer.pickCount || new Set(bases.map((b) => b.id)).size !== bases.length) return false;
        if (bases.some((b) => typeof b.stock === 'number' && b.stock < 1)) return false;
        // The box price is a saving: the picks must be worth at least that much (otherwise they are bought one by one).
        if (bases.reduce((sum, b) => sum + b.price, 0) < offer.price) return false;
        // A member pays the lower of the box price and the Chikit Club prices of the same products; a guest always pays the box price.
        const { units, byClub } = mixBoxPricing(bases.map((b) => b.price), bases.map((b) => b.memberPrice), offer.price, isMember);
        const group = `box-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
        const lines = bases.map((base, i) => ({
            product: {
                ...base,
                listPrice: base.price,
                price: units[i],
                originalPrice: Math.max(base.originalPrice || 0, base.price),
                memberPrice: null,
                clubAlt: base.memberPrice ?? null,
                offerPrice: offer.price,
                mixByClub: byClub,
                offerId: offer.id,
                offerGroup: group,
                offerKind: 'mix_match',
                offerTitle: offer.title,
            },
            quantity: 1,
        }));
        const next = [...itemsRef.current, ...lines];
        itemsRef.current = next;
        setItems(next);
        setCartPulse((n) => n + 1);
        lines.forEach(({ product }) => trackEvent('add_to_cart', { productId: product.id, value: product.price, qty: 1, label: 'mix_box', path: window.location.pathname }));
        return true;
    }, [setItems, isMember]);

    const removeOfferGroup = useCallback((offerGroup) => {
        setItems((prev) => prev.filter((item) => item.product.offerGroup !== offerGroup));
    }, [setItems]);

    /** The plain (not offer, not bundle) bag line for this product at its chosen pack size, if any. */
    const plainLineFor = useCallback((rawProduct) => {
        const p = resolveCartProduct(rawProduct);
        return items.find((i) => sameLine(i.product, { ...p, bundleId: null, offerId: null, offerGroup: null })) ?? null;
    }, [items]);
    const quantityInBag = useCallback((rawProduct) => plainLineFor(rawProduct)?.quantity ?? 0, [plainLineFor]);

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
        const syncable = current.filter((item) => !item.product.bundleId && !item.product.offerId);
        if (syncable.length === 0) return;

        const results = await Promise.allSettled(
            syncable.map((item) => api.get(`/api/products/${item.product.id}`))
        );
        const resultByLine = new Map(syncable.map((item, i) => [item, results[i]]));
        // A product the shop has deleted or hidden answers 404. It is taken out of the bag with a note (it used to stay at its
        // old price until "Place order" failed). Any other failure (offline, a hiccup) leaves the line alone.
        const gone = syncable.filter((item, i) => results[i].status === 'rejected' && results[i].reason?.status === 404);
        if (gone.length) {
            setBagNotice(gone.length === 1
                ? `${gone[0].product.title} is no longer available, so it was taken out of your bag.`
                : `${gone.length} items are no longer available, so they were taken out of your bag.`);
        }

        setItems((prev) => prev
            .map((item) => {
                if (item.product.bundleId || item.product.offerId) return item;
                const result = resultByLine.get(item);
                if (result?.status === 'rejected' && result.reason?.status === 404) return { ...item, quantity: 0 };
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
                    product: withMembership({
                        ...item.product,
                        listPrice: source.price,
                        price: source.price,
                        memberPrice: source.memberPrice ?? null,
                        originalPrice: source.originalPrice,
                        discount: source.discount,
                        stock: source.stock,
                    }, isMember),
                    quantity: maxQtyFor(source, item.quantity),
                };
            })
            .filter((item) => item.quantity > 0));
    }, [items, setItems, isMember]);

    const removeFromCart = useCallback((productId, { variantId = null, bundleId = null, offerId = null, offerGroup = null } = {}) => {
        const ref = { id: productId, variantId, bundleId, offerId, offerGroup };
        const line = itemsRef.current.find((item) => sameLine(item.product, ref));
        if (line) trackEvent('remove_from_cart', { productId, value: line.product.price * line.quantity, qty: line.quantity, path: window.location.pathname });
        setItems((prev) => prev.filter((item) => !sameLine(item.product, ref)));
    }, [setItems]);

    const updateQuantity = useCallback((productId, quantity, { variantId = null, bundleId = null, offerId = null, offerGroup = null } = {}) => {
        const ref = { id: productId, variantId, bundleId, offerId, offerGroup };
        if (quantity <= 0) {
            removeFromCart(productId, { variantId, bundleId, offerId, offerGroup });
            return;
        }
        setItems((prev) => prev.map((item) => {
            if (!sameLine(item.product, ref)) return item;
            const step = stepFor(item.product);
            // Buy 1 Get 1 lines stay in whole pairs.
            const wanted = step > 1 ? Math.floor(quantity / step) * step : quantity;
            const capped = maxQtyFor(item.product, wanted);
            return { ...item, quantity: step > 1 ? Math.floor(capped / step) * step : capped };
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
    const eligibleSubtotal = useMemo(() => couponEligibleSubtotal(items), [items]);

    const baseDeliveryFee = subtotal >= freeThreshold ? 0 : deliveryFeeAmount;
    const discountAmount = couponState?.valid ? (couponState.breakdown?.discountAmount ?? 0) : 0;
    const deliveryFee = couponState?.valid
        ? (couponState.breakdown?.deliveryFee ?? baseDeliveryFee)
        : baseDeliveryFee;
    const total = couponState?.valid
        ? (couponState.breakdown?.total ?? subtotal + deliveryFee)
        : subtotal + baseDeliveryFee;

    const validateCoupon = useCallback(async (code, currentSubtotal = subtotal, { manual = false, eligible = eligibleSubtotal } = {}) => {
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
            const result = await api.post('/api/coupons/validate', { code: normalized, subtotal: currentSubtotal, eligibleSubtotal: eligible }, token || undefined);
            if (requestId !== couponRequestIdRef.current) return result; // superseded by a newer call — ignore

            if (result.valid) {
                setCouponCode(normalized);
                setCouponState(result);
                setCouponNotice('');
                if (manual) {
                    manualCouponRef.current = true;
                    setAutoApplied(false);
                    clearAutoSkip();
                }
            } else {
                // A coupon that was already in the bag and no longer qualifies is dropped with an explanation, never silently.
                if (!manual) setCouponNotice(`${normalized} was removed. ${result.message || 'It no longer applies to your bag.'}`);
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
    }, [subtotal, eligibleSubtotal, token, setCouponCode, clearAutoSkip]);

    const applyCoupon = useCallback(async (code) => validateCoupon(code, subtotal, { manual: true }), [validateCoupon, subtotal]);

    const tryAutoApply = useCallback(async (currentSubtotal = subtotal, eligible = eligibleSubtotal) => {
        if (manualCouponRef.current || autoApplySkipRef.current || currentSubtotal <= 0 || eligible <= 0) {
            return null;
        }

        const requestId = ++couponRequestIdRef.current;
        setCouponLoading(true);
        try {
            const result = await api.post('/api/coupons/auto-apply', { subtotal: currentSubtotal, eligibleSubtotal: eligible }, token || undefined);
            if (requestId !== couponRequestIdRef.current) return result; // superseded by a newer call — ignore

            if (result?.valid && result.coupon?.code) {
                const normalized = String(result.coupon.code).trim().toUpperCase();
                setCouponCode(normalized);
                setCouponState(result);
                setAutoApplied(true);
                setCouponNotice('');
                return result;
            }
            return null;
        } catch {
            return null;
        } finally {
            if (requestId === couponRequestIdRef.current) setCouponLoading(false);
        }
    }, [subtotal, eligibleSubtotal, token, setCouponCode]);

    const removeCoupon = useCallback(() => {
        setCouponNotice('');
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
    }, [subtotal, eligibleSubtotal, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // A campaign link (…/?coupon=CODE) keeps its code until the bag has something a coupon can discount, then applies it.
    useEffect(() => {
        try {
            const fromLink = new URLSearchParams(window.location.search).get('coupon');
            if (fromLink && /^[A-Za-z0-9_-]{2,40}$/.test(fromLink)) sessionStorage.setItem(PENDING_COUPON_KEY, fromLink.toUpperCase());
        } catch { /* storage blocked: the code can still be typed at checkout */ }
    }, []);

    useEffect(() => {
        let pending = '';
        try { pending = sessionStorage.getItem(PENDING_COUPON_KEY) || ''; } catch { /* ignore */ }
        if (!pending || eligibleSubtotal <= 0) return;
        try { sessionStorage.removeItem(PENDING_COUPON_KEY); } catch { /* ignore */ }
        manualCouponRef.current = true;
        validateCoupon(pending, subtotal, { manual: true });
    }, [eligibleSubtotal]); // eslint-disable-line react-hooks/exhaustive-deps

    const isInCart = useCallback((productId, { variantId = null, bundleId = null, offerId = null, offerGroup = null } = {}) =>
        items.some((item) => sameLine(item.product, { id: productId, variantId, bundleId, offerId, offerGroup })), [items]);

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
        quantityInBag,
        plainLineFor,
        addBogoPair,
        addMixBox,
        removeOfferGroup,
        isMember,
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
        eligibleSubtotal,
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
        couponBreakdown: couponState?.valid ? couponState.breakdown : null,
        couponNotice,
        bagNotice,
        dismissBagNotice,
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
        quantityInBag,
        plainLineFor,
        addBogoPair,
        addMixBox,
        removeOfferGroup,
        isMember,
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
        couponNotice,
        bagNotice,
        dismissBagNotice,
        eligibleSubtotal,
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
