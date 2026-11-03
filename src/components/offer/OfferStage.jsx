import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { packFor } from '@/data/packs';
import { stageProducts } from '@/utils/offerPacks';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

const OfferScene = lazy(() => import('@/components/offer/OfferScene'));

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch { return false; }
}

/** The round beige price seal that sits over the stage: "Any 3 for ₹1,499" or "Buy 1 Get 1 free". */
export function Seal({ offer, className }) {
    if (offer.kind === 'collection') return null;
    const bogo = offer.kind === 'bogo';
    return (
        <div className={cn('grid size-24 -rotate-6 place-items-center rounded-full bg-accent text-center text-primary-deep shadow-lg ring-4 ring-accent/30 sm:size-32', className)} aria-hidden="true">
            <div className="leading-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{bogo ? 'Buy 1' : `Any ${offer.pickCount} for`}</p>
                <p className="mt-1 font-display text-h3 font-semibold leading-none sm:text-h2">{bogo ? 'Get 1' : formatPrice(offer.price)}</p>
                {bogo && <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em]">Free</p>}
            </div>
        </div>
    );
}

/** Shown before the 3D code arrives, or instead of it (reduced motion, no WebGL): the product photos in a fan. */
function PhotoFan({ products }) {
    const rotations = products.length === 2 ? ['-rotate-6', 'rotate-6'] : ['-rotate-6', 'z-10 scale-110', 'rotate-6'];
    return (
        <div className="absolute inset-0 flex items-center justify-center gap-0 px-4" aria-hidden="true">
            {products.map((p, i) => (
                <span key={`${p.id}-${i}`} className={cn('relative -mx-3 grid aspect-[4/5] w-[30%] max-w-44 place-items-center overflow-hidden rounded-2xl bg-canvas-alt shadow-lg ring-1 ring-white/30', rotations[i] ?? '')}>
                    <img src={imageUrl(p.images[0], 360)} alt="" width="360" height="450" loading="lazy" className="size-full object-cover" />
                </span>
            ))}
        </div>
    );
}

/**
 * The picture of an offer: its real Chikit packs in 3D on a plum stage with a price seal. three.js is loaded only when the
 * stage is near the screen, and the packs show as photos while it loads and for anyone who prefers reduced motion.
 */
export default function OfferStage({ offer, products, className, seal = true }) {
    const looks = useSiteContent().content.extras.packs ?? {};
    const ref = useRef(null);
    const [near, setNear] = useState(false);
    const [onScreen, setOnScreen] = useState(false);
    const [ready, setReady] = useState(false);
    const [env, setEnv] = useState({ webgl: false, reduced: true, mobile: false });

    useEffect(() => {
        setEnv({
            webgl: hasWebGL(),
            reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            mobile: window.matchMedia('(max-width: 640px)').matches,
        });
    }, []);
    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        // Wait a moment after the stage comes near, so the 3D code never competes with the first paint of the page above it.
        let timer;
        const nearObserver = new IntersectionObserver(([e]) => { if (e.isIntersecting && !timer) timer = setTimeout(() => setNear(true), 1500); }, { rootMargin: '200px 0px' });
        const visibleObserver = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
        nearObserver.observe(node);
        visibleObserver.observe(node);
        return () => { clearTimeout(timer); nearObserver.disconnect(); visibleObserver.disconnect(); };
    }, []);

    const shown = useMemo(() => stageProducts(offer, products, looks), [offer, products, looks]);
    const packs = useMemo(() => shown.map((p) => packFor(p, looks)), [shown, looks]);
    const live = near && env.webgl && !env.reduced && packs.length > 0;
    // A new offer starts a new scene: show the photos again until it has drawn.
    useEffect(() => { setReady(false); }, [offer.id]);

    return (
        <div ref={ref} className={cn('relative isolate', className)}>
            <div className="pointer-events-none absolute left-1/2 top-[46%] aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(254_225_197/0.34),rgb(254_225_197/0.08)_60%,transparent)]" aria-hidden="true" />
            {!(live && ready) && shown.length > 0 && <PhotoFan products={shown} />}
            {live && (
                <Suspense fallback={null}>
                    <OfferScene key={offer.id} packs={packs} visible={onScreen} mobile={env.mobile} onReady={() => setReady(true)} className="absolute inset-0 touch-pan-y" />
                </Suspense>
            )}
            {seal && <Seal offer={offer} className="absolute right-2 top-2 z-10 sm:right-6 sm:top-4" />}
        </div>
    );
}
