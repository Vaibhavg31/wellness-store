import Hero from '@/components/home/Hero';
import Seo from '@/components/seo/Seo';
import FeatureRibbon from '@/components/home/FeatureRibbon';
import NeedsRow from '@/components/home/NeedsRow';
import OffersBento from '@/components/home/OffersBento';
import ClubBand from '@/components/home/ClubBand';
import { BannerSlider } from '@/components/home/BannerSection';
import CategoryScroller from '@/components/home/CategoryScroller';
import TrendingNow from '@/components/home/TrendingNow';
import WatchShop from '@/components/home/WatchShop';
import WellRange from '@/components/home/WellRange';
import BottomRibbon from '@/components/home/BottomRibbon';
import WhyChoose from '@/components/home/WhyChoose';
import Testimonials from '@/components/home/Testimonials';
import { useProducts } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';

/**
 * The home page, in a fixed order built for how people shop: a promise, trust, a way in by health goal, the offers, the Club, then the
 * whole range on one page, and finally proof. The admin's section switches still apply to the parts that have one.
 */
export default function HomePage() {
    const { products, loading } = useProducts();
    const { content } = useSiteContent();
    const on = (key) => content.sections?.[key] !== false;

    return (
        <>
            <Seo path="/" />
            <h1 className="sr-only">Chikit: Ayurveda and Wellness</h1>
            <Hero products={products} loading={loading} />
            {on('brandMarquee') && <FeatureRibbon />}
            <NeedsRow />
            {on('offersSlider') && <OffersBento products={products} />}
            <ClubBand products={products} />
            {on('bannerSlider') && <BannerSlider />}
            {on('trending') && <TrendingNow />}
            {on('categoryShelves') && <CategoryScroller products={products} loading={loading} />}
            {on('wellRange') && <WellRange products={products} />}
            {on('watchShop') && <WatchShop products={products} />}
            {on('whyChoose') && <WhyChoose />}
            {on('reviews') && <Testimonials />}
            {on('bottomRibbon') && <BottomRibbon />}
        </>
    );
}
