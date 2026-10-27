import { cn } from '@/utils/formatPrice';

export default function SectionHeader({ eyebrow, title, description, align = 'center', as: Tag = 'h2', className, action }) {
    const centered = align === 'center';
    return (
        <div
            className={cn(
                'mb-10 flex flex-col gap-3 lg:mb-14',
                centered ? 'items-center text-center' : 'items-start',
                action && 'sm:flex-row sm:items-end sm:justify-between',
                className,
            )}
        >
            <div className={cn('max-w-2xl', centered && 'mx-auto')}>
                {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
                <Tag>{title}</Tag>
                {description && <p className="mt-3 text-lead text-muted">{description}</p>}
            </div>
            {action}
        </div>
    );
}
