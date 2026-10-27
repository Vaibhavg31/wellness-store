import { buildStatusHistory } from '@/constants/orders';
import OrderStatusBadge from './OrderStatusBadge';

export default function OrderTimeline({ order }) {
    const history = [...buildStatusHistory(order)].reverse();

    return (
        <div className="space-y-0">
            {history.map((entry, i) => (
                <div key={`${entry.status}-${entry.at}-${i}`} className="flex gap-3 relative pb-5 last:pb-0">
                    {i < history.length - 1 && (
                        <div className="absolute left-[7px] top-4 w-px h-[calc(100%-4px)] bg-line/50" />
                    )}
                    <div className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-canvas flex-shrink-0 mt-0.5 z-10" />
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <OrderStatusBadge status={entry.status} />
                            {entry.by && entry.by !== 'system' && (
                                <span className="text-[10px] uppercase tracking-wider text-muted/60">by {entry.by}</span>
                            )}
                        </div>
                        {entry.note && (
                            <p className="text-sm text-ink/80">{entry.note}</p>
                        )}
                        <p className="text-xs text-muted/70 mt-1">
                            {entry.at
                                ? new Date(entry.at).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })
                                : '—'}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
