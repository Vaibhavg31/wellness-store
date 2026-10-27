import { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/formatPrice';

const SIZE = 300;
const C = SIZE / 2;
const RADIUS = 140;
const SPIN_MS = 5200;
const EXTRA_TURNS = 5;

const point = (angleDeg, radius) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [C + radius * Math.cos(a), C + radius * Math.sin(a)];
};

function slicePath(startDeg, endDeg) {
    const [x1, y1] = point(startDeg, RADIUS);
    const [x2, y2] = point(endDeg, RADIUS);
    return `M${C},${C} L${x1.toFixed(2)},${y1.toFixed(2)} A${RADIUS},${RADIUS} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
}

/** Splits "Better luck next time" over two lines so it fits inside a slice. */
function wrapLabel(label) {
    if (label.length <= 10 || !label.includes(' ')) return [label];
    const words = label.split(' ');
    let best = 1;
    let bestGap = Infinity;
    for (let i = 1; i < words.length; i += 1) {
        const gap = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
        if (gap < bestGap) { best = i; bestGap = gap; }
    }
    return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

// Brand-token fills. Prize slices alternate plum / gold, "no prize" slices are a quiet neutral.
const PRIZE_STYLES = [
    { fill: 'var(--color-primary)', text: '#fff' },
    { fill: 'var(--color-accent)', text: 'var(--color-ink)' },
];
const MISS_STYLE = { fill: 'var(--color-canvas-alt)', text: 'var(--color-muted)' };

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The wheel and its "Spin" button. `onSpin()` must resolve to `{ index }` — the slice to land on (decided by the
 * server); the wheel then turns to that slice and calls `onDone(result)` when it stops.
 */
export default function SpinWheel({ segments, onSpin, onDone, disabled = false }) {
    const [rotation, setRotation] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const rotationRef = useRef(0);
    const finishRef = useRef(null);

    const step = 360 / segments.length;

    const spin = async () => {
        if (busy || disabled) return;
        setBusy(true);
        setError('');
        let result;
        try {
            result = await onSpin();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not spin the wheel. Please try again.');
            setBusy(false);
            return;
        }

        // Land somewhere inside the slice (not always dead centre) after several full turns.
        const jitter = (Math.random() - 0.5) * step * 0.6;
        const toSlice = (360 - ((result.index + 0.5) * step + jitter) + 360) % 360;
        const next = rotationRef.current - (rotationRef.current % 360) + 360 * EXTRA_TURNS + toSlice;
        rotationRef.current = next;
        setRotation(next);

        const finish = () => {
            clearTimeout(finishRef.current);
            finishRef.current = null;
            setBusy(false);
            onDone(result);
        };
        if (reducedMotion()) finish();
        else finishRef.current = setTimeout(finish, SPIN_MS + 150);
    };

    let prizeCount = 0;
    const slices = segments.map((segment, i) => {
        const style = segment.couponId ? PRIZE_STYLES[prizeCount++ % PRIZE_STYLES.length] : MISS_STYLE;
        const mid = (i + 0.5) * step;
        const lines = wrapLabel(segment.label);
        return (
            <g key={i}>
                <path d={slicePath(i * step, (i + 1) * step)} fill={style.fill} stroke="var(--color-surface)" strokeWidth="2" />
                <g transform={`rotate(${mid} ${C} ${C})`}>
                    <text x={C} y={C - 98} textAnchor="middle" fontSize="13" fontWeight="600" fill={style.text} fontFamily="inherit">
                        {lines.map((line, n) => <tspan key={n} x={C} dy={n === 0 ? 0 : 15}>{line}</tspan>)}
                    </text>
                </g>
            </g>
        );
    });

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[17rem]">
                {/* fixed pointer */}
                <svg viewBox="0 0 40 40" width="34" height="34" className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[35%] drop-shadow" aria-hidden="true">
                    <path d="M20 38 L6 8 Q20 -2 34 8 Z" fill="var(--color-ink)" stroke="var(--color-surface)" strokeWidth="2.5" strokeLinejoin="round" />
                </svg>

                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block w-full overflow-visible" aria-hidden="true" focusable="false">
                    <circle cx={C} cy={C} r={RADIUS + 6} fill="var(--color-primary-deep)" />
                    <g
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: '50% 50%',
                            transformBox: 'view-box',
                            transition: rotation === 0 ? 'none' : `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.62, 0.1, 1)`,
                        }}
                    >
                        {slices}
                    </g>
                    <circle cx={C} cy={C} r="22" fill="var(--color-surface)" stroke="var(--color-primary-deep)" strokeWidth="4" />
                    <circle cx={C} cy={C} r="6" fill="var(--color-primary-deep)" />
                </svg>
            </div>

            <Button size="lg" className={cn('mt-6 w-full max-w-[17rem]')} onClick={spin} loading={busy} disabled={disabled}>
                {busy ? 'Spinning…' : 'Spin the wheel'}
            </Button>
            <p className="mt-3 min-h-5 text-center text-caption text-danger" role="alert">{error}</p>
        </div>
    );
}
