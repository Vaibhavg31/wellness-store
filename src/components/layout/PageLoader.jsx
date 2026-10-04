import Logo from '@/components/ui/Logo';

/**
 * Route-level Suspense fallback. Reserves the page area (so the footer doesn't jump while a chunk loads) and
 * shows the official logo breathing above a small sliding bar. Opacity/transform animations only.
 */
export default function PageLoader({ message = 'Loading…' }) {
    return (
        <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-6">
                <Logo size="lg" className="animate-breathe" />
                <span className="relative block h-[3px] w-28 overflow-hidden rounded-full bg-primary-tint" aria-hidden="true">
                    <span className="absolute inset-y-0 left-0 w-1/2 animate-loader-slide rounded-full bg-primary" />
                </span>
                <span className="sr-only">{message}</span>
            </div>
        </div>
    );
}
