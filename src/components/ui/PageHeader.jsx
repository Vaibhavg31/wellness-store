import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { cn } from '@/utils/formatPrice';

/**
 * The title block at the top of a page: a light beige band with the breadcrumb trail, a big serif title and a short intro.
 * `compact` (listing pages): on phones the intro line is dropped and spacing tightened so products start sooner.
 */
export default function PageHeader({ eyebrow, title, description, crumbs, className, children, compact = false }) {
    return (
        <header className={cn('border-b border-line bg-accent-tint', className)}>
            <div className={cn('container-page sm:py-12', compact ? 'py-6' : 'py-9')}>
                {crumbs?.length > 0 && <Breadcrumbs crumbs={crumbs} className="mb-4" />}
                {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
                <h1 className="text-h2 text-primary-deep sm:text-h1">{title}</h1>
                {description && <p className={cn('mt-3 max-w-2xl text-body text-muted sm:text-lead', compact && 'hidden sm:block')}>{description}</p>}
                {children}
            </div>
        </header>
    );
}
