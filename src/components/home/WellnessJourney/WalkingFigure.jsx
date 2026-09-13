import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import figureSrc from '@/assets/hero-figure-silhouette.png';

const ZONES = {
    head: { top: '4%', size: 84 },
    chest: { top: '24%', size: 104 },
    core: { top: '48%', size: 116 },
};

/**
 * The real photographic figure (same asset as Opening Intro/Body Map)
 * standing in for the earlier hand-drawn vector figure. A subtle
 * walk-in-place bob (translateY loop) reads as "alive" without needing
 * articulated limbs on a flat photo; posture (slumped -> upright lean),
 * brightness/saturation, and the vitality rail all still morph with scroll
 * progress exactly as before.
 *
 * The parent doesn't touch React state for any of this (same reasoning as
 * ClockDial's marker): it calls `ref.current.setProgress(p)` once per
 * scroll-scrub frame via useImperativeHandle, which:
 *   - rescales the bob's speed (heavy shuffle -> brisk stride)
 *   - straightens posture (slouched lean -> upright)
 *   - brightens/saturates the whole figure
 *   - fills the vitality rail
 * all through direct gsap.set calls, keeping per-frame work off the render path.
 */
const WalkingFigure = forwardRef(function WalkingFigure({ activeGlow }, ref) {
    const glowRefs = useRef({});
    const figureRef = useRef(null);
    const vitalityFillRef = useRef(null);
    const bobTl = useRef(null);

    useEffect(() => {
        Object.entries(glowRefs.current).forEach(([zone, el]) => {
            if (!el) return;
            gsap.to(el, {
                opacity: zone === activeGlow ? 1 : 0,
                scale: zone === activeGlow ? 1 : 0.85,
                duration: 0.6,
                ease: 'power2.out',
            });
        });
    }, [activeGlow]);

    useEffect(() => {
        // A gentle walk-in-place bob (yoyo'd) — reads as a living figure
        // without translating it across the section.
        const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 0.55, ease: 'sine.inOut' } });
        tl.to(figureRef.current, { y: '-=6' }, 0);
        tl.timeScale(0.55); // resting pace until scroll says otherwise
        bobTl.current = tl;
        return () => tl.kill();
    }, []);

    useImperativeHandle(ref, () => ({
        setProgress(p) {
            bobTl.current?.timeScale(0.55 + p * 1.15);
            gsap.set(figureRef.current, {
                rotate: 5 - 7 * p, // forward slump -> slight upright lean
                filter: `brightness(${1 + p * 0.5}) saturate(${1 + p * 0.6})`,
                transformOrigin: '50% 92%',
            });
            if (vitalityFillRef.current) gsap.set(vitalityFillRef.current, { height: `${p * 100}%` });
        },
    }), []);

    return (
        <div className="relative w-[168px] sm:w-[188px] h-[320px] sm:h-[360px] mx-auto flex items-center gap-4">
            {/* Vitality meter — empty at the day's low point, full once the
                figure reaches wind-down. A plain filled track reads instantly
                as "low -> full" without needing a number. */}
            <div className="relative w-1.5 h-[85%] rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                <div
                    ref={vitalityFillRef}
                    className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-ivory/40 via-gold to-gold-light"
                    style={{ height: '0%', willChange: 'height' }}
                />
            </div>

            <div className="relative flex-1 h-full">
                {Object.entries(ZONES).map(([zone, z]) => (
                    <div
                        key={zone}
                        ref={(el) => { glowRefs.current[zone] = el; }}
                        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
                        style={{
                            top: z.top,
                            width: z.size,
                            height: z.size,
                            background: 'radial-gradient(circle, rgba(245,158,11,0.55) 0%, rgba(245,158,11,0) 70%)',
                            opacity: 0,
                            filter: 'blur(2px)',
                        }}
                        aria-hidden="true"
                    />
                ))}

                <img
                    ref={figureRef}
                    src={figureSrc}
                    alt="Figure walking through the day"
                    className="relative w-full h-full object-contain object-top"
                    style={{ willChange: 'transform, filter' }}
                    draggable={false}
                />
            </div>
        </div>
    );
});

export default WalkingFigure;
