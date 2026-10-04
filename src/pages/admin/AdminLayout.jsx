import { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X } from 'lucide-react';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { loginUrl } from '@/utils/authRedirect';
import PageTransition from '@/components/layout/PageTransition';
import Logo from '@/components/ui/Logo';
import AdminNavLinks, { getAdminPageTitle } from '@/components/admin/AdminNavLinks';

function AdminSidebarHeader() {
    return (
        <div className="p-5 border-b border-cream/10">
            <Logo size="sm" linkToHome showHover={false} withWordmark className="mb-1.5 text-cream" />
            <p className="text-[10px] tracking-[0.18em] uppercase text-cream/55 font-medium">Studio Admin</p>
        </div>
    );
}

export default function AdminLayout() {
    const { isAdmin, adminLogout } = useAdminAuth();
    const location = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const pageTitle = getAdminPageTitle(location.pathname);
    const closeMobileNav = () => setMobileNavOpen(false);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!mobileNavOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mobileNavOpen]);

    useEffect(() => {
        if (!mobileNavOpen) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') setMobileNavOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [mobileNavOpen]);

    if (!isAdmin) {
        return <Navigate to={loginUrl(ADMIN_PATH)} replace />;
    }

    return (
        <div className="admin-panel min-h-screen flex">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex w-[15.5rem] bg-forest-deep text-cream flex-col fixed h-full z-30 shadow-xl shadow-forest/20 overflow-hidden">
                <AdminSidebarHeader />
                <AdminNavLinks location={location} />
                <button
                    onClick={adminLogout}
                    className="flex-shrink-0 flex items-center gap-3 px-5 py-4 text-cream/65 hover:text-cream hover:bg-cream/5 border-t border-cream/10 transition-colors text-sm font-medium"
                >
                    <LogOut size={17} strokeWidth={1.25} />
                    Sign Out
                </button>
            </aside>

            {/* Mobile nav drawer */}
            <AnimatePresence>
                {mobileNavOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-40 bg-ink/55 backdrop-blur-[3px] lg:hidden"
                            onClick={closeMobileNav}
                            aria-hidden="true"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                            className="fixed top-0 left-0 bottom-0 z-50 w-[min(15.5rem,88vw)] bg-forest-deep text-cream flex flex-col shadow-xl shadow-forest/30 lg:hidden overflow-hidden"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Admin navigation"
                        >
                            <div className="flex items-start justify-between gap-3 p-4 border-b border-cream/10 pt-[max(1rem,env(safe-area-inset-top))]">
                                <div className="min-w-0">
                                    <Logo size="sm" linkToHome showHover={false} withWordmark className="mb-1 text-cream" />
                                    <p className="text-[10px] tracking-[0.18em] uppercase text-cream/55 font-medium">
                                        Studio Admin
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeMobileNav}
                                    className="flex-shrink-0 p-2 -mr-1 rounded-lg text-cream/70 hover:text-cream hover:bg-cream/10 transition-colors"
                                    aria-label="Close menu"
                                >
                                    <X size={20} strokeWidth={1.25} />
                                </button>
                            </div>
                            <AdminNavLinks location={location} onNavigate={closeMobileNav} mobile />
                            <button
                                type="button"
                                onClick={() => {
                                    closeMobileNav();
                                    adminLogout();
                                }}
                                className="flex-shrink-0 flex items-center gap-3 px-5 py-4 text-cream/65 hover:text-cream hover:bg-cream/5 border-t border-cream/10 transition-colors text-sm font-medium pb-[max(1rem,env(safe-area-inset-bottom))]"
                            >
                                <LogOut size={17} strokeWidth={1.25} />
                                Sign Out
                            </button>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <main className="flex-1 min-h-screen bg-admin-bg lg:ml-[15.5rem]">
                {/* Mobile top bar */}
                <header
                    className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-admin-bg/95 backdrop-blur-md border-b border-admin-border shadow-sm lg:hidden pt-[max(0.75rem,env(safe-area-inset-top))]"
                >
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        className="flex-shrink-0 p-2 -ml-1 rounded-lg text-ink hover:bg-forest/5 active:bg-forest/10 transition-colors"
                        aria-label="Open menu"
                        aria-expanded={mobileNavOpen}
                    >
                        <Menu size={22} strokeWidth={1.5} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] tracking-[0.16em] uppercase text-admin-muted font-medium leading-none">
                            Studio Admin
                        </p>
                        <h1 className="text-base font-semibold text-ink truncate mt-0.5">{pageTitle}</h1>
                    </div>
                </header>

                <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <PageTransition />
                </div>
            </main>
        </div>
    );
}
