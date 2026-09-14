import { lazy, Suspense, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import BrandMarquee from '@/components/home/BrandMarquee';
import HeroCinematic from '@/components/home/HeroCinematic';
import VideoBanner from '@/components/home/VideoBanner';
import QuickShop from '@/components/home/QuickShop';
import Categories from '@/components/home/Categories';
import BundleShowcase from '@/components/home/BundleShowcase';
import WhyChoose from '@/components/home/WhyChoose';
import CertifiedBanner from '@/components/home/CertifiedBanner';
import CustomerReviews from '@/components/home/CustomerReviews';
import InstagramStrip from '@/components/home/InstagramStrip';
import InstagramGallery from '@/components/home/InstagramGallery';
import Newsletter from '@/components/home/Newsletter';
import TrendingProducts from '@/components/home/TrendingProducts';
import PromoBanners from '@/components/home/PromoBanners';
import BannerSlider from '@/components/home/BannerSlider';
import OrbitShowcase from '@/components/home/OrbitShowcase';
import { useProducts } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { FALLBACK_PRODUCTS } from '@/data/fallbackProducts';

const RitualBuilder = lazy(() => import('@/components/home/RitualBuilder'));
const WellnessJourney = lazy(() => import('@/components/home/WellnessJourney'));
const BodyMap = lazy(() => import('@/components/home/BodyMap'));
const SourceTrail = lazy(() => import('@/components/home/SourceTrail'));

function ProductSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="aspect-[3/4] rounded-2xl bg-sand/80 mb-4" />
            <div className="h-3 w-16 bg-sand/80 rounded mb-2" />
            <div className="h-4 w-full bg-sand/60 rounded mb-2" />
            <div className="h-4 w-20 bg-sand/60 rounded" />
        </div>
    );
}

function FeaturedSkeleton() {
    return (
        <section className="py-16 bg-cream">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="h-8 w-48 bg-sand/80 rounded animate-pulse mb-10" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <ProductSkeleton key={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

/**
 * One entry per site_section_toggles.section_key. Order is data-driven (see
 * SiteContentContext / SettingsRepository::fetchSections) so admins can
 * reorder homepage sections without a code change — this map only supplies
 * the component(s) and any props a section needs beyond site content.
 */
function buildSectionRenderers({ displayProducts, loading, error }) {
    return {
        hero: () => <HeroCinematic key="hero" products={displayProducts} />,
        videoBanner: () => <VideoBanner key="videoBanner" />,
        brandMarquee: () => <BrandMarquee key="brandMarquee" />,
        banners: () => <PromoBanners key="banners" />,
        bannerSlider: () => <BannerSlider key="bannerSlider" />,
        instagram: () => (
            <span key="instagram" style={{ display: 'contents' }}>
                <InstagramStrip />
                <InstagramGallery />
            </span>
        ),
        featured: () => (
            <span key="featured" style={{ display: 'contents' }}>
                {loading ? <FeaturedSkeleton /> : <QuickShop products={displayProducts} apiError={error} />}
            </span>
        ),
        trending: () => <TrendingProducts key="trending" />,
        categories: () => <Categories key="categories" />,
        bundles: () => <BundleShowcase key="bundles" />,
        ritualBuilder: () => (
            <Suspense key="ritualBuilder" fallback={<div className="h-[32rem] bg-cream animate-pulse" aria-hidden="true" />}>
                <RitualBuilder products={displayProducts} />
            </Suspense>
        ),
        wellnessJourney: () => (
            <Suspense key="wellnessJourney" fallback={<div className="h-[32rem] bg-[#0F5132] animate-pulse" aria-hidden="true" />}>
                <WellnessJourney products={displayProducts} />
            </Suspense>
        ),
        bodyMap: () => (
            <Suspense key="bodyMap" fallback={<div className="h-[32rem] bg-[#0A3D25] animate-pulse" aria-hidden="true" />}>
                <BodyMap products={displayProducts} />
            </Suspense>
        ),
        sourceTrail: () => (
            <Suspense key="sourceTrail" fallback={<div className="h-[32rem] bg-[#0A3D25] animate-pulse" aria-hidden="true" />}>
                <SourceTrail products={displayProducts} />
            </Suspense>
        ),
        whyChoose: () => <WhyChoose key="whyChoose" />,
        certifiedBanner: () => <CertifiedBanner key="certifiedBanner" />,
        reviews: () => <CustomerReviews key="reviews" />,
        newsletter: () => <Newsletter key="newsletter" />,
    };
}

export default function HomePage() {
    const { products, loading, error } = useProducts();
    const { content } = useSiteContent();
    const sections = content.sections ?? {};

    const displayProducts = products.length > 0 ? products : FALLBACK_PRODUCTS;
    const renderers = buildSectionRenderers({ displayProducts, loading, error });

    // Scroll-pinned sections further down the page (e.g. WellnessJourney)
    // measure their trigger start/end against document position at mount.
    // Product data, skeleton→real-content swaps, and lazy image loads all
    // resize the sections above them *after* that measurement, which drifts
    // the pin timing without GSAP knowing. Re-measure once loading settles
    // and once more after everything has painted.
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        let raf2;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [loading, products.length]);

    // OrbitShowcase isn't one of the admin-toggleable sections (it's a new,
    // fixed-position feature, not a CMS field) — it's spliced in right after
    // the hero however the admin has the rest of the page ordered, rather
    // than always landing at a fixed index that could put it somewhere odd.
    const orderedKeys = Object.keys(sections).filter((key) => sections[key] !== false && renderers[key]);

    return (
        <>
            {orderedKeys.map((key) => (
                <span key={key} style={{ display: 'contents' }}>
                    {renderers[key]()}
                    {key === 'hero' && <OrbitShowcase products={displayProducts} />}
                </span>
            ))}
        </>
    );
}
