import { Suspense } from 'react';
import PageLoader from '@/components/layout/PageLoader';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileTabBar from '@/components/layout/MobileTabBar';
import PageTransition from '@/components/layout/PageTransition';
import CartDrawer from '@/components/cart/CartDrawer';
import ClubSheet from '@/components/commerce/ClubSheet';
import SiteSchema from '@/components/seo/SiteSchema';
import BackToTop from '@/components/layout/BackToTop';

export default function MainLayout() {
    return (
        <div className="flex min-h-dvh flex-col">
            <SiteSchema />
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-white">
                Skip to content
            </a>
            <AnnouncementBar />
            <Header />
            <CartDrawer />
            <ClubSheet />
            <main id="main" className="min-h-[100dvh] flex-1">
                <Suspense fallback={<PageLoader />}>
                    <PageTransition />
                </Suspense>
            </main>
            <Footer />
            <MobileTabBar />
            <BackToTop />
        </div>
    );
}
