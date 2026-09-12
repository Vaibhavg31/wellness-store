import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scopes Lenis smooth-scroll to the lifetime of the desktop story section —
 * created on mount, destroyed on unmount, wired into GSAP's ticker so
 * ScrollTrigger's pin/scrub reads Lenis's smoothed position instead of the
 * raw (jumpier) native scroll offset.
 */
export function useLenisScroll(enabled) {
    useEffect(() => {
        if (!enabled) return undefined;

        const lenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });
        lenis.on('scroll', ScrollTrigger.update);

        const tick = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        return () => {
            gsap.ticker.remove(tick);
            lenis.destroy();
        };
    }, [enabled]);
}
