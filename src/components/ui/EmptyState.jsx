import { Link } from 'react-router-dom';
import Button from './Button';

/** `as` sets the heading level: use "h1" when this is the main content of a page. */
export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, as: Heading = 'h2' }) {
    return (
        <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
            {Icon && (
                <span className="mb-5 grid size-16 place-items-center rounded-full bg-primary-tint text-primary">
                    <Icon size={28} strokeWidth={1.5} />
                </span>
            )}
            <Heading className="text-h3">{title}</Heading>
            {description && <p className="mt-2 text-muted">{description}</p>}
            {actionLabel && actionHref && (
                <Link to={actionHref} className="mt-6">
                    <Button>{actionLabel}</Button>
                </Link>
            )}
        </div>
    );
}
