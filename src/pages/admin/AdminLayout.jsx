import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ExternalLink, LogOut, Menu, Search } from 'lucide-react';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { loginUrl } from '@/utils/authRedirect';
import { Suspense } from 'react';
import PageLoader from '@/components/layout/PageLoader';
import PageTransition from '@/components/layout/PageTransition';
import Logo from '@/components/ui/Logo';
import Drawer from '@/components/ui/Drawer';
import AdminNavLinks, { getAdminPageTitle } from '@/components/admin/AdminNavLinks';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';

const footerLink = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-small font-medium transition-colors';
const footerLinkLight = `${footerLink} text-ink hover:bg-primary-soft hover:text-primary`;
const footerLinkDark = `${footerLink} text-white/75 hover:bg-white/8 hover:text-white`;

function SearchTrigger({ onOpen, className = '' }) {
    return (
        <button type="button" onClick={onOpen} className={`flex w-full items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-small text-white/70 transition-colors hover:bg-white/12 hover:text-white ${className}`}>
            <Search size={16} aria-hidden="true" />
            <span className="flex-1 text-left">Quick search…</span>
            <kbd className="hidden rounded border border-white/20 px-1.5 text-caption text-white/60 lg:block">Ctrl K</kbd>
        </button>
    );
}

function SidebarBrand() {
    // The logo is single-colour plum, so on the plum sidebar it always sits on a cream tile.
    return (
        <div className="px-4 pb-0.5 pt-3">
            <Link to={ADMIN_PATH} aria-label="Admin dashboard" className="flex justify-center rounded-xl bg-canvas px-3 py-1.5 shadow-sm">
                <Logo size="sm" />
            </Link>
            <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Studio admin</p>
        </div>
    );
}

function SidebarFooter({ onSignOut, onNavigate, dark = false }) {
    const link = dark ? footerLinkDark : footerLinkLight;
    const icon = dark ? "text-white/55" : "text-admin-muted";
    return (
        <div className={`grid grid-cols-2 gap-1 border-t px-3 py-2 ${dark ? "border-white/10" : "border-admin-border"}`}>
            <a href="/" target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={`${link} !gap-2 !px-2.5 whitespace-nowrap`}>
                <ExternalLink size={16} strokeWidth={1.75} className={icon} aria-hidden="true" /> View site
            </a>
            <button type="button" onClick={onSignOut} className={`${link} !gap-2 !px-2.5 ${dark ? "hover:!text-white" : "hover:!text-danger"}`}>
                <LogOut size={16} strokeWidth={1.75} className={icon} aria-hidden="true" /> Sign out
            </button>
        </div>
    );
}

export default function AdminLayout() {
    const { isAdmin, adminLogout } = useAdminAuth();
    const location = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const pageTitle = getAdminPageTitle(location.pathname);

    useEffect(() => setMobileNavOpen(false), [location.pathname]);

    if (!isAdmin) {
        return <Navigate to={loginUrl(ADMIN_PATH)} replace />;
    }

    return (
        <div className="admin-panel flex min-h-screen">
            {/* Desktop sidebar */}
            <aside className="admin-sidebar fixed z-30 hidden h-full w-[15.5rem] flex-col lg:flex">
                <SidebarBrand />
                <div className="px-3 pt-2.5">
                    <AdminCommandPalette>{(open) => <SearchTrigger onOpen={open} />}</AdminCommandPalette>
                </div>
                <AdminNavLinks location={location} tone="dark" />
                <SidebarFooter onSignOut={adminLogout} dark />
            </aside>

            {/* Mobile navigation */}
            <Drawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="Studio Admin" side="left" admin>
                <div className="-mx-5 -my-5 flex min-h-full flex-col sm:-mx-6 sm:-my-6">
                    <AdminNavLinks location={location} onNavigate={() => setMobileNavOpen(false)} mobile />
                    <SidebarFooter onSignOut={() => { setMobileNavOpen(false); adminLogout(); }} onNavigate={() => setMobileNavOpen(false)} />
                </div>
            </Drawer>

            <main className="min-h-screen min-w-0 flex-1 bg-admin-bg lg:ml-[15.5rem]">
                {/* Mobile top bar */}
                <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-admin-border bg-admin-surface/95 px-4 py-3 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        className="-ml-1 grid size-10 shrink-0 place-items-center rounded-lg text-ink hover:bg-primary-soft"
                        aria-label="Open menu"
                        aria-expanded={mobileNavOpen}
                    >
                        <Menu size={22} strokeWidth={1.75} />
                    </button>
                    <Link to={ADMIN_PATH} className="shrink-0" aria-label="Admin dashboard"><Logo size="sm" /></Link>
                    <h1 className="ml-auto truncate font-sans text-small font-semibold text-ink">{pageTitle}</h1>
                </header>

                <div className="max-w-[1440px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8">
                    <Suspense fallback={<PageLoader />}>
                        <PageTransition />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}
