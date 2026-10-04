import { getStatusLabel } from '@/constants/orders';
import { cn } from '@/utils/formatPrice';

const NEGATIVE = new Set(['cancelled', 'returned']);

/**
 * Horizontal bars of how many orders are in each status. One hue; only the negative outcomes
 * (cancelled / returned) switch to the danger colour so they stand out. Values sit at the bar tip,
 * so nothing depends on hover. `rows` = [{ status, count }], `total` = number of orders.
 */
export default function OrderStatusChart({ rows, total }) {
    const max = Math.max(1, ...rows.map((r) => r.count));

    return (
        <ul className="space-y-3" aria-label="Orders by status">
            {rows.map(({ status, count }) => {
                const share = Math.round((count / total) * 100);
                const negative = NEGATIVE.has(status);
                return (
                    <li key={status} className="group relative grid grid-cols-[7.5rem_1fr] items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40" tabIndex={0}>
                        <span className="truncate text-small text-ink">{getStatusLabel(status)}</span>
                        <span className="flex items-center gap-2">
                            <span
                                className={cn('block h-4 rounded-r-[4px] transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80', negative ? 'bg-danger' : 'bg-primary')}
                                style={{ width: `${Math.max(1, (count / max) * 100)}%`, minWidth: 4 }}
                                aria-hidden="true"
                            />
                            <span className="shrink-0 text-small font-semibold tabular-nums text-ink">{count}</span>
                        </span>
                        <span role="tooltip" className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md border border-admin-border bg-admin-surface px-2 py-1 text-caption text-ink opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            {count} of {total} orders · {share}%
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
