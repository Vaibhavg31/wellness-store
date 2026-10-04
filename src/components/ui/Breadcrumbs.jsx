import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** crumbs = [{ label, href? }] — the last crumb is the current page. */
export default function Breadcrumbs({ crumbs, className }) {
    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex flex-wrap items-center gap-1 text-small text-muted">
                {crumbs.map((crumb, i) => (
                    <li key={crumb.label} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
                        {crumb.href ? <Link to={crumb.href} className="hover:text-primary">{crumb.label}</Link> : <span aria-current="page" className="text-ink">{crumb.label}</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
