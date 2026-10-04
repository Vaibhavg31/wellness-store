import { cn } from '@/utils/formatPrice';

export default function Skeleton({ className }) {
    return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />;
}
