import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { cn } from '@/utils/formatPrice';

/** Page title block with optional breadcrumb trail. */
export default function PageHeader({ eyebrow, title, description, crumbs, className, children }) {
    return (
        <header className={cn('border-b border-line bg-canvas-alt', className)}>
            <div className="container-page py-10 sm:py-14">
                {crumbs?.length > 0 && <Breadcrumbs crumbs={crumbs} className="mb-4" />}
                {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
                <h1>{title}</h1>
                {description && <p className="mt-3 max-w-2xl text-lead text-muted">{description}</p>}
                {children}
            </div>
        </header>
    );
}
