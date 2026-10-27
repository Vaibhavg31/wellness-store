import { cn } from '@/utils/formatPrice';
import { getStatusLabel, normalizeStatus, STATUS_COLORS } from '@/constants/orders';

export default function OrderStatusBadge({ status, audience = 'admin', className }) {
    const normalized = normalizeStatus(status);
    const label = getStatusLabel(status, audience);
    const colors = STATUS_COLORS[normalized] || STATUS_COLORS[status] || 'bg-canvas-alt text-muted border-line';

    return (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', colors, className)}>
            {label}
        </span>
    );
}
