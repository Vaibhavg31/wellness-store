import Hero from '@/components/home/Hero';
import Seo from '@/components/seo/Seo';
import TrustStrip from '@/components/home/TrustStrip';
import VideoBanner from '@/components/home/VideoBanner';
import { BannerSlider, PromoBanners } from '@/components/home/BannerSection';
import ShopByNeed from '@/components/home/ShopByNeed';
import RangeRail from '@/components/home/RangeRail';
import BundleSection from '@/components/home/BundleSection';
import DayRitual from '@/components/home/DayRitual';
import HerbAtlas from '@/components/home/HerbAtlas';
import PackExplorerSection from '@/components/home/PackExplorer/PackExplorerSection';
import DoshaQuiz from '@/components/home/DoshaQuiz';
import WhyChoose from '@/components/home/WhyChoose';
import Testimonials from '@/components/home/Testimonials';
import InstagramGallery from '@/components/home/InstagramGallery';
import NewsletterSection from '@/components/home/NewsletterSection';
import { useProducts } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';

/**
 * One entry per admin-toggleable homepage section (site_section_toggles.section_key).
 * Order and visibility come from the admin's saved settings; this map only supplies the component.
 * Each block has its own shape on purpose, so the page keeps changing pace as it scrolls.
 */
function buildSections({ products, loading }) {
    return {
        hero: () => <Hero products={products} loading={loading} />,
        brandMarquee: () => <TrustStrip />,
        videoBanner: () => <VideoBanner />,
        categories: () => <ShopByNeed />,
        categoryShelves: () => <RangeRail products={products} loading={loading} />,
        banners: () => <PromoBanners />,
        bannerSlider: () => <BannerSlider />,
        dayRitual: () => <DayRitual products={products} />,
        packExplorer: () => <PackExplorerSection products={products} />,
        herbAtlas: () => <HerbAtlas products={products} />,
        doshaQuiz: () => <DoshaQuiz products={products} loading={loading} />,
        bundles: () => <BundleSection />,
        whyChoose: () => <WhyChoose />,
        reviews: () => <Testimonials />,
        instagram: () => <InstagramGallery />,
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
            {Object.keys(sections)
                .filter((key) => sections[key] !== false && renderers[key])
                .map((key) => <div key={key} className="contents">{renderers[key]()}</div>)}
        </>
    );
}
