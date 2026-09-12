import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PromoBanner from '@/components/layout/PromoBanner';
import PageTransition from '@/components/layout/PageTransition';
import { useSeoMeta } from '@/hooks/useSeoMeta';

export default function MainLayout() {
  useSeoMeta();

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />
      <Navbar />
      <main className="flex-1 pt-[var(--site-header-h,7rem)]">
        <PageTransition />
      </main>
      <Footer />
    </div>
  );
}
