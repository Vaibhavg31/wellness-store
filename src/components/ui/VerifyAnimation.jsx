/** Verification check — ring + tick drawn with a CSS stroke animation (keyframes live in base.css). */
export default function VerifyAnimation({ size = 80, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
            <path
                d="M24 41l11 11 21-23"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                className="animate-draw-check"
            />
        </svg>
    );
}
