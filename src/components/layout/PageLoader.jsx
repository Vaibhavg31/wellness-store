/** Route-level Suspense fallback — reserves space so the footer doesn't jump while a page chunk loads. */
export default function PageLoader({ message = 'Loading…' }) {
    return (
        <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-4 text-muted">
                <span className="size-8 animate-spin rounded-full border-2 border-primary-tint border-t-primary" aria-hidden="true" />
                <span className="text-small">{message}</span>
            </div>
        </div>
    );
}
