import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { NeedTile } from '@/components/layout/Header';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { activeConcerns } from '@/utils/concerns';

/**
 * "Shop by health need": the client's round line icons, all of them visible. A phone shows two rows that swipe sideways; a
 * desktop shows every need at once. Which needs exist, their names and pictures come from Admin → Health needs.
 */
export default function NeedsRow() {
    const { content } = useSiteContent();
    const concerns = useMemo(() => activeConcerns(content.extras), [content.extras]);
    if (concerns.length === 0) return null;

    return (
        <section aria-labelledby="needs-title" className="bg-canvas py-12 lg:py-16">
            <div className="container-page">
                <div className="mb-7 flex items-end justify-between gap-4">
                    <div>
                        <p className="eyebrow">Start with your goal</p>
                        <h2 id="needs-title" className="mt-2 text-h3">Shop by health need</h2>
                    </div>
                    <Link to="/shop" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-small font-bold text-primary hover:underline">All products <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <ul className="scrollbar-none -mx-4 grid grid-flow-col grid-rows-2 auto-cols-[5.75rem] gap-x-3 gap-y-6 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:auto-cols-[6.5rem] sm:px-6 lg:mx-0 lg:grid-flow-row lg:grid-cols-9 lg:grid-rows-none lg:overflow-visible lg:px-0">
                    {concerns.map((c) => <li key={c.slug}><NeedTile concern={c} /></li>)}
                </ul>
            </div>
        </section>
    );
}
