import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/formatPrice';

/**
 * <img> that fades in once loaded, over whatever background its parent provides (use a tinted one).
 * Images already in the browser cache are shown straight away, and a failed load still reveals the (broken)
 * image so nothing stays invisible. Pass `instant` for above-the-fold images so they are never held back.
 */
export default function FadeImage({ className, onLoad, onError, instant = false, alt = '', ...props }) {
    const ref = useRef(null);
    const [ready, setReady] = useState(instant);

    useEffect(() => {
        if (ref.current?.complete) setReady(true);
    }, []);

    return (
        <img
            ref={ref}
            alt={alt}
            onLoad={(e) => { setReady(true); onLoad?.(e); }}
            onError={(e) => { setReady(true); onError?.(e); }}
            className={cn(!instant && 'transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0', className)}
            {...props}
        />
    );
}
