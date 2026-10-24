import BundleCard from '@/components/product/BundleCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { useBundles } from '@/hooks/useApi';

export default function BundleSection() {
    const { bundles, loading } = useBundles();
    if (loading || bundles.length === 0) return null;

    return (
        <section className="section bg-canvas-alt">
            <div className="container-page">
                <SectionHeader eyebrow="Better together" title="Bundles & savings" description="Curated sets that work together — one click, one better price." />
                {/* Phones: swipe through the kits (next one peeks in). Larger screens: a clean grid. */}
                <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                    {bundles.map((bundle) => (
                        <li key={bundle.id} className="w-[84%] shrink-0 snap-start scroll-mx-4 sm:w-auto">
                            <BundleCard bundle={bundle} />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
