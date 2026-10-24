import BundleCard from '@/components/product/BundleCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { useBundles } from '@/hooks/useApi';

/**
 * Bundles: one large kit leads and the others sit beside it, smaller (an uneven layout, so it does not repeat the
 * row of equal cards used elsewhere). Phones swipe through the kits; the next one peeks in.
 */
export default function BundleSection() {
    const { bundles, loading } = useBundles();
    if (loading || bundles.length === 0) return null;
    const [lead, ...others] = bundles;

    return (
        <section className="section bg-canvas">
            <div className="container-page">
                <SectionHeader align="left" eyebrow="Better together" title="Rituals that work as a set" description="Curated kits, one click, one better price." />

                <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:hidden">
                    {bundles.map((bundle) => (
                        <li key={bundle.id} className="w-[84%] shrink-0 snap-start scroll-mx-4"><BundleCard bundle={bundle} /></li>
                    ))}
                </ul>

                <div className={`hidden gap-6 sm:grid ${others.length > 0 ? 'lg:grid-cols-[1.15fr_1fr]' : 'mx-auto max-w-2xl'}`}>
                    <div><BundleCard bundle={lead} variant="feature" /></div>
                    {others.length > 0 && (
                        <ul className="grid gap-6 lg:grid-rows-2">
                            {others.slice(0, 2).map((bundle) => (
                                <li key={bundle.id}><BundleCard bundle={bundle} variant="compact" /></li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
