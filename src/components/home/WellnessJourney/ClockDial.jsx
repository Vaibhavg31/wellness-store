import { forwardRef } from 'react';
import { hourToAngle } from './journeyStages';

const SIZE = 220;
const R = SIZE / 2 - 14;
const CENTER = SIZE / 2;

function pointFor(hour) {
    const rad = (hourToAngle(hour) * Math.PI) / 180;
    return { x: CENTER + R * Math.sin(rad), y: CENTER - R * Math.cos(rad) };
}

/**
 * A 24-hour dial: a track, a tick per stage (lit up once the scroll passes
 * it), and a marker whose position the parent drives directly via GSAP on
 * every scroll frame (through `markerRef`) rather than through React state —
 * this keeps the per-frame work off the render path.
 */
const ClockDial = forwardRef(function ClockDial({ stages, activeIndex }, markerRef) {
    return (
        <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} className="absolute inset-0">
                <circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="rgba(251,249,244,0.15)" strokeWidth="1.5" />
                {stages.map((stage, i) => {
                    const { x, y } = pointFor(stage.hour);
                    const lit = i <= activeIndex;
                    return (
                        <g key={stage.id}>
                            <circle
                                cx={x}
                                cy={y}
                                r={lit ? 4.5 : 3}
                                fill={lit ? '#F59E0B' : 'rgba(251,249,244,0.35)'}
                                style={{ transition: 'r 0.3s ease, fill 0.3s ease' }}
                            />
                        </g>
                    );
                })}
            </svg>
            <div
                ref={markerRef}
                className="absolute w-3 h-3 rounded-full bg-cream shadow-[0_0_12px_4px_rgba(245,158,11,0.55)]"
                style={{ left: CENTER, top: CENTER, marginLeft: -6, marginTop: -6, willChange: 'transform' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-[0.16em] text-cream/40">24h</span>
            </div>
        </div>
    );
});

export default ClockDial;
