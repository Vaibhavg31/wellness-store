import { lazy, Suspense } from 'react';
import Hero from '@/components/home/Hero';
import Seo from '@/components/seo/Seo';
import FeatureRibbon from '@/components/home/FeatureRibbon';
import { BannerSlider, PromoBanners } from '@/components/home/BannerSection';
import CategoryScroller from '@/components/home/CategoryScroller';
import TrendingNow from '@/components/home/TrendingNow';
import MostLoved from '@/components/home/MostLoved';
import WatchShop from '@/components/home/WatchShop';
import BottomRibbon from '@/components/home/BottomRibbon';
import OffersBento from '@/components/home/OffersBento';
import ClubBand from '@/components/home/ClubBand';
import WhyChoose from '@/components/home/WhyChoose';
import Testimonials from '@/components/home/Testimonials';
import NewsletterSection from '@/components/home/NewsletterSection';
import { useProducts } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';

// Optional sections (switched off on a new store, see SECTION_META in the admin) are loaded only when the admin turns
// them on, so every shopper's first download stays small. The ones the store shows by default stay in the page itself.
const VideoBanner = lazy(() => import('@/components/home/VideoBanner'));
const ShopByNeed = lazy(() => import('@/components/home/ShopByNeed'));
const BundleSection = lazy(() => import('@/components/home/BundleSection'));
const DayRitual = lazy(() => import('@/components/home/DayRitual'));
const RoutineBuilder = lazy(() => import('@/components/home/RoutineBuilder'));
const HerbAtlas = lazy(() => import('@/components/home/HerbAtlas'));
const PackExplorerSection = lazy(() => import('@/components/home/PackExplorer/PackExplorerSection'));
const DoshaQuiz = lazy(() => import('@/components/home/DoshaQuiz'));
const InstagramGallery = lazy(() => import('@/components/home/InstagramGallery'));

/** While an optional section's code arrives, a block of roughly its size keeps the page below it from jumping. */
const Later = ({ children }) => <Suspense fallback={<div aria-hidden="true" className="min-h-[28rem]" />}>{children}</Suspense>;

/**
 * One entry per admin-toggleable homepage section (site_section_toggles.section_key).
 * Order and visibility come from the admin's saved settings; this map only supplies the component.
 * Each block has its own shape on purpose, so the page keeps changing pace as it scrolls.
 */
function buildSections({ products, loading }) {
    return {
        hero: () => <Hero products={products} loading={loading} />,
        brandMarquee: () => <FeatureRibbon />,
        videoBanner: () => <Later><VideoBanner /></Later>,
        categories: () => <Later><ShopByNeed /></Later>,
        routineBuilder: () => <Later><RoutineBuilder products={products} /></Later>,
        categoryShelves: () => <CategoryScroller products={products} loading={loading} />,
        trending: () => <TrendingNow />,
        bestSellers: () => <MostLoved />,
        watchShop: () => <WatchShop products={products} />,
        bottomRibbon: () => <BottomRibbon />,
        offersSlider: () => <><OffersBento products={products} /><ClubBand products={products} /></>,
        banners: () => <PromoBanners />,
        bannerSlider: () => <BannerSlider />,
        dayRitual: () => <Later><DayRitual products={products} /></Later>,
        packExplorer: () => <Later><PackExplorerSection products={products} /></Later>,
        herbAtlas: () => <Later><HerbAtlas products={products} /></Later>,
        doshaQuiz: () => <Later><DoshaQuiz products={products} loading={loading} /></Later>,
        bundles: () => <Later><BundleSection /></Later>,
        whyChoose: () => <WhyChoose />,
        reviews: () => <Testimonials />,
        instagram: () => <Later><InstagramGallery /></Later>,
        newsletter: () => <NewsletterSection />,
    };
}

export default function HomePage() {
    const { products, loading } = useProducts();
    const { content } = useSiteContent();
    const sections = content.sections ?? {};
    const renderers = buildSections({ products, loading });

    return (
        <>
            <Seo path="/" />
            <h1 className="sr-only">Chikit: Ayurveda and Wellness</h1>
            {Object.keys(sections)
                .filter((key) => sections[key] !== false && renderers[key])
                .map((key) => <div key={key} className="contents">{renderers[key]()}</div>)}
        </>
    );
}
