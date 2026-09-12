import { buildStatusHistory } from '@/constants/orders';
import OrderStatusBadge from './OrderStatusBadge';

export default function OrderTimeline({ order }) {
    const history = [...buildStatusHistory(order)].reverse();

    return (
        <div className="space-y-0">
            {history.map((entry, i) => (
                <div key={`${entry.status}-${entry.at}-${i}`} className="flex gap-3 relative pb-5 last:pb-0">
                    {i < history.length - 1 && (
                        <div className="absolute left-[7px] top-4 w-px h-[calc(100%-4px)] bg-border/50" />
                    )}
                    <div className="w-3.5 h-3.5 rounded-full bg-wine border-2 border-ivory flex-shrink-0 mt-0.5 z-10" />
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <OrderStatusBadge status={entry.status} />
                            {entry.by && entry.by !== 'system' && (
                                <span className="text-[10px] uppercase tracking-wider text-soft-brown/60">by {entry.by}</span>
                            )}
                        </div>
                        {entry.note && (
                            <p className="text-sm text-charcoal/80">{entry.note}</p>
                        )}
                        <p className="text-xs text-soft-brown/70 mt-1">
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
