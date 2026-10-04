import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';

/**
 * Standalone layout for sign-in / password / verification screens.
 * `aside` is an optional brand panel shown beside the card on large screens.
 */
export default function AuthShell({ aside, children, backTo = '/', backLabel = '← Back to store' }) {
    return (
        <main className="min-h-dvh bg-canvas">
            <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-2 lg:gap-20">
                {aside ? (
                    <aside className="hidden rounded-xl bg-primary-tint p-12 lg:block">
                        <Logo size="lg" linkToHome />
                        <div className="mt-12">{aside}</div>
                    </aside>
                ) : <div className="hidden lg:block" />}

                <div className="mx-auto w-full max-w-md">
                    <div className="mb-6 flex justify-center lg:hidden"><Logo size="lg" linkToHome /></div>
                    <div className="rounded-xl border border-line bg-surface p-6 shadow-md sm:p-10">{children}</div>
                    {backTo && <Link to={backTo} className="mt-6 block text-center text-small text-muted hover:text-primary">{backLabel}</Link>}
                </div>
            </div>
        </main>
    );
}
