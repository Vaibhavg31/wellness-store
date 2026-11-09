import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/formatPrice';

/**
 * <img> that fades in once loaded, over whatever background its parent provides (use a tinted one).
 * Images already in the browser cache are shown straight away, and a failed load still reveals the (broken)
 * image so nothing stays invisible. Pass `instant` for above-the-fold images so they are never held back.
 */
/** Shown instead of a picture that cannot be loaded (deleted upload, typo in an address), never a broken-image icon. */
export const IMAGE_FALLBACK = '/preview-placeholder.svg';

export default function FadeImage({ className, onLoad, onError, instant = false, alt = '', src, srcSet, ...props }) {
    const ref = useRef(null);
    const [ready, setReady] = useState(instant);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (ref.current?.complete && ref.current.naturalWidth > 0) setReady(true);
    }, []);
    // A new picture gets a fresh chance to load.
    useEffect(() => { setFailed(false); }, [src]);

    return (
        <img
            ref={ref}
            alt={alt}
            src={failed ? IMAGE_FALLBACK : src}
            srcSet={failed ? undefined : srcSet}
            onLoad={(e) => { setReady(true); onLoad?.(e); }}
            onError={(e) => {
                setReady(true);
                if (!failed) setFailed(true);
                onError?.(e);
            }}
            className={cn(!instant && 'transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0', className)}
            {...props}
        />
    );
}
