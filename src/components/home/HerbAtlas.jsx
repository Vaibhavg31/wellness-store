import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { HERB_ATLAS } from '@/data/herbAtlas';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * "Know your herbs": an accordion of tall tinted panels. Closed, each is a slim strip with the herb's name; the open
 * one widens (on desktop) or grows downward (on phones) to show its Latin name, a line on traditional use, and the
 * real Chikit products it goes into. The first herb is open, so the section never looks empty.
 */
export default function HerbAtlas({ products = [] }) {
    const custom = useSiteContent().content.extras.herbs;
    const { eyebrow } = HERB_ATLAS;
    const title = custom?.title || HERB_ATLAS.title;
    const description = custom?.description || HERB_ATLAS.description;
    const herbs = useMemo(() => (custom?.items?.length
        ? custom.items.map((h) => ({ ...h, id: h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), productIds: h.productIds ?? [] }))
        : HERB_ATLAS.herbs), [custom]);
    const [openId, setOpenId] = useState(null);
    const activeId = herbs.some((h) => h.id === openId) ? openId : herbs[0]?.id;
    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

    return (
        <section className="section bg-canvas-alt" aria-labelledby="herb-atlas-title">
            <div className="container-page">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-12">
                    <div className="max-w-xl">
                        <p className="eyebrow mb-3">{eyebrow}</p>
                        <h2 id="herb-atlas-title">{title}</h2>
                    </div>
                    <p className="max-w-xs text-small text-muted">{description}</p>
                </div>

                <Reveal>
                    <ul className="flex flex-col gap-3 lg:h-[30rem] lg:flex-row lg:gap-4">
                        {herbs.map((herb, i) => {
                            const open = herb.id === activeId;
                            const found = herb.productIds.map((id) => byId.get(id)).filter(Boolean);
                            return (
                                <li
                                    key={herb.id}
                                    className={cn(
                                        'relative min-w-0 overflow-hidden rounded-xl ring-1 ring-line transition-[flex-grow,box-shadow] duration-500 ease-out lg:flex lg:basis-0',
                                        herb.tone,
                                        open ? 'shadow-md lg:grow-[7]' : 'lg:grow-[1]',
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(herb.id)}
                                        aria-expanded={open}
                                        aria-controls={`herb-${herb.id}`}
                                        className={cn('flex w-full items-center justify-between gap-3 px-5 py-4 text-left lg:absolute lg:inset-0 lg:z-10 lg:flex-col lg:items-center lg:justify-between lg:px-0 lg:py-6', open && 'lg:pointer-events-none')}
                                    >
                                        <span className={cn("font-display text-small text-muted transition-opacity duration-300 lg:text-body", open && "lg:opacity-0")}>{String(i + 1).padStart(2, '0')}</span>
                                        <span className={cn('font-display text-h4 text-ink transition-opacity duration-300 lg:[writing-mode:vertical-rl] lg:rotate-180 lg:text-h3', open && 'lg:opacity-0')}>{herb.name}</span>
                                        <span className={cn('grid size-8 place-items-center rounded-full bg-surface text-primary shadow-sm transition-transform duration-300', open && 'rotate-45 lg:opacity-0')}>
                                            <Plus size={16} aria-hidden="true" />
                                        </span>
                                    </button>

                                    <div
                                        id={`herb-${herb.id}`}
                                        role="region"
                                        aria-label={herb.name}
                                        className={cn(
                                            'grid transition-[grid-template-rows,opacity] duration-500 ease-out lg:min-w-[34rem] lg:flex-1 lg:grid-rows-1 lg:transition-opacity',
                                            open ? 'grid-rows-[1fr] opacity-100 lg:delay-200' : 'grid-rows-[0fr] opacity-0 lg:pointer-events-none',
                                        )}
                                        inert={!open}
                                    >
                                        <div className="min-h-0 overflow-hidden">
                                            <div className="flex h-full flex-col justify-between gap-6 p-6 pt-2 sm:p-8 lg:pt-8">
                                                <div>
                                                    <p className="font-display text-small italic text-muted">{herb.latin}</p>
                                                    <h3 className="mt-1 text-h2 max-lg:sr-only">{herb.name}</h3>
                                                    <p className="mt-1 text-small font-medium uppercase tracking-[0.18em] text-accent-ink">{herb.local}</p>
                                                    <p className="mt-4 max-w-md text-body text-ink/80">{herb.use}</p>
                                                </div>
                                                {found.length > 0 && (
                                                    <div>
                                                        <p className="mb-2 text-caption font-semibold uppercase tracking-[0.14em] text-muted">Found in</p>
                                                        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                                            {found.map((p) => (
                                                                <li key={p.id}>
                                                                    <Link to={`/product/${p.id}`} className="group flex items-center gap-3 rounded-full bg-surface py-1.5 pl-1.5 pr-4 shadow-sm ring-1 ring-line transition-shadow hover:shadow-md">
                                                                        <img src={imageUrl(p.images?.[0], 96)} alt="" width="40" height="40" loading="lazy" className="size-10 shrink-0 rounded-full bg-canvas-alt object-cover" />
                                                                        <span className="min-w-0">
                                                                            <span className="block max-w-[14rem] truncate text-small font-medium text-ink">{p.title}</span>
                                                                            <span className="block text-caption text-muted">{formatPrice(p.price)}</span>
                                                                        </span>
                                                                        <ArrowUpRight size={16} className="ml-1 shrink-0 text-primary transition-transform group-hover:rotate-45" aria-hidden="true" />
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Reveal>
            </div>
        </section>
    );
}
