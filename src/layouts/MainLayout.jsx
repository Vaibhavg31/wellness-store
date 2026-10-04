import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PageTransition from '@/components/layout/PageTransition';
import CartDrawer from '@/components/cart/CartDrawer';
import { useSeoMeta } from '@/hooks/useSeoMeta';

export default function MainLayout() {
    useSeoMeta();

    return (
        <div className="flex min-h-dvh flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-white">
                Skip to content
            </a>
            <AnnouncementBar />
            <Header />
            <CartDrawer />
            <main id="main" className="min-h-[100dvh] flex-1">
                <PageTransition />
            </main>
            <Footer />
        </div>
    );
}
