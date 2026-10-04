import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { niceScale } from '@/utils/dashboardMetrics';
import { formatPrice } from '@/utils/formatPrice';

const HEIGHT = 250;
const MARGIN = { top: 14, right: 16, bottom: 30, left: 52 };

const dateLabel = (date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fullDateLabel = (date) => date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** Compact axis numbers in Indian style: 1,500 → 1.5k, 2,50,000 → 2.5L. */
function compact(value, isMoney) {
    const abs = Math.abs(value);
    let text;
    if (abs >= 1e7) text = `${+(value / 1e7).toFixed(1)}Cr`;
    else if (abs >= 1e5) text = `${+(value / 1e5).toFixed(1)}L`;
    else if (abs >= 1e3) text = `${+(value / 1e3).toFixed(1)}k`;
    else text = String(value);
    return isMoney ? `₹${text}` : text;
}

function useElementWidth() {
    const ref = useRef(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
        observer.observe(node);
        setWidth(Math.round(node.getBoundingClientRect().width));
        return () => observer.disconnect();
    }, []);
    return [ref, width];
}

/**
 * Single-series line + area chart over time. Hover/touch/keyboard (←/→) show a crosshair and tooltip for the
 * nearest day. One measure at a time (revenue OR orders) so there is never a second y-axis.
 * `series` = [{ key, date, revenue, orders }]; `metric` = 'revenue' | 'orders'.
 */
export default function SalesTrendChart({ series, metric, className }) {
    const [wrapRef, width] = useElementWidth();
    const [active, setActive] = useState(null);
    const isMoney = metric === 'revenue';
    const noun = isMoney ? 'Revenue' : 'Orders';
    const format = (v) => (isMoney ? formatPrice(v) : `${v} order${v === 1 ? '' : 's'}`);

    const geometry = useMemo(() => {
        const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
        const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
        const max = Math.max(0, ...series.map((p) => p[metric]));
        const scale = niceScale(max || (isMoney ? 1000 : 4)); // sensible axis even when there is no activity yet
        const x = (i) => MARGIN.left + (series.length > 1 ? (i / (series.length - 1)) * innerW : innerW / 2);
        const y = (v) => MARGIN.top + innerH - (v / scale.max) * innerH;
        const points = series.map((p, i) => ({ ...p, px: x(i), py: y(p[metric]), value: p[metric] }));
        const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');
        const baseY = MARGIN.top + innerH;
        const area = points.length > 1 ? `${line} L${points.at(-1).px.toFixed(1)},${baseY} L${points[0].px.toFixed(1)},${baseY} Z` : '';
        const labelCount = width < 420 ? 3 : width < 640 ? 5 : 7;
        // Evenly spaced from the first to the last day, so a short axis still shows both ends.
        const count = Math.min(labelCount, points.length);
        const indexes = new Set(Array.from({ length: count }, (_, k) => Math.round((k * (points.length - 1)) / Math.max(1, count - 1))));
        const xLabels = points.filter((_, i) => indexes.has(i));
        return { innerW, innerH, scale, points, line, area, baseY, xLabels, y };
    }, [series, metric, width]);

    const nearestIndex = useCallback((clientX, rect) => {
        const rel = clientX - rect.left - MARGIN.left;
        const ratio = geometry.innerW ? rel / geometry.innerW : 0;
        return Math.min(series.length - 1, Math.max(0, Math.round(ratio * (series.length - 1))));
    }, [geometry.innerW, series.length]);

    const onKeyDown = (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        setActive((current) => {
            const from = current ?? series.length - 1;
            if (event.key === 'Home') return 0;
            if (event.key === 'End') return series.length - 1;
            return Math.min(series.length - 1, Math.max(0, from + (event.key === 'ArrowRight' ? 1 : -1)));
        });
    };

    const total = series.reduce((sum, p) => sum + p[metric], 0);
    const best = series.reduce((top, p) => (p[metric] > top[metric] ? p : top), series[0]);
    const summary = total === 0
        ? `${noun}: no activity in the last ${series.length} days.`
        : `${noun} over the last ${series.length} days: ${format(total)} in total; the best day was ${dateLabel(best.date)} with ${format(best[metric])}. Use the left and right arrow keys to read each day.`;

    const hovered = active !== null ? geometry.points[active] : null;
    const last = geometry.points.at(-1);
    const tooltipLeft = hovered ? Math.min(Math.max(hovered.px, 80), width - 80) : 0;

    return (
        <div ref={wrapRef} className={`relative ${className ?? ''}`}>
            {width > 0 && (
                <svg
                    width={width}
                    height={HEIGHT}
                    role="img"
                    aria-label={summary}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onFocus={() => setActive((v) => v ?? series.length - 1)}
                    onBlur={() => setActive(null)}
                    onPointerMove={(e) => setActive(nearestIndex(e.clientX, e.currentTarget.getBoundingClientRect()))}
                    onPointerLeave={() => setActive(null)}
                    className="touch-pan-y rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    {/* horizontal gridlines + y labels */}
                    {geometry.scale.ticks.map((tick) => (
                        <g key={tick}>
                            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={geometry.y(tick)} y2={geometry.y(tick)} stroke="var(--color-admin-border-light)" strokeWidth="1" />
                            <text x={MARGIN.left - 8} y={geometry.y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--color-admin-muted)">{compact(tick, isMoney)}</text>
                        </g>
                    ))}

                    {/* x labels */}
                    {geometry.xLabels.map((p) => (
                        <text key={p.key} x={p.px} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="var(--color-admin-muted)">{dateLabel(p.date)}</text>
                    ))}

                    {geometry.area && <path d={geometry.area} fill="var(--color-primary)" opacity="0.1" />}
                    <path d={geometry.line} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                    {/* end marker: 8px dot with a 2px surface ring */}
                    {last && !hovered && (
                        <circle cx={last.px} cy={last.py} r="6" fill="var(--color-primary)" stroke="var(--color-admin-surface)" strokeWidth="2" />
                    )}

                    {hovered && (
                        <g>
                            <line x1={hovered.px} x2={hovered.px} y1={MARGIN.top} y2={geometry.baseY} stroke="var(--color-admin-muted)" strokeWidth="1" opacity="0.5" />
                            <circle cx={hovered.px} cy={hovered.py} r="6" fill="var(--color-primary)" stroke="var(--color-admin-surface)" strokeWidth="2" />
                        </g>
                    )}
                </svg>
            )}

            {hovered && (
                <div
                    role="status"
                    className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-admin-border bg-admin-surface px-3 py-2 shadow-md"
                    style={{ left: tooltipLeft, top: Math.max(0, hovered.py - 62) }}
                >
                    <p className="text-caption text-admin-muted">{fullDateLabel(hovered.date)}</p>
                    <p className="flex items-center gap-2 text-small">
                        <span className="h-0.5 w-3 rounded-full bg-primary" aria-hidden="true" />
                        <strong className="font-semibold text-ink">{format(hovered.value)}</strong>
                    </p>
                </div>
            )}

            <details className="mt-2 text-small">
                <summary className="cursor-pointer text-caption font-medium text-primary hover:underline">View data as a table</summary>
                <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-admin-border-light">
                    <table className="w-full text-caption">
                        <thead className="sticky top-0 bg-admin-surface-alt text-left text-admin-muted">
                            <tr><th className="px-3 py-1.5 font-medium">Date</th><th className="px-3 py-1.5 text-right font-medium">Revenue</th><th className="px-3 py-1.5 text-right font-medium">Orders</th></tr>
                        </thead>
                        <tbody>
                            {[...series].reverse().map((p) => (
                                <tr key={p.key} className="border-t border-admin-border-light">
                                    <td className="px-3 py-1.5 text-ink">{fullDateLabel(p.date)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatPrice(p.revenue)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{p.orders}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}
