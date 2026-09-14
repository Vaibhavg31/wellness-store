import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PromoBanner from '@/components/layout/PromoBanner';
import PageTransition from '@/components/layout/PageTransition';
import CartDrawer from '@/components/cart/CartDrawer';
import { useSeoMeta } from '@/hooks/useSeoMeta';

export default function MainLayout() {
  useSeoMeta();

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />
      <Navbar />
      <CartDrawer />
      {/* A little extra breathing room before the footer on short pages —
          the actual fix for the fixed WhatsApp bubble covering page content
          (confirmed on the checkout sign-in gate and the Contact form) is
          in WhatsAppButton itself: a smaller footprint plus hiding while a
          field has focus, since this padding can't move content that's
          already above it out from under a viewport-fixed element. */}
      <main className="flex-1 pt-[var(--site-header-h,7rem)] pb-16">
        <PageTransition />
      </main>
      <Footer />
    </div>
  );
}
