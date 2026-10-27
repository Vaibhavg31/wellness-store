import { cn } from '@/utils/formatPrice';

const variants = {
    default: 'bg-canvas-alt text-ink',
    new: 'bg-primary text-white',
    bestseller: 'bg-accent text-ink',
    sale: 'bg-primary-deep text-white',
    stock: 'bg-canvas-alt text-muted border border-line',
    tint: 'bg-primary-tint text-primary-deep',
    success: 'bg-success-tint text-success',
    warning: 'bg-warning-tint text-warning',
    danger: 'bg-danger-tint text-danger',
    info: 'bg-info-tint text-info',
};

export default function Badge({ children, variant = 'default', className }) {
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold', variants[variant], className)}>
            {children}
        </span>
    );
}
