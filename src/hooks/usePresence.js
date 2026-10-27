import { useEffect, useRef, useState } from 'react';

/**
 * Keeps an overlay mounted for a moment after it is closed so it can animate OUT (slide / fade) instead of vanishing.
 * `mounted` is true while open or while the exit plays; `closing` is true only during the exit. First render is unaffected.
 */
export function usePresence(isOpen, exitMs = 220) {
    const [exiting, setExiting] = useState(false);
    const wasOpen = useRef(isOpen);

    useEffect(() => {
        if (isOpen) {
            wasOpen.current = true;
            setExiting(false);
            return undefined;
        }
        if (!wasOpen.current) return undefined;
        wasOpen.current = false;
        setExiting(true);
        const timer = setTimeout(() => setExiting(false), exitMs);
        return () => clearTimeout(timer);
    }, [isOpen, exitMs]);

    return { mounted: isOpen || exiting, closing: !isOpen && exiting };
}
