import { createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { useLocalStorage } from '@/hooks';
import { trackEvent } from '@/utils/analytics';
const WishlistContext = createContext(null);
export function WishlistProvider({ children }) {
    const [items, setItems] = useLocalStorage('chikit-wishlist', []);
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const noteWished = (product) => trackEvent('wishlist_add', { productId: product?.id, path: window.location.pathname, label: product?.title });
    const addToWishlist = useCallback((product) => {
        if (!itemsRef.current.some((p) => p.id === product.id)) noteWished(product);
        setItems((prev) => {
            if (prev.some((p) => p.id === product.id))
                return prev;
            return [...prev, product];
        });
    }, [setItems]);
    const removeFromWishlist = useCallback((productId) => {
        setItems((prev) => prev.filter((p) => p.id !== productId));
    }, [setItems]);
    const toggleWishlist = useCallback((product) => {
        if (!itemsRef.current.some((p) => p.id === product.id)) noteWished(product);
        setItems((prev) => {
            const exists = prev.some((p) => p.id === product.id);
            return exists
                ? prev.filter((p) => p.id !== product.id)
                : [...prev, product];
        });
    }, [setItems]);
    const isInWishlist = useCallback((productId) => items.some((p) => p.id === productId), [items]);
    const value = useMemo(() => ({
        items,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        itemCount: items.length,
    }), [items, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist]);
    return (<WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>);
}
export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context)
        throw new Error('useWishlist must be used within WishlistProvider');
    return context;
}
