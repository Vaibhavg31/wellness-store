import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ExternalLink, LogOut, Menu, Search } from 'lucide-react';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { loginUrl } from '@/utils/authRedirect';
import PageTransition from '@/components/layout/PageTransition';
import Logo from '@/components/ui/Logo';
import Drawer from '@/components/ui/Drawer';
import AdminNavLinks, { getAdminPageTitle } from '@/components/admin/AdminNavLinks';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';

const footerLink = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-small font-medium text-ink transition-colors hover:bg-primary-soft hover:text-primary';

function SearchTrigger({ onOpen, className = '' }) {
    return (
        <button type="button" onClick={onOpen} className={`flex w-full items-center gap-2 rounded-lg border border-admin-border bg-admin-surface-alt px-3 py-2 text-small text-admin-muted transition-colors hover:border-primary/40 hover:text-ink ${className}`}>
            <Search size={16} aria-hidden="true" />
            <span className="flex-1 text-left">Quick search…</span>
            <kbd className="hidden rounded border border-admin-border px-1.5 text-caption lg:block">Ctrl K</kbd>
        </button>
    );
}

function SidebarBrand() {
    return (
        <div className="border-b border-admin-border px-5 py-3">
            <Logo size="md" />
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-muted">Studio Admin</p>
        </div>
    );
}

function SidebarFooter({ onSignOut, onNavigate }) {
    return (
        <div className="space-y-0.5 border-t border-admin-border p-2.5">
            <a href="/" target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={footerLink}>
                <ExternalLink size={18} strokeWidth={1.75} className="text-admin-muted" aria-hidden="true" /> View store
            </a>
            <button type="button" onClick={onSignOut} className={`${footerLink} hover:!text-danger`}>
                <LogOut size={18} strokeWidth={1.75} className="text-admin-muted" aria-hidden="true" /> Sign out
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
            <aside className="fixed z-30 hidden h-full w-[15.5rem] flex-col border-r border-admin-border bg-admin-surface lg:flex">
                <SidebarBrand />
                <div className="px-2.5 pt-3">
                    <AdminCommandPalette>{(open) => <SearchTrigger onOpen={open} />}</AdminCommandPalette>
                </div>
                <AdminNavLinks location={location} />
                <SidebarFooter onSignOut={adminLogout} />
            </aside>

            {/* Mobile navigation */}
            <Drawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="Studio Admin" side="left" admin>
                <div className="-mx-5 -my-5 flex min-h-full flex-col sm:-mx-6 sm:-my-6">
                    <AdminNavLinks location={location} onNavigate={() => setMobileNavOpen(false)} mobile />
                    <SidebarFooter onSignOut={() => { setMobileNavOpen(false); adminLogout(); }} onNavigate={() => setMobileNavOpen(false)} />
                </div>
            </Drawer>

            <main className="min-h-screen flex-1 bg-admin-bg lg:ml-[15.5rem]">
                {/* Mobile top bar */}
                <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-admin-border bg-admin-surface/95 px-4 py-3 backdrop-blur lg:hidden">
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
                    <p className="ml-auto truncate text-small font-semibold text-ink">{pageTitle}</p>
                </header>

                <div className="max-w-[1440px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8">
                    <PageTransition />
                </div>
            </main>
        </div>
    );
}
