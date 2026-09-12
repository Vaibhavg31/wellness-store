import { useState, useEffect, useCallback } from 'react';
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        }
        catch {
            return initialValue;
        }
    });
    // Resolve inside the functional setState form (not off the closed-over
    // `storedValue`) so two calls in the same tick — e.g. both awaited promise
    // handlers resolving before a re-render — each see the other's update
    // instead of the second one silently overwriting the first.
    const setValue = useCallback((value) => {
        setStoredValue((prev) => {
            const valueToStore = value instanceof Function ? value(prev) : value;
            try {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch {
                // ignore (private browsing / quota exceeded)
            }
            return valueToStore;
        });
    }, [key]);
    return [storedValue, setValue];
}
export { useScrollPosition } from './useScrollPosition';
export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
