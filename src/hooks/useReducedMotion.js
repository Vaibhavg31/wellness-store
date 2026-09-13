import { useEffect, useState } from 'react';

/**
 * Tracks the user's `prefers-reduced-motion` OS/browser preference so
 * animated sections can render a static fallback instead. Previously
 * copy-pasted independently in OpeningIntro / BodyMap / WellnessJourney /
 * SourceTrail — consolidated here so every section (existing and new) shares
 * one source of truth and reacts live if the preference changes mid-session.
 */
export function useReducedMotion() {
    const [reduced, setReduced] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    return reduced;
}

export default useReducedMotion;
