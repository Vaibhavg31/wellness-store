import { Link } from 'react-router-dom';
import AutoHeight from '@/components/ui/AutoHeight';
import Logo from '@/components/ui/Logo';

/**
 * Standalone layout for sign-in / password / verification screens.
 * `aside` is an optional brand panel shown beside the card on large screens.
 * `wide` hands the whole width to its children (used by the sliding sign-in / sign-up card, which brings its own frame).
 */
export default function AuthShell({ aside, children, backTo = '/', backLabel = '← Back to store', animateHeight = true, wide = false }) {
    if (wide) {
        return (
            <main className="grid min-h-dvh place-items-center overflow-x-clip bg-canvas px-4 py-10">
                <div className="w-full max-w-5xl animate-rise-in">
                    {children}
                    {backTo && <Link to={backTo} className="mt-6 flex min-h-11 items-center justify-center text-center text-small text-muted hover:text-primary">{backLabel}</Link>}
                </div>
            </main>
        );
    }
    return (
        <main className="min-h-dvh overflow-x-clip bg-canvas">
            <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-1 items-center gap-12 px-4 py-10 lg:grid-cols-2 lg:gap-20">
                {aside ? (
                    <aside className="hidden animate-swipe-in-left rounded-xl bg-primary-tint p-12 lg:block">
                        <Logo size="lg" linkToHome />
                        <div className="mt-12">{aside}</div>
                    </aside>
                ) : <div className="hidden lg:block" />}

                <div className="mx-auto w-full min-w-0 max-w-md animate-rise-in lg:animate-swipe-in">
                    <div className="mb-6 flex justify-center lg:hidden"><Logo size="lg" linkToHome /></div>
                    <div className="rounded-xl border border-line bg-surface p-6 shadow-md sm:p-10">{animateHeight ? <AutoHeight>{children}</AutoHeight> : children}</div>
                    {backTo && <Link to={backTo} className="mt-6 flex min-h-11 items-center justify-center text-center text-small text-muted hover:text-primary">{backLabel}</Link>}
                </div>
            </div>
        </main>
    );
}
