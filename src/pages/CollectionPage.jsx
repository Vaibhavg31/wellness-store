import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Seo, { SITE_URL } from '@/components/seo/Seo';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import ProductGrid, { ProductGridSkeleton } from '@/components/shop/ProductGrid';
import { useCategories, useProducts } from '@/hooks/useApi';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { activeConcerns, productsForConcern } from '@/utils/concerns';
import { ribbonItems } from '@/utils/ribbonMenu';
import { breadcrumbJsonLd } from '@/utils/seoSchema';
import { cn } from '@/utils/formatPrice';

/** Newest first, with products flagged "new" ahead of the rest: a young brand's launches are mostly its whole range. */
function newestFirst(products) {
    return [...products].sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
}

/** /new-launches: everything new, newest first. */
export function NewLaunchesPage() {
    const { products, loading } = useProducts();
    const { content } = useSiteContent();
    const label = ribbonItems(content.extras).find((i) => i.key === 'new')?.label ?? 'New Launches';
    const items = useMemo(() => newestFirst(products), [products]);

    return (
        <>
            <Seo title={label} description="The newest Ayurvedic wellness launches from Chikit: lab-tested, clean-label and made to be part of your daily routine." path="/new-launches" />
            <PageHeader
                compact
                crumbs={[{ label: 'Home', href: '/' }, { label }]}
                eyebrow="Just arrived"
                title={label}
                description="Fresh from Chikit: every new formulation as it arrives, newest first."
            />
            <div className="container-page py-8 lg:py-12">
                <h2 className="sr-only">Products</h2>
                <p className="mb-6 text-small text-muted" aria-live="polite">{!loading && `${items.length} ${items.length === 1 ? 'product' : 'products'}`}</p>
                {loading ? <ProductGridSkeleton /> : <ProductGrid products={items} emptyMessage="New launches will appear here soon." />}
            </div>
        </>
    );
}

/** /concern/:slug: the products that help with one health goal, with the other goals one tap away. */
export default function ConcernPage() {
    const { slug = '' } = useParams();
    const { products, loading } = useProducts();
    const { categories } = useCategories();
    const { content } = useSiteContent();
    const { available: whatsappOn, getWhatsAppUrl } = useWhatsApp();
    const concerns = useMemo(() => activeConcerns(content.extras), [content.extras]);
    const concern = concerns.find((c) => c.slug === slug);
    const items = useMemo(() => productsForConcern(products, concern, categories), [products, concern, categories]);

    if (!concern) {
        return (
            <div className="container-page py-24 text-center">
                <h1>We couldn’t find that health need</h1>
                <p className="mt-3 text-muted">It may have been renamed. Pick one below, or browse everything.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {concerns.map((c) => <Link key={c.slug} to={`/concern/${c.slug}`} className="rounded-full border border-line-strong px-4 py-2 text-small font-medium text-ink hover:border-primary hover:text-primary">{c.label}</Link>)}
                </div>
                <Button to="/shop" variant="outline" className="mt-6">Browse all products</Button>
            </div>
        );
    }

    return (
        <>
            <Seo
                title={concern.label}
                description={`Shop Chikit products for ${concern.label.toLowerCase()}: lab-tested Ayurvedic formulations.`}
                path={`/concern/${concern.slug}`}
                jsonLd={breadcrumbJsonLd(SITE_URL, [{ name: 'Home', path: '/' }, { name: 'Concerns', path: '/shop' }, { name: concern.label, path: `/concern/${concern.slug}` }])}
            />
            <PageHeader
                compact
                crumbs={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: concern.label }]}
                eyebrow="Shop by health need"
                title={concern.label}
                description="Ayurvedic formulations chosen for this goal."
            />
            <div className="container-page py-8 lg:py-12">
                <nav aria-label="Other concerns" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
                    {concerns.map((c) => (
                        <Link
                            key={c.slug}
                            to={`/concern/${c.slug}`}
                            aria-current={c.slug === concern.slug ? 'page' : undefined}
                            className={cn('inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-small font-medium transition-colors', c.slug === concern.slug ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface text-ink hover:border-primary hover:text-primary')}
                        >
                            {c.label}
                        </Link>
                    ))}
                </nav>
                <h2 className="sr-only">Products</h2>
                <p className="mb-6 text-small text-muted" aria-live="polite">{!loading && `${items.length} ${items.length === 1 ? 'product' : 'products'}`}</p>
                {loading && <ProductGridSkeleton />}
                {!loading && items.length > 0 && <ProductGrid products={items} />}
                {!loading && items.length === 0 && (
                    <div className="mx-auto max-w-md rounded-xl bg-surface p-8 text-center ring-1 ring-line">
                        <h2 className="text-h3">New products are on the way</h2>
                        <p className="mt-2 text-muted">We are still adding formulations for {concern.label.toLowerCase()}. Ask us what suits you, or browse the full range.</p>
                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                            {whatsappOn && <Button href={getWhatsAppUrl(`Hi! I am looking for something for ${concern.label}.`)} target="_blank" rel="noopener noreferrer" variant="outline">Ask on WhatsApp</Button>}
                            <Button to="/shop">Browse all products</Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
