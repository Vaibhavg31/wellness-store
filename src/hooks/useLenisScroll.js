import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Module-level singleton, ref-counted across every consumer. Each
// scroll-story section on the homepage (WellnessJourney, BodyMap,
// SourceTrail) used to call `new Lenis()` independently — with several of
// them mounted at once, that meant multiple Lenis instances all
// virtualizing the *same* native scroll simultaneously, each computing its
// own (different) smoothed position and each driving ScrollTrigger.update
// on its own tick. The result: compounding scroll deltas, wrong effective
// speed, and pins/scrubs reading a jittery position — "scroll not working
// properly". One shared instance, created on first mount and torn down
// only once the last consumer unmounts, fixes that at the source.
let sharedLenis = null;
let refCount = 0;
let tick = null;

function acquire() {
    refCount += 1;
    if (sharedLenis) return;

    sharedLenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });
    sharedLenis.on('scroll', ScrollTrigger.update);

    tick = (time) => sharedLenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
}

function release() {
    refCount -= 1;
    if (refCount > 0 || !sharedLenis) return;

    gsap.ticker.remove(tick);
    sharedLenis.destroy();
    sharedLenis = null;
    tick = null;
}

/**
 * Scopes Lenis smooth-scroll to the lifetime of whichever desktop story
 * sections are currently mounted — safe to call from several sections at
 * once, since the underlying Lenis instance is a shared singleton.
 */
export function useLenisScroll(enabled) {
    useEffect(() => {
        if (!enabled) return undefined;
        acquire();
        return release;
    }, [enabled]);
}
