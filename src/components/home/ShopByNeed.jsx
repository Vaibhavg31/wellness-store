import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategories } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

/** Goal-led entry points: the admin's "concerns" when set, otherwise the store's categories. */
function useNeeds() {
    const { content } = useSiteContent();
    const { categories } = useCategories();
    const concerns = content.extras.concerns ?? [];
    if (concerns.length > 0) {
        return concerns.map((c) => ({ key: c.label, label: c.label, image: c.image, to: c.search ? `/shop?search=${encodeURIComponent(c.search)}` : '/shop' }));
    }
    return categories.map((c) => ({ key: c.slug, label: c.label, image: c.image, to: `/category/${c.slug}` }));
}

function NeedTile({ need, large }) {
    return (
        <Link to={need.to} className="group relative block size-full overflow-hidden rounded-xl bg-canvas-alt">
            {need.image && (
                <img
                    src={imageUrl(need.image, large ? 900 : 520)}
                    alt=""
                    width={large ? 900 : 520}
                    height={large ? 900 : 520}
                    loading="lazy"
                    decoding="async"
                    className={cn('absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105', !large && 'object-[50%_25%]')}
                />
            )}
            <span className={cn(
                'absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-full bg-surface/95 py-2 pl-4 pr-2 shadow-sm backdrop-blur-sm',
                large && 'sm:bottom-5 sm:left-5 sm:right-auto sm:min-w-64 sm:py-2.5 sm:pl-6',
            )}>
                <span className={cn('font-medium text-ink', large ? 'text-body sm:text-lead' : 'text-small')}>{need.label}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-white transition-transform duration-300 group-hover:rotate-45 sm:size-9">
                    <ArrowUpRight size={16} aria-hidden="true" />
                </span>
            </span>
        </Link>
    );
}

/**
 * "Shop by need": a bento grid, one big tile and smaller ones, so the page changes pace here instead of repeating
 * another row of identical cards. Ends with a quiet "all products" tile.
 */
export default function ShopByNeed() {
    const needs = useNeeds().slice(0, 4);
    if (needs.length === 0) return null;
    const [first, ...rest] = needs;

    return (
        <section className="section bg-canvas">
            <div className="container-page">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-12">
                    <div className="max-w-xl">
                        <p className="eyebrow mb-3">Shop by need</p>
                        <h2>Start with what you want to improve</h2>
                    </div>
                    <p className="max-w-xs text-small text-muted">Ayurveda works best when it is personal. Pick the goal and we will show the rituals that fit.</p>
                </div>

                <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2 lg:gap-5">
                    <Reveal as="li" className="col-span-2 aspect-[16/11] sm:aspect-[16/9] lg:row-span-2 lg:aspect-auto">
                        <NeedTile need={first} large />
                    </Reveal>
                    {rest.map((need, i) => (
                        <Reveal as="li" key={need.key} delay={(i + 1) * 80} className="aspect-square">
                            <NeedTile need={need} />
                        </Reveal>
                    ))}
                    <Reveal as="li" delay={(rest.length + 1) * 80} className="aspect-square">
                        <Link to="/shop" className="group flex size-full flex-col justify-between rounded-xl bg-primary p-5 text-white transition-colors hover:bg-primary-hover sm:p-6">
                            <span>
                                <span className="block font-display text-h3 leading-tight text-white">See everything</span>
                                <span className="mt-2 block text-small text-white/80">The full Chikit range, lab tested and clean label.</span>
                            </span>
                            <span className="flex items-center justify-between text-small font-medium">
                                Shop all products
                                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                            </span>
                        </Link>
                    </Reveal>
                </ul>
            </div>
        </section>
    );
}
