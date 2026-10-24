import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { cn } from '@/utils/formatPrice';

/** Page title block with optional breadcrumb trail. */
/** `compact` (listing pages): on phones drop the intro line and tighten spacing so products start sooner. */
export default function PageHeader({ eyebrow, title, description, crumbs, className, children, compact = false }) {
    return (
        <header className={cn('border-b border-line bg-canvas-alt', className)}>
            <div className={cn('container-page sm:py-14', compact ? 'py-5' : 'py-7')}>
                {crumbs?.length > 0 && <Breadcrumbs crumbs={crumbs} className="mb-4" />}
                {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
                <h1>{title}</h1>
                {description && <p className={cn('mt-3 max-w-2xl text-body text-muted sm:text-lead', compact && 'hidden sm:block')}>{description}</p>}
                {children}
            </div>
        </header>
    );
}
