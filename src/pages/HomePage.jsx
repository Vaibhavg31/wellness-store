import Hero from '@/components/home/Hero';
import Seo from '@/components/seo/Seo';
import TrustStrip from '@/components/home/TrustStrip';
import VideoBanner from '@/components/home/VideoBanner';
import { BannerSlider, PromoBanners } from '@/components/home/BannerSection';
import CategoryGrid from '@/components/home/CategoryGrid';
import ProductSection from '@/components/home/ProductSection';
import BundleSection from '@/components/home/BundleSection';
import WhyChoose from '@/components/home/WhyChoose';
import CertifiedBanner from '@/components/home/CertifiedBanner';
import Testimonials from '@/components/home/Testimonials';
import InstagramGallery from '@/components/home/InstagramGallery';
import NewsletterSection from '@/components/home/NewsletterSection';
import { useProducts, useTrendingProducts } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';

/**
 * One entry per admin-toggleable homepage section (site_section_toggles.section_key).
 * Order and visibility come from the admin's saved settings; this map only supplies the component.
 */
function buildSections({ products, loading, trending, featured }) {
    return {
        hero: () => <Hero products={products} loading={loading} />,
        brandMarquee: () => <TrustStrip />,
        videoBanner: () => <VideoBanner />,
        banners: () => <PromoBanners />,
        bannerSlider: () => <BannerSlider />,
        featured: () => (
            <ProductSection
                eyebrow={featured.stylesTitle}
                title={featured.collectionTitle}
                products={products}
                loading={loading}
                count={featured.productCount}
                viewAllLabel={featured.viewAllLabel}
            />
        ),
        trending: () => <ProductSection eyebrow="Customer favourites" title="Trending now" products={trending} count={4} tint />,
        categories: () => <CategoryGrid />,
        bundles: () => <BundleSection />,
        whyChoose: () => <WhyChoose />,
        certifiedBanner: () => <CertifiedBanner />,
        reviews: () => <Testimonials />,
        instagram: () => <InstagramGallery />,
        newsletter: () => <NewsletterSection />,
    };
}

export default function HomePage() {
    const { products, loading } = useProducts();
    const { products: trending } = useTrendingProducts();
    const { content } = useSiteContent();
    const sections = content.sections ?? {};
    const renderers = buildSections({ products, loading, trending, featured: content.featured });

    return (
        <>
            <Seo path="/" />
            {Object.keys(sections)
                .filter((key) => sections[key] !== false && renderers[key])
                .map((key) => <div key={key} className="contents">{renderers[key]()}</div>)}
        </>
    );
}
