import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { activeConcerns } from '@/utils/concerns';
import { WELL_SERIES, seriesOf } from '@/utils/wellRange';
import { cn } from '@/utils/formatPrice';

/**
 * "The Chikit Well range": the client's product series (HimWell, HerWell, GutWell …) with the icons from their icon sheet.
 * A series with products in the shop shows how many and opens its Concern page; the rest say "Coming soon", so the full
 * range is visible from day one without pretending anything can be bought before it is listed.
 */
export default function WellRange({ products }) {
    const { content } = useSiteContent();
    const concerns = useMemo(() => new Set(activeConcerns(content.extras).map((c) => c.slug)), [content.extras]);
    const series = useMemo(() => WELL_SERIES
        .map((s) => ({ ...s, count: products.filter((p) => seriesOf(p)?.key === s.key).length }))
        .sort((a, b) => Number(b.count > 0) - Number(a.count > 0)), [products]);

    return (
        <section aria-labelledby="well-range-title" className="section bg-canvas-alt">
            <div className="container-page">
                <div className="mb-8 max-w-2xl lg:mb-10">
                    <p className="eyebrow">The Chikit range</p>
                    <h2 id="well-range-title" className="mt-2">A series for every need</h2>
                    <p className="mt-2 text-muted">Each Well series is made for one part of everyday health. Pick the one that fits you.</p>
                </div>
                <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-5">
                    {series.map((s) => {
                        const live = s.count > 0 && concerns.has(s.concern);
                        const body = (
                            <>
                                <img src={s.icon} alt="" width="160" height="160" loading="lazy" className="size-16 shrink-0 rounded-full ring-1 ring-line transition-transform duration-300 group-hover:scale-105 sm:size-20" />
                                <span className="min-w-0">
                                    <span className="block font-display text-h4 leading-tight text-primary-deep">{s.name}</span>
                                    <span className="mt-1 block text-small text-muted">{s.tagline}</span>
                                    {s.count > 0 ? (
                                        <span className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-primary">
                                            {s.count} {s.count === 1 ? 'product' : 'products'} {live && <ArrowRight size={13} aria-hidden="true" />}
                                        </span>
                                    ) : (
                                        <span className="mt-2 inline-flex rounded-full bg-surface px-2.5 py-0.5 text-caption font-medium text-muted ring-1 ring-line">Coming soon</span>
                                    )}
                                </span>
                            </>
                        );
                        const box = 'group flex h-full items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5';
                        return (
                            <li key={s.key} className="w-[78%] shrink-0 snap-start sm:w-auto">
                                {live
                                    ? <Link to={`/concern/${s.concern}`} className={cn(box, 'transition-shadow hover:shadow-md')}>{body}</Link>
                                    : <div className={box}>{body}</div>}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
