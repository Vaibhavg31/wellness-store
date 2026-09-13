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
import AntiTarnishBanner from '@/components/home/AntiTarnishBanner';
import CustomerReviews from '@/components/home/CustomerReviews';
import InstagramStrip from '@/components/home/InstagramStrip';
import InstagramGallery from '@/components/home/InstagramGallery';
import Newsletter from '@/components/home/Newsletter';
import TrendingProducts from '@/components/home/TrendingProducts';
import PromoBanners from '@/components/home/PromoBanners';
import BannerSlider from '@/components/home/BannerSlider';
import { useProducts } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { FALLBACK_PRODUCTS } from '@/data/fallbackProducts';

const JewelExplorerSection = lazy(() => import('@/components/home/JewelExplorer3D/JewelExplorerSection'));
const DayInHerSparkle = lazy(() => import('@/components/home/DayInHerSparkle'));
const RitualBuilder = lazy(() => import('@/components/home/RitualBuilder'));
const WellnessJourney = lazy(() => import('@/components/home/WellnessJourney'));
const BodyMap = lazy(() => import('@/components/home/BodyMap'));
const SourceTrail = lazy(() => import('@/components/home/SourceTrail'));
const OpeningIntro = lazy(() => import('@/components/home/OpeningIntro'));

function ProductSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="aspect-[3/4] rounded-2xl bg-warm-beige/80 mb-4" />
            <div className="h-3 w-16 bg-warm-beige/80 rounded mb-2" />
            <div className="h-4 w-full bg-warm-beige/60 rounded mb-2" />
            <div className="h-4 w-20 bg-warm-beige/60 rounded" />
        </div>
    );
}

function FeaturedSkeleton() {
    return (
        <section className="py-16 bg-ivory">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="h-8 w-48 bg-warm-beige/80 rounded animate-pulse mb-10" />
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
        openingIntro: () => (
            <Suspense key="openingIntro" fallback={<div className="h-[92vh] min-h-[560px] max-h-[920px] bg-[#0F5132] animate-pulse" aria-hidden="true" />}>
                <OpeningIntro />
            </Suspense>
        ),
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
        jewelExplorer3D: () => (
            <Suspense key="jewelExplorer3D" fallback={<div className="h-32 bg-warm-beige/20 animate-pulse" aria-hidden="true" />}>
                <JewelExplorerSection />
            </Suspense>
        ),
        dayInHerSparkle: () => (
            <Suspense key="dayInHerSparkle" fallback={<div className="h-32 bg-charcoal animate-pulse" aria-hidden="true" />}>
                <DayInHerSparkle products={displayProducts} />
            </Suspense>
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
            <Suspense key="ritualBuilder" fallback={<div className="h-[32rem] bg-ivory animate-pulse" aria-hidden="true" />}>
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
        antiTarnishBanner: () => <AntiTarnishBanner key="antiTarnishBanner" />,
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

    return (
        <>
            {Object.keys(sections)
                .filter((key) => sections[key] !== false && renderers[key])
                .map((key) => renderers[key]())}
        </>
    );
}
