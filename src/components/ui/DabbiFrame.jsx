/**
 * DabbiFrame — the small round "tin/box" (dabbi) product container used
 * anywhere a product photo needs to read as a physical little jar rather
 * than a flat rectangle: the homepage Orbit Ring (center + satellites) today,
 * and anywhere else that wants the same treatment later.
 *
 * Built from plain layered spans (no extra image assets) so it drops onto
 * ANY product photo — including a plain white-background stock shot — and
 * still reads as "sitting in a container": a lid-highlight arc across the
 * top third, an inner rim shadow to fake depth, and a soft ambient shadow
 * underneath. A background-removed ("cutout") photo sits even better here
 * since there's no white rectangle fighting the round edge, but it isn't
 * required — callers just pass whichever URL they have.
 */
export default function DabbiFrame({ src, alt = '', size = 96, ring = true, className = '', imgClassName = '' }) {
    return (
        <span
            className={`relative inline-block rounded-full shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Ambient shadow the tin "sits" in — offset down, not centered,
                so it reads as a shadow cast on a surface rather than a glow. */}
            <span
                aria-hidden="true"
                className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full bg-ink/25 blur-md"
                style={{ width: size * 0.82, height: size * 0.22, translate: `0 ${size * 0.1}px` }}
            />

            <span className="absolute inset-0 rounded-full overflow-hidden bg-cream shadow-lg shadow-forest/15">
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none ${imgClassName}`}
                />

                {/* Inner rim — a hairline shadow just inside the edge, like
                    light catching the lip of a tin lid. */}
                <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{ boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.55), inset 0 3px 7px rgba(0,0,0,0.18), inset 0 -4px 8px rgba(0,0,0,0.12)' }}
                />

                {/* Lid gloss — a soft highlight arc across the upper third,
                    the one detail that most sells "round container" over
                    "circle-cropped photo". */}
                <span
                    aria-hidden="true"
                    className="absolute left-[8%] right-[8%] top-[5%] h-[38%] rounded-[50%] bg-gradient-to-b from-white/60 via-white/15 to-transparent"
                />
            </span>

            {ring && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full ring-2 ring-cream/80"
                />
            )}
        </span>
    );
}
