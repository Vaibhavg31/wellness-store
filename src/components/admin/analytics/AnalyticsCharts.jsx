import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { niceScale } from '@/utils/dashboardMetrics';
import { cn } from '@/utils/formatPrice';

export const pct = (part, whole, digits = 0) => (whole > 0 ? `${((part / whole) * 100).toFixed(digits)}%` : '—');
export const num = (value) => Number(value || 0).toLocaleString('en-IN');

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

// ── Funnel ────────────────────────────────────────────────────────────────────
/**
 * The one funnel: every step is "visitors who got at least this far". Bars are scaled to the first step, the chips between
 * them say how many people were lost at that hop, and the worst hop is flagged so the eye goes straight to it.
 */
export function FunnelChart({ steps }) {
    const top = steps[0]?.count || 0;
    const hops = steps.slice(1).map((step, i) => {
        const lost = Math.max(0, steps[i].count - step.count);
        return { lost, rate: steps[i].count > 0 ? lost / steps[i].count : 0 };
    });
    const worst = hops.reduce((best, hop, i) => (hop.lost > 0 && hop.rate > (hops[best]?.rate ?? -1) ? i : best), -1);

    return (
        <ol className="space-y-0">
            {steps.map((step, i) => {
                const width = top > 0 ? Math.max(2, (step.count / top) * 100) : 2;
                const hop = i > 0 ? hops[i - 1] : null;
                const isWorst = i > 0 && i - 1 === worst;
                return (
                    <li key={step.key}>
                        {hop && (
                            <div className="flex items-center gap-2 py-1.5 pl-1 text-caption">
                                <ArrowDown size={14} className={isWorst ? 'text-danger' : 'text-admin-muted'} aria-hidden="true" />
                                <span className={cn('rounded-full px-2 py-0.5 font-medium tabular-nums', isWorst ? 'bg-danger-tint text-danger' : 'bg-admin-surface-alt text-admin-muted')}>
                                    {hop.lost > 0 ? `${(hop.rate * 100).toFixed(0)}% leave here · ${num(hop.lost)} ${hop.lost === 1 ? 'visitor' : 'visitors'}` : 'No one lost here'}
                                </span>
                                {isWorst && <span className="font-semibold text-danger">Biggest leak</span>}
                            </div>
                        )}
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[11rem_minmax(0,1fr)_5.5rem]">
                            <p className="col-span-2 text-small font-medium text-ink sm:col-span-1">
                                <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-primary-tint text-[11px] font-semibold text-primary-deep" aria-hidden="true">{i + 1}</span>
                                {step.label}
                            </p>
                            <div className="h-8 overflow-hidden rounded-md bg-admin-surface-alt" role="img" aria-label={`${step.label}: ${num(step.count)} visitors, ${pct(step.count, top)} of all visitors`}>
                                <div className="h-full rounded-md bg-primary transition-[width] duration-500" style={{ width: `${width}%`, opacity: 1 - i * 0.1 }} />
                            </div>
                            <p className="text-right text-small tabular-nums text-ink"><strong className="font-semibold">{num(step.count)}</strong> <span className="text-admin-muted">· {pct(step.count, top)}</span></p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// ── Trend over time ──────────────────────────────────────────────────────────
const SERIES = [
    { key: 'visitors', label: 'Visitors', color: 'var(--color-primary)' },
    { key: 'carts', label: 'Added to bag', color: 'var(--color-accent)' },
    { key: 'orders', label: 'Orders', color: 'var(--color-success)' },
];
const HEIGHT = 240;
const MARGIN = { top: 14, right: 14, bottom: 28, left: 40 };
const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fullDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export function TrendChart({ daily }) {
    const [wrapRef, width] = useElementWidth();
    const [active, setActive] = useState(null);
    const [hidden, setHidden] = useState(() => new Set());
    const shown = SERIES.filter((s) => !hidden.has(s.key));

    const geo = useMemo(() => {
        const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
        const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
        const max = Math.max(0, ...daily.flatMap((d) => shown.map((s) => d[s.key])));
        const scale = niceScale(max || 4);
        const x = (i) => MARGIN.left + (daily.length > 1 ? (i / (daily.length - 1)) * innerW : innerW / 2);
        const y = (v) => MARGIN.top + innerH - (v / scale.max) * innerH;
        const lines = SERIES.map((s) => ({
            ...s,
            d: daily.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`).join(' '),
        }));
        const count = Math.min(width < 420 ? 3 : width < 640 ? 5 : 7, daily.length);
        const wanted = new Set(Array.from({ length: count }, (_, k) => Math.round((k * (daily.length - 1)) / Math.max(1, count - 1))));
        return { innerW, innerH, scale, x, y, lines, labels: daily.map((p, i) => ({ p, i })).filter(({ i }) => wanted.has(i)), base: MARGIN.top + innerH };
    }, [daily, width, shown.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const nearest = (clientX, rect) => {
        const ratio = geo.innerW ? (clientX - rect.left - MARGIN.left) / geo.innerW : 0;
        return Math.min(daily.length - 1, Math.max(0, Math.round(ratio * (daily.length - 1))));
    };
    const toggle = (key) => setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else if (next.size < SERIES.length - 1) next.add(key);
        return next;
    });
    const hovered = active !== null ? daily[active] : null;
    const tipLeft = hovered ? Math.min(Math.max(geo.x(active), 90), width - 90) : 0;

    return (
        <div ref={wrapRef} className="relative">
            <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Choose lines to show">
                {SERIES.map((s) => {
                    const off = hidden.has(s.key);
                    return (
                        <button key={s.key} type="button" aria-pressed={!off} onClick={() => toggle(s.key)}
                            className={cn('inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-caption font-medium transition-colors', off ? 'border-admin-border bg-admin-surface text-admin-muted' : 'border-admin-border bg-admin-surface-alt text-ink')}>
                            <span className="h-[3px] w-4 rounded-full" style={{ background: off ? 'var(--color-admin-border)' : s.color }} aria-hidden="true" />
                            {s.label}
                        </button>
                    );
                })}
            </div>
            {width > 0 && (
                <svg
                    width={width} height={HEIGHT} role="img" tabIndex={0}
                    aria-label={`Daily visitors, bag adds and orders for the last ${daily.length} days. Use left and right arrow keys to read each day.`}
                    onKeyDown={(e) => {
                        if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                        e.preventDefault();
                        setActive((cur) => Math.min(daily.length - 1, Math.max(0, (cur ?? daily.length - 1) + (e.key === 'ArrowRight' ? 1 : -1))));
                    }}
                    onFocus={() => setActive((v) => v ?? daily.length - 1)}
                    onBlur={() => setActive(null)}
                    onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
                    onPointerLeave={() => setActive(null)}
                    className="touch-pan-y rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    {geo.scale.ticks.map((tick) => (
                        <g key={tick}>
                            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={geo.y(tick)} y2={geo.y(tick)} stroke="var(--color-admin-border-light)" />
                            <text x={MARGIN.left - 8} y={geo.y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--color-admin-muted)">{tick}</text>
                        </g>
                    ))}
                    {geo.labels.map(({ p, i }) => (
                        <text key={p.date} x={geo.x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="var(--color-admin-muted)">{dayLabel(p.date)}</text>
                    ))}
                    {geo.lines.filter((l) => !hidden.has(l.key)).map((l) => (
                        <g key={l.key}>
                            <path d={l.d} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                            {daily.length <= 31 && daily.map((p, i) => <circle key={p.date} cx={geo.x(i)} cy={geo.y(p[l.key])} r="2.5" fill={l.color} />)}
                        </g>
                    ))}
                    {hovered && (
                        <g>
                            <line x1={geo.x(active)} x2={geo.x(active)} y1={MARGIN.top} y2={geo.base} stroke="var(--color-admin-muted)" opacity="0.5" />
                            {shown.map((s) => <circle key={s.key} cx={geo.x(active)} cy={geo.y(hovered[s.key])} r="5.5" fill={s.color} stroke="var(--color-admin-surface)" strokeWidth="2" />)}
                        </g>
                    )}
                </svg>
            )}
            {hovered && (
                <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-admin-border bg-admin-surface px-3 py-2 shadow-md" style={{ left: tipLeft, top: 34 }}>
                    <p className="text-caption text-admin-muted">{fullDay(hovered.date)}</p>
                    {shown.map((s) => (
                        <p key={s.key} className="flex items-center gap-2 text-small">
                            <span className="h-[3px] w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                            <span className="text-admin-muted">{s.label}</span> <strong className="ml-auto pl-3 font-semibold tabular-nums text-ink">{hovered[s.key]}</strong>
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Time of day ──────────────────────────────────────────────────────────────
const hourName = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

export function HourChart({ hours }) {
    const [wrapRef, width] = useElementWidth();
    const [active, setActive] = useState(null);
    const max = Math.max(1, ...hours.map((h) => h.sessions));
    const peak = hours.reduce((best, h) => (h.sessions > best.sessions ? h : best), hours[0]);
    const H = 120;
    const gap = 3;
    const barW = width > 0 ? Math.max(3, (width - gap * 23) / 24) : 0;
    const hovered = active !== null ? hours[active] : null;

    return (
        <div ref={wrapRef} className="relative">
            {width > 0 && (
                <svg width={width} height={H + 22} role="img" aria-label={`Visits by hour of the day (India time). ${peak.sessions > 0 ? `Busiest hour: ${hourName(peak.hour)}.` : 'No visits yet.'}`}
                    onPointerLeave={() => setActive(null)}>
                    {hours.map((h, i) => {
                        const barH = h.sessions > 0 ? Math.max(3, (h.sessions / max) * H) : 2;
                        const x = i * (barW + gap);
                        return (
                            <g key={h.hour} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
                                <rect x={x - gap / 2} y="0" width={barW + gap} height={H + 22} fill="transparent" />
                                <rect x={x} y={H - barH} width={barW} height={barH} rx="2" fill={h.sessions > 0 && h.hour === peak.hour ? 'var(--color-primary)' : 'var(--color-primary-tint)'} stroke={h.sessions > 0 && h.hour !== peak.hour ? 'var(--color-primary)' : 'none'} strokeOpacity="0.35" />
                                {h.hour % 3 === 0 && <text x={x + barW / 2} y={H + 15} textAnchor="middle" fontSize="10.5" fill="var(--color-admin-muted)">{hourName(h.hour)}</text>}
                            </g>
                        );
                    })}
                </svg>
            )}
            {hovered && width > 0 && (
                <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-admin-border bg-admin-surface px-2.5 py-1.5 text-caption shadow-md"
                    style={{ left: Math.min(Math.max(active * (barW + gap) + barW / 2, 50), width - 50), top: -6 }}>
                    <strong className="font-semibold text-ink">{hourName(hovered.hour)}</strong> <span className="text-admin-muted">· {hovered.sessions} {hovered.sessions === 1 ? 'visit' : 'visits'}</span>
                </div>
            )}
        </div>
    );
}

// ── Simple ranked bars (sources, devices, …) ─────────────────────────────────
export function BarRows({ rows, empty = 'Nothing yet.' }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    if (rows.length === 0) return <p className="py-6 text-center text-small text-admin-muted">{empty}</p>;
    return (
        <ul className="space-y-3">
            {rows.map((row) => (
                <li key={row.key}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-small">
                        <span className="min-w-0 truncate font-medium text-ink">{row.label}</span>
                        <span className="shrink-0 tabular-nums text-ink"><strong className="font-semibold">{num(row.value)}</strong>{row.valueNote && <span className="text-admin-muted"> {row.valueNote}</span>}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-admin-surface-alt"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} /></div>
                    {row.sub && <p className="mt-1 text-caption text-admin-muted">{row.sub}</p>}
                </li>
            ))}
        </ul>
    );
}

/** One bar split into labelled parts (new vs returning, phone vs desktop). Labels sit under the bar so colour is never the only cue. */
export function SplitBar({ parts, caption }) {
    const total = parts.reduce((sum, p) => sum + p.value, 0);
    return (
        <div>
            <div className="flex h-3 overflow-hidden rounded-full bg-admin-surface-alt" role="img" aria-label={caption || parts.map((p) => `${p.label} ${pct(p.value, total)}`).join(', ')}>
                {total > 0 && parts.map((p) => <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-small">
                {parts.map((p) => (
                    <li key={p.key} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                        <span className="text-admin-muted">{p.label}</span>
                        <strong className="font-semibold tabular-nums text-ink">{num(p.value)}</strong>
                        <span className="tabular-nums text-admin-muted">{pct(p.value, total)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
