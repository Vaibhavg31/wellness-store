import { Link } from 'react-router-dom';
import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }) {
    return (
        <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
            {Icon && (
                <span className="mb-5 grid size-16 place-items-center rounded-full bg-primary-tint text-primary">
                    <Icon size={28} strokeWidth={1.5} />
                </span>
            )}
            <h2 className="text-h3">{title}</h2>
            {description && <p className="mt-2 text-muted">{description}</p>}
            {actionLabel && actionHref && (
                <Link to={actionHref} className="mt-6">
                    <Button>{actionLabel}</Button>
                </Link>
            )}
        </div>
    );
}
