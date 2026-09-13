import { useBundles } from '@/hooks/useApi';
import SectionTitle from '@/components/ui/SectionTitle';
import BundleCard from '@/components/product/BundleCard';

/** Homepage discovery surface for bundle offers — renders nothing if the
 *  admin hasn't published any bundles yet, so it's safe to leave the
 *  section toggle on by default. */
export default function BundleShowcase() {
    const { bundles, loading } = useBundles();

    if (loading || bundles.length === 0) return null;

    return (
        <section className="py-12 sm:py-16 bg-sand/30">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <SectionTitle subtitle="Bundle & Save" title="Better Together" className="mb-8 sm:mb-10" />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {bundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}
                </div>
            </div>
        </section>
    );
}
