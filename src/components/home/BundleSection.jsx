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
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {bundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}
                </div>
            </div>
        </section>
    );
}
