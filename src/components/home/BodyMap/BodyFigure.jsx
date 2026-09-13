import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import figureSrc from '@/assets/hero-figure-silhouette.png';
import { GLOW_POSITIONS } from './bodyMapZones';

/**
 * The real photographic figure (same asset as Opening Intro) standing in
 * for the earlier hand-drawn vector body — five glow overlays sit over it,
 * each a blurred radial gradient blended with `screen` so it reads as
 * light emanating from inside the figure rather than a sticker on top.
 * The parent drives them by calling `ref.current.setZone(zoneKey,
 * intensity)` once per scroll-scrub frame (same imperative-handle pattern
 * as WalkingFigure/ClockDial — keeps per-frame work off the render path).
 */
const BodyFigure = forwardRef(function BodyFigure({ reducedMotion = false }, ref) {
    const glowRefs = useRef({});

    useImperativeHandle(ref, () => ({
        setZone(zone, intensity) {
            const el = glowRefs.current[zone];
            if (el) gsap.set(el, { opacity: intensity });
        },
    }), []);

    return (
        <div className="relative w-[220px] sm:w-[260px] h-[380px] sm:h-[440px] mx-auto">
            <img
                src={figureSrc}
                alt="Human figure with highlighted zones"
                className="absolute inset-0 w-full h-full object-contain object-top"
                draggable={false}
            />

            {Object.entries(GLOW_POSITIONS).map(([zone, z]) => (
                <div
                    key={zone}
                    ref={(el) => { glowRefs.current[zone] = el; }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none mix-blend-screen"
                    style={{
                        top: z.top,
                        left: z.left,
                        width: z.width,
                        height: z.height,
                        opacity: 0,
                        willChange: 'opacity',
                    }}
                    aria-hidden="true"
                >
                    <div
                        className="w-full h-full rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(245,158,11,0.85) 0%, rgba(245,158,11,0.35) 45%, transparent 75%)',
                            filter: 'blur(6px)',
                            animation: reducedMotion ? 'none' : 'bodyMapPulse 2.6s ease-in-out infinite',
                        }}
                    />
                </div>
            ))}

            <style>{`
                @keyframes bodyMapPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.14); }
                }
            `}</style>
        </div>
    );
});

export default BodyFigure;
