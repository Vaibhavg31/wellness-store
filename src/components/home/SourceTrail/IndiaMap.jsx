import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { REGIONS } from './sourceRegions';

gsap.registerPlugin(DrawSVGPlugin);

/** A stylized (not geographically precise) silhouette of India — enough to
 *  read as "a map" and carry the travel line, without needing real GeoJSON
 *  data in a homepage decoration. */
const COUNTRY_PATH =
    'M50 4 C58 3 66 6 70 12 C76 10 82 14 80 20 C86 24 88 32 84 38 C90 44 88 54 80 58 ' +
    'C82 66 78 76 72 82 C74 92 68 104 58 112 C54 118 48 118 46 112 C42 108 40 100 42 92 ' +
    'C34 90 28 82 30 74 C22 72 16 64 20 56 C14 52 12 44 18 40 C14 34 16 26 24 24 ' +
    'C22 16 30 8 40 8 C42 4 46 3 50 4 Z';

const TRAVEL_PATH = `M${REGIONS.map((r) => `${r.coord.x} ${r.coord.y}`).join(' L')}`;

/**
 * Renders the map and exposes `setProgress(p)` — a single 0-1 scroll
 * progress value the parent scrubs — which:
 *   - draws the travel line from 0% to `p*100%` via DrawSVG (free in GSAP
 *     since Webflow's 2025 acquisition, same technique the spec asks for),
 *   - brightens whichever stop's dot the line has just reached.
 * All per-frame work is direct gsap.set, not React state.
 */
const IndiaMap = forwardRef(function IndiaMap(_props, ref) {
    const lineRef = useRef(null);
    const dotRefs = useRef([]);

    useImperativeHandle(ref, () => ({
        setProgress(p) {
            gsap.set(lineRef.current, { drawSVG: `0% ${p * 100}%` });
            const n = REGIONS.length;
            REGIONS.forEach((_, i) => {
                const threshold = n > 1 ? i / (n - 1) : 0;
                const intensity = gsap.utils.clamp(0.35, 1, 1 - Math.abs(p - threshold) * n * 2);
                const dot = dotRefs.current[i];
                if (dot) gsap.set(dot, { opacity: intensity, scale: 0.85 + intensity * 0.45, transformOrigin: '50% 50%' });
            });
        },
    }), []);

    return (
        <svg viewBox="0 0 100 120" className="w-full h-full" fill="none">
            <path d={COUNTRY_PATH} fill="rgba(251,249,244,0.05)" stroke="rgba(251,249,244,0.18)" strokeWidth="0.6" strokeLinejoin="round" />
            <path
                ref={lineRef}
                d={TRAVEL_PATH}
                fill="none"
                stroke="url(#trailGradient)"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <defs>
                <linearGradient id="trailGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FBF9F4" />
                    <stop offset="100%" stopColor="#F5C563" />
                </linearGradient>
            </defs>
            {REGIONS.map((r, i) => (
                <g key={r.id} ref={(el) => { dotRefs.current[i] = el; }} style={{ opacity: 0.35 }}>
                    <circle cx={r.coord.x} cy={r.coord.y} r="3.2" fill="rgba(245,158,11,0.35)" />
                    <circle cx={r.coord.x} cy={r.coord.y} r="1.4" fill="#F5C563" />
                </g>
            ))}
        </svg>
    );
});

export default IndiaMap;
